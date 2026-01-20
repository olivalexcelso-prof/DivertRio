
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { BingoEvent, User, Card, WinnerRecord } from './types';
import { generateFullSeriesForUser, checkWinners } from './services/bingoService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// ESTADO GLOBAL CENTRALIZADO
const users: User[] = [];
let globalCards: Card[] = [];
let onlineCount = 0;
let drawExecuted = false; // Flag para sorteio único de vencedor

let globalEvent: BingoEvent = {
  id: 'GLOBAL_BINGO_SESSION',
  name: 'Grande Bingo Beneficente',
  cardPrice: 10,
  maxCards: 1000,
  drawnBalls: [],
  status: 'SETUP',
  currentPrizeStep: 'QUADRA',
  winners: [],
  startMode: 'MANUAL',
  autoInterval: 5,
  onlineCount: 0
};

let drawInterval: any = null;

const processBallDraw = () => {
  if (globalEvent.status !== 'RUNNING' || globalEvent.drawnBalls.length >= 90) {
    if (drawInterval) clearInterval(drawInterval);
    drawInterval = null;
    return;
  }

  const available = Array.from({ length: 90 }, (_, i) => i + 1)
    .filter(n => !globalEvent.drawnBalls.includes(n));
    
  if (available.length === 0) return;

  const nextBall = available[Math.floor(Math.random() * available.length)];
  globalEvent.drawnBalls.push(nextBall);

  // Atualiza marcação em todas as cartelas globais
  globalCards.forEach(card => {
    if (card.numbers.includes(nextBall)) {
      if (!card.markedNumbers.includes(nextBall)) {
        card.markedNumbers.push(nextBall);
      }
    }
  });

  const winners = checkWinners(globalCards, globalEvent.drawnBalls, globalEvent.currentPrizeStep);
  
  if (winners.length > 0) {
    const winnerRecords: WinnerRecord[] = winners.map(w => {
      const card = globalCards.find(c => c.id === w.cardId)!;
      const winnerUser = users.find(u => u.id === card.userId);
      return {
        prize: w.prize,
        cardId: w.cardId,
        userName: winnerUser ? winnerUser.name : 'Participante',
        ballCount: globalEvent.drawnBalls.length,
        timestamp: Date.now()
      };
    });

    globalEvent.winners.push(...winnerRecords);

    // Lógica de progressão de prêmios
    if (globalEvent.currentPrizeStep === 'QUADRA') {
      globalEvent.currentPrizeStep = 'QUINA';
    } else if (globalEvent.currentPrizeStep === 'QUINA') {
      globalEvent.currentPrizeStep = 'BINGO';
    } else if (globalEvent.currentPrizeStep === 'BINGO') {
      globalEvent.status = 'FINISHED';
      if (drawInterval) clearInterval(drawInterval);
      drawInterval = null;
    }
    
    io.emit('winnersAnnounced', winnerRecords);
  }

  io.emit('ballDrawn', { ball: nextBall, event: globalEvent });
};

io.on('connection', (socket) => {
  onlineCount++;
  globalEvent.onlineCount = onlineCount;
  io.emit('onlineCountUpdate', onlineCount);

  // Envia estado inicial ao conectar
  socket.emit('initialState', { 
    event: globalEvent, 
    cards: globalCards,
    users: users,
    messages: [] 
  });

  // TAREFA 1.3: registerUser
  socket.on('registerUser', (userData: any) => {
    const exists = users.find(u => u.whatsapp === userData.whatsapp);
    if (!exists) {
      const newUser: User = {
        id: userData.whatsapp,
        name: userData.name,
        whatsapp: userData.whatsapp,
        balance: 100, // Saldo inicial de teste
        createdAt: Date.now()
      };
      users.push(newUser);
    }
    socket.emit('registrationSuccess', users.find(u => u.whatsapp === userData.whatsapp));
    io.emit('usersUpdate', users);
  });

  // TAREFA 1.3: requestDraw (Sorteio Único de Vencedor)
  socket.on('requestDraw', () => {
    if (!drawExecuted && users.length > 0) {
      const winner = users[Math.floor(Math.random() * users.length)];
      drawExecuted = true;
      io.emit('drawResult', winner);
    }
  });

  // Eventos Administrativos de Bingo
  socket.on('adminStartGame', () => {
    if (globalCards.length > 0) {
      globalEvent.status = 'RUNNING';
      globalEvent.drawnBalls = [];
      globalEvent.winners = [];
      globalEvent.currentPrizeStep = 'QUADRA';
      drawExecuted = false; 
      io.emit('gameStarted', globalEvent);
    }
  });

  socket.on('adminDrawBall', () => {
    processBallDraw();
  });

  socket.on('adminToggleAuto', (enabled: boolean) => {
    if (enabled) {
      if (!drawInterval) drawInterval = setInterval(processBallDraw, 4000);
    } else {
      if (drawInterval) clearInterval(drawInterval);
      drawInterval = null;
    }
    io.emit('autoStatusUpdate', !!drawInterval);
  });

  socket.on('adminReset', () => {
    if (drawInterval) clearInterval(drawInterval);
    drawInterval = null;
    drawExecuted = false;
    globalEvent = { 
      ...globalEvent, 
      status: 'SETUP', 
      drawnBalls: [], 
      winners: [], 
      currentPrizeStep: 'QUADRA' 
    };
    globalCards = [];
    io.emit('gameReset', globalEvent);
    io.emit('cardsUpdate', globalCards);
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    globalEvent.onlineCount = onlineCount;
    io.emit('onlineCountUpdate', onlineCount);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`BINGO MASTER SERVER: Online na porta ${PORT}`);
});
