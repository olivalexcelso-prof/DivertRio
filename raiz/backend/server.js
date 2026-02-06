
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const gameService = require('./services/gameService');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuração inicial (pode vir de um DB futuramente)
const initialConfig = {
  seriesPrice: 10.0,
  // ... outras configs
};

gameService.init(io, initialConfig);

// Endpoints API
app.post('/api/game/start', (req, res) => {
  gameService.startMatch();
  res.json({ success: true });
});

app.post('/api/game/end', (req, res) => {
  gameService.endMatch();
  res.json({ success: true });
});

app.post('/api/game/buy-series', (req, res) => {
  const { userId, isFake } = req.body;
  const series = gameService.buySeries(userId, isFake);
  res.json(series);
});

app.get('/api/game/state', (req, res) => {
  res.json(gameService.getState());
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('game_state_update', gameService.getState());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Bingo Server running on port ${PORT}`);
});
