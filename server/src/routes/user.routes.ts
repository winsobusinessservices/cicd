import { Router, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { AuditService } from '../services/audit.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireMainAdmin } from '../middleware/role.middleware.js';

export const userRouter = Router();

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

// All user management routes require Main Admin authentication
userRouter.use(requireAuth);
userRouter.use(requireMainAdmin);

// 1. Get pending user approval requests
userRouter.get('/pending', (req: AuthenticatedRequest, res: Response) => {
  const pending = UserService.getPendingUsers();
  res.json(pending);
});

// 2. Get all users
userRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const users = UserService.getAllUsers();
  res.json(users);
});

// 3. Approve a pending user
userRouter.post('/:id/approve', (req: AuthenticatedRequest, res: Response): void => {
  const userId = parseInt(req.params.id, 10);
  const role = req.body.role === 'MAIN_ADMIN' ? 'MAIN_ADMIN' : 'SUB_ADMIN';
  const ip = getClientIp(req);

  const approved = UserService.approveUser(userId, req.user!.username, role);
  if (!approved) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    username: req.user!.username,
    userRole: req.user!.role,
    ipAddress: ip,
    action: 'USER_APPROVED',
    target: `User: "${approved.username}" (#${approved.id})`,
    details: `Main Admin approved user with role ${role}.`,
  });

  res.json({ message: `User "${approved.username}" approved successfully.`, user: approved });
});

// 4. Reject / Delete a pending user
userRouter.post('/:id/reject', (req: AuthenticatedRequest, res: Response): void => {
  const userId = parseInt(req.params.id, 10);
  const ip = getClientIp(req);

  const success = UserService.rejectUser(userId);
  if (!success) {
    res.status(404).json({ error: 'Pending user not found.' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    username: req.user!.username,
    userRole: req.user!.role,
    ipAddress: ip,
    action: 'USER_REJECTED',
    target: `User ID #${userId}`,
    details: `Main Admin rejected and deleted pending user registration.`,
  });

  res.json({ message: 'User registration request rejected.' });
});

// 5. Change user role
userRouter.post('/:id/role', (req: AuthenticatedRequest, res: Response): void => {
  const userId = parseInt(req.params.id, 10);
  const role = req.body.role;
  const ip = getClientIp(req);

  if (role !== 'MAIN_ADMIN' && role !== 'SUB_ADMIN') {
    res.status(400).json({ error: 'Role must be either MAIN_ADMIN or SUB_ADMIN.' });
    return;
  }

  if (userId === req.user!.id && role !== 'MAIN_ADMIN') {
    res.status(400).json({ error: 'You cannot demote yourself from Main Admin.' });
    return;
  }

  const updated = UserService.updateUserRole(userId, role);
  if (!updated) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    username: req.user!.username,
    userRole: req.user!.role,
    ipAddress: ip,
    action: 'USER_ROLE_CHANGED',
    target: `User: "${updated.username}" (#${updated.id})`,
    details: `Role updated to ${role} by Main Admin.`,
  });

  res.json({ message: `User role updated to ${role}.`, user: updated });
});

// 6. Direct user creation (Main Admin adding a Sub Admin or another Main Admin directly)
userRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  const { username, name, email, password, role } = req.body;
  const ip = getClientIp(req);

  if (!username || !name || !email || !password) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  const userRole = role === 'MAIN_ADMIN' ? 'MAIN_ADMIN' : 'SUB_ADMIN';

  try {
    const newUser = UserService.createApprovedUser({
      username,
      name,
      email,
      password,
      role: userRole,
      createdBy: req.user!.username,
    });

    AuditService.log({
      userId: req.user!.id,
      username: req.user!.username,
      userRole: req.user!.role,
      ipAddress: ip,
      action: 'USER_CREATED_BY_ADMIN',
      target: `User: "${newUser.username}" (#${newUser.id})`,
      details: `Main Admin directly created approved user with role ${userRole}.`,
    });

    res.status(201).json({ message: 'User created successfully.', user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create user: ${err.message}` });
  }
});

// 7. Delete an active user
userRouter.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
  const userId = parseInt(req.params.id, 10);
  const ip = getClientIp(req);

  if (userId === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own account.' });
    return;
  }

  const success = UserService.deleteUser(userId);
  if (!success) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  AuditService.log({
    userId: req.user!.id,
    username: req.user!.username,
    userRole: req.user!.role,
    ipAddress: ip,
    action: 'USER_DELETED',
    target: `User ID #${userId}`,
    details: `User was deleted by Main Admin.`,
  });

  res.json({ message: 'User deleted successfully.' });
});
