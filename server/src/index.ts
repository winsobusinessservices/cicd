import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { PORT, ROOT_DIR } from './config.js';
import { initDatabase } from './db/index.js';
import { WsManager } from './websocket.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { deployRouter } from './routes/deploy.routes.js';
import { auditRouter } from './routes/audit.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize SQLite Database & initial seeds
initDatabase();

// 2. Create Express application
const app = express();
app.use(cors());
app.use(express.json());

// Request logging for audit debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api') && !req.originalUrl.includes('/logs')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 3. Register API endpoints
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/projects', projectRouter);
app.use('/api/deploy', deployRouter);
app.use('/api/audit', auditRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Varex Self-Deploying CI/CD Platform',
    timestamp: new Date().toISOString(),
  });
});

// 4. Serve compiled static frontend (if built in public folder)
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (!req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/ws')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

// 5. Create HTTP & WebSocket server
const server = http.createServer(app);
WsManager.init(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n============================================================`);
  console.log(`🚀 Varex CI/CD Platform is running on http://0.0.0.0:${PORT}`);
  console.log(`🔒 Security: Strict Password & Approval Gate Active`);
  console.log(`📝 Audit Logs: Dual-write file and database active`);
  console.log(`============================================================\n`);
});
