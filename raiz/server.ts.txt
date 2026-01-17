
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

/**
 * ESTADO GLOBAL PERSISTENTE EM MEMÓRIA
 */
let globalUsers: Record<string, User> = {};
let globalCards: Card[] = [];
let onlineCount = 0;

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

let drawInterval: ReturnType<typeof setInterval> | null = null;

/**
 * LÓGICA DE SORTEIO ÚNICA E CENTRALIZADA
 */
const processDraw = () => {
  if (globalEvent.status !== 'RUNNING' || globalEvent.drawnBalls.length >= 90) {
    if (drawInterval) {
      clearInterval(drawInterval);
      drawInterval = null;
    }
    return;
  }

  const available = Array.from({ length: 90 }, (_, i) => i + 1)
    .filter(n => !globalEvent.drawnBalls.includes(n));
    
  if (available.length === 0) return;

  const nextBall = available[Math.floor(Math.random() * available.length)];
  globalEvent.drawnBalls.push(nextBall);

  // Atualiza marcação em todas as cartelas globais no servidor
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
      const user = globalUsers[card.userId];
      return {
        prize: w.prize,
        cardId: w.cardId,
        userName: user ? user.name : 'Participante',
        ballCount: globalEvent.drawnBalls.length,
        timestamp: Date.now()
      };
    });

    globalEvent.winners.push(...winnerRecords);

    // Evolução automática de prêmio
    if (globalEvent.currentPrizeStep === 'QUADRA') {
      globalEvent.currentPrizeStep = 'QUINA';
    } else if (globalEvent.currentPrizeStep === 'QUINA') {
      globalEvent.currentPrizeStep = 'BINGO';
    } else if (globalEvent.currentPrizeStep === 'BINGO') {
      globalEvent.status = 'FINISHED';
      if (drawInterval) {
        clearInterval(drawInterval);
        drawInterval = null;
      }
    }
    
    io.emit('winnersAnnounced', winnerRecords);
  }

  io.emit('ballDrawn', { ball: nextBall, event: globalEvent });
};

io.on('connection', (socket) => {
  onlineCount++;
  globalEvent.onlineCount = onlineCount;
  io.emit('onlineCountUpdate', onlineCount);

  // Sincronização inicial
  socket.emit('initialState', { 
    event: globalEvent, 
    cards: globalCards,
    users: Object.values(globalUsers) 
  });

  // CADASTRO DE USUÁRIOS
  socket.on('registerUser', (userData: { name: string, whatsapp: string, password?: string, pixKey?: string }) => {
    const userId = userData.whatsapp;
    if (!globalUsers[userId]) {
      globalUsers[userId] = {
        id: userId,
        name: userData.name,
        whatsapp: userData.whatsapp,
        password: userData.password,
        pixKey: userData.pixKey,
        balance: 200,
        createdAt: Date.now()
      };
    }
    socket.emit('registrationSuccess', globalUsers[userId]);
    io.emit('usersUpdate', Object.values(globalUsers));
  });

  socket.on('loginUser', (credentials: { whatsapp: string, password?: string }) => {
    const user = globalUsers[credentials.whatsapp];
    if (user && user.password === credentials.password) {
      socket.emit('loginSuccess', user);
    } else {
      socket.emit('authError', 'Usuário ou senha inválidos.');
    }
  });

  // COMPRA DE SÉRIES
  socket.on('buySeries', (data: { userId: string, qty: number }) => {
    const user = globalUsers[data.userId];
    const cost = data.qty * globalEvent.cardPrice;
    if (user && user.balance >= cost) {
      user.balance -= cost;
      for (let i = 0; i < data.qty; i++) {
        const seriesIdx = Math.floor(Math.random() * 1000000);
        const { cards } = generateFullSeriesForUser(user.id, seriesIdx, 'PAC00001A');
        globalCards.push(...cards);
      }
      socket.emit('balanceUpdate', user.balance);
      io.emit('cardsUpdate', globalCards);
      socket.emit('purchaseSuccess');
    }
  });

  // COMANDOS ADMINISTRATIVOS
  socket.on('adminStartGame', () => {
    if (globalEvent.status === 'SETUP' && globalCards.length > 0) {
      globalEvent.status = 'RUNNING';
      globalEvent.drawnBalls = [];
      globalEvent.winners = [];
      globalEvent.currentPrizeStep = 'QUADRA';
      io.emit('gameStarted', globalEvent);
    }
  });

  socket.on('adminDrawBall', () => {
    processDraw();
  });

  socket.on('adminToggleAuto', (enabled: boolean) => {
    if (enabled) {
      if (!drawInterval) drawInterval = setInterval(processDraw, 4000);
    } else {
      if (drawInterval) {
        clearInterval(drawInterval);
        drawInterval = null;
      }
    }
    io.emit('autoStatusUpdate', !!drawInterval);
  });

  socket.on('adminReset', () => {
    if (drawInterval) {
      clearInterval(drawInterval);
      drawInterval = null;
    }
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

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`BINGO SERVER: Operando em http://localhost:${PORT}`);
});
