import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import url from 'url';
import { AuthService } from './services/auth.service.js';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  user?: any;
  subscriptions: Set<string>; // e.g. "deploy:123", "project:456", "global"
}

export class WsManager {
  private static wss: WebSocketServer;
  private static clients: Set<ExtendedWebSocket> = new Set();

  public static init(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const parsedUrl = url.parse(request.url || '', true);
      const pathname = parsedUrl.pathname;

      if (pathname === '/ws') {
        const token = (parsedUrl.query.token as string) || '';
        const user = AuthService.verifyToken(token);

        if (!user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          const extWs = ws as ExtendedWebSocket;
          extWs.isAlive = true;
          extWs.user = user;
          extWs.subscriptions = new Set(['global']);
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
      if (ws.readyState === WebSocket.OPEN && (ws.subscriptions.has(channel) || ws.subscriptions.has('global'))) {
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
}
