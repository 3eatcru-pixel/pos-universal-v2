import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const MAX_MESH_PAYLOAD_BYTES = 256 * 1024;
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGIN }
});
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

type MeshJoinPayload = { companyId?: string; deviceId?: string };
type MeshBroadcastPayload = {
  id?: string;
  type?: string;
  companyId?: string;
  sourceDevice?: string;
  timestamp?: number;
  payload?: unknown;
};

function isValidMeshPayload(data: MeshBroadcastPayload): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.companyId || typeof data.companyId !== 'string') return false;
  if (!data.id || typeof data.id !== 'string') return false;
  if (!data.type || typeof data.type !== 'string') return false;
  if (!data.sourceDevice || typeof data.sourceDevice !== 'string') return false;
  if (typeof data.timestamp !== 'number') return false;

  const raw = JSON.stringify(data);
  if (raw.length > MAX_MESH_PAYLOAD_BYTES) return false;
  return true;
}

// Local Mesh Sync through Sockets
io.on('connection', (socket) => {
  console.log('Device connected to local mesh:', socket.id);

  socket.on('mesh:join', (data: MeshJoinPayload) => {
    if (!data?.companyId || typeof data.companyId !== 'string') return;
    const room = `company:${data.companyId}`;
    socket.data.companyId = data.companyId;
    socket.data.deviceId = data.deviceId || socket.id;
    socket.join(room);
    console.log(`Device ${data.deviceId || socket.id} joined room ${room}`);
  });

  socket.on('mesh:broadcast', (data: MeshBroadcastPayload) => {
    if (!isValidMeshPayload(data)) return;

    const claimedCompanyId = data.companyId!;
    const socketCompanyId = socket.data.companyId as string | undefined;
    if (!socketCompanyId || socketCompanyId !== claimedCompanyId) {
      console.warn(`Rejected mesh:broadcast from ${socket.id} (company mismatch)`);
      return;
    }

    const room = `company:${claimedCompanyId}`;
    socket.to(room).emit('mesh:sync', data);
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected from mesh');
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Local Mesh Sync Active via Socket.io`);
  });
}

startServer();
