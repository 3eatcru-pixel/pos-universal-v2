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
const io = new Server(httpServer, {
  cors: { origin: "*" }
});
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Local Mesh Sync through Sockets
io.on('connection', (socket) => {
  console.log('Device connected to local mesh:', socket.id);

  socket.on('mesh:broadcast', (data) => {
    // Relay state to all other nodes on same enterprise/shop
    socket.broadcast.emit('mesh:sync', data);
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
