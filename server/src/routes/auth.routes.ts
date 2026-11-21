import { Router, Request, Response } from 'express';
import { AuthService, toUserSummary } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';
import { AuditService } from '../services/audit.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const authRouter = Router();

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

authRouter.post('/register', (req: Request, res: Response): void => {
  const { username, name, email, password } = req.body;
  const ip = getClientIp(req);

  if (!username || !name || !email || !password) {
    res.status(400).json({ error: 'All fields (username, name, email, password) are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const existing = AuthService.findByUsernameOrEmail(username) || AuthService.findByUsernameOrEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Username or email is already registered.' });
    return;
  }

  try {
    const user = UserService.registerUser({ username, name, email, password });

    AuditService.log({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ipAddress: ip,
      action: 'USER_REGISTERED',
      target: `User: ${user.username}`,
      details: `New user registration submitted. Awaiting Main Admin approval.`,
    });

    res.status(201).json({
      message: 'Registration successful! Your account is pending Main Admin approval. You will be able to log in once approved.',
      user
    });
  } catch (err: any) {
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

authRouter.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;
  const ip = getClientIp(req);

  if (!username || !password) {
    res.status(400).json({ error: 'Username/email and password are required.' });
    return;
  }

  const userRow = AuthService.findByUsernameOrEmail(username);
  if (!userRow) {
    AuditService.log({
      username,
      userRole: 'ANONYMOUS',
      ipAddress: ip,
      action: 'LOGIN_FAILED',
      target: `User: ${username}`,
      details: 'Account does not exist.',
    });
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const isPasswordValid = AuthService.comparePassword(password, userRow.password_hash);
  if (!isPasswordValid) {
    AuditService.log({
      userId: userRow.id,
      username: userRow.username,
      userRole: userRow.role,
      ipAddress: ip,
      action: 'LOGIN_FAILED',
      target: `User: ${userRow.username}`,
      details: 'Invalid password entered.',
    });
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  // Check if approved
  if (userRow.is_approved !== 1) {
    AuditService.log({
      userId: userRow.id,
      username: userRow.username,
      userRole: userRow.role,
      ipAddress: ip,
      action: 'LOGIN_ATTEMPT_PENDING_APPROVAL',
      target: `User: ${userRow.username}`,
      details: 'User tried to log in but account is not approved by Main Admin.',
    });
    res.status(403).json({
      error: 'Your account is currently pending Main Admin approval. Please wait for an administrator to approve your request.'
    });
    return;
  }

  const summary = toUserSummary(userRow);
  const token = AuthService.generateToken(summary);

  AuditService.log({
    userId: userRow.id,
    username: userRow.username,
    userRole: userRow.role,
    ipAddress: ip,
    action: 'LOGIN_SUCCESS',
    target: `User: ${userRow.username}`,
    details: 'User authenticated successfully.',
  });

  res.json({
    token,
    user: summary,
  });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const ip = getClientIp(req);
  if (req.user) {
    AuditService.log({
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      ipAddress: ip,
      action: 'USER_LOGOUT',
      target: `User: ${req.user.username}`,
      details: 'User signed out.',
    });
  }
  res.json({ message: 'Signed out successfully.' });
});
