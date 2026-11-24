import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { AuthService } from './services/auth.service.js';
import { db } from './db/index.js';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  user?: any;
  subscriptions: Set<string>; // e.g. "deploy:123", "project:456"
}

export class WsManager {
  private static wss: WebSocketServer;
  private static clients: Set<ExtendedWebSocket> = new Set();

  public static init(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      } catch {
        socket.destroy();
        return;
      }

      const pathname = parsedUrl.pathname;

      if (pathname === '/ws') {
        const token = parsedUrl.searchParams.get('token') || '';
        const payload = AuthService.verifyToken(token);

        if (!payload || !payload.id) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Verify user account exists and remains approved in database
        const user = db.prepare('SELECT id, username, role, is_approved FROM users WHERE id = ?').get(payload.id) as any;
        if (!user || user.is_approved !== 1) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const extWs = ws as ExtendedWebSocket;
          extWs.isAlive = true;
          extWs.user = user;
          extWs.subscriptions = new Set(); // Channel isolation: only send explicitly subscribed channels
          this.wss.emit('connection', extWs, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: ExtendedWebSocket) => {
      this.clients.add(ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data: string) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.action === 'subscribe' && msg.channel) {
            ws.subscriptions.add(msg.channel);
          } else if (msg.action === 'unsubscribe' && msg.channel) {
            ws.subscriptions.delete(msg.channel);
          }
        } catch {
          // ignore non-json messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });

    // Heartbeat to keep connections alive
    setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  public static broadcastToChannel(channel: string, payload: any) {
    const raw = JSON.stringify({ channel, ...payload });
    this.clients.forEach((ws) => {
      // Only broadcast to clients explicitly subscribed to this channel
      if (ws.readyState === WebSocket.OPEN && ws.subscriptions.has(channel)) {
        ws.send(raw);
      }
    });
  }

  public static broadcastDeployLog(deploymentId: number, data: {
    stream: 'stdout' | 'stderr' | 'system';
    text: string;
    stepIndex?: number;
    stepName?: string;
  }) {
    this.broadcastToChannel(`deploy:${deploymentId}`, {
      type: 'LOG_CHUNK',
      deploymentId,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  public static broadcastDeployStatus(deploymentId: number, status: string, extra: Record<string, any> = {}) {
    this.broadcastToChannel(`deploy:${deploymentId}`, {
      type: 'DEPLOY_STATUS',
      deploymentId,
      status,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }

  public static broadcastServiceLog(serviceId: number, data: {
    stream: 'stdout' | 'stderr' | 'system';
    text: string;
  }) {
    this.broadcastToChannel(`service_log:${serviceId}`, {
      type: 'LOG_CHUNK',
      serviceId,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  public static broadcastServiceStatus(serviceId: number, status: string, extra: Record<string, any> = {}) {
    this.broadcastToChannel(`service_log:${serviceId}`, {
      type: 'STREAM_STATUS',
      serviceId,
      status,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }
}
