
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { BingoEvent, User, Card, WinnerRecord, ChatMessage } from './types';
import { generateFullSeriesForUser, checkWinners } from './services/bingoService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: { origin: "*" }
});

let users: User[] = [];
let globalCards: Card[] = [];
let chatMessages: ChatMessage[] = [];
let onlineCount = 0;
let autoDrawInterval: any = null;

let globalEvent: BingoEvent = {
  id: 'GLOBAL_BINGO_SESSION',
  name: 'Bingo Master Beneficente',
  cardPrice: 10,
  maxCards: 1000,
  drawnBalls: [],
  status: 'SETUP',
  currentPrizeStep: 'QUADRA',
  winners: [],
  startMode: 'MANUAL',
  autoInterval: 5,
  onlineCount: 0,
  dailyStartTime: '',
  dailyEndTime: '',
  logoUrl: '',
  loginBackgroundUrl: '',
  faviconUrl: '',
  adConfig: { imageUrl: '', displayDuration: 10, interval: 5, isActive: true }
};

const drawBall = () => {
  if (globalEvent.status !== 'RUNNING' || globalEvent.drawnBalls.length >= 90) {
    if (autoDrawInterval) {
      clearInterval(autoDrawInterval);
      autoDrawInterval = null;
      io.emit('adminAutoStatus', false);
    }
    return;
  }

  let ball: number;
  do {
    ball = Math.floor(Math.random() * 90) + 1;
  } while (globalEvent.drawnBalls.includes(ball));

  globalEvent.drawnBalls.push(ball);
  
  const newWinners = checkWinners(globalCards, globalEvent.drawnBalls, globalEvent.currentPrizeStep);
  if (newWinners.length > 0) {
    newWinners.forEach(w => {
      if (!globalEvent.winners.find(exist => exist.cardId === w.cardId && exist.prize === w.prize)) {
        const user = users.find(u => u.id === w.userId);
        globalEvent.winners.push({
          prize: w.prize,
          cardId: w.cardId,
          userName: user?.name || 'Jogador',
          ballCount: globalEvent.drawnBalls.length,
          timestamp: Date.now()
        });
      }
    });
  }
  io.emit('eventUpdate', globalEvent);
};

// Monitor de Agendamento
const checkSchedule = () => {
  if (!globalEvent.dailyStartTime || !globalEvent.dailyEndTime) return;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Início Agendado
  if (currentTime === globalEvent.dailyStartTime && globalEvent.status === 'SETUP') {
    globalEvent.status = 'RUNNING';
    globalEvent.drawnBalls = [];
    globalEvent.winners = [];
    globalEvent.currentPrizeStep = 'QUADRA';
    io.emit('eventUpdate', globalEvent);
  }
  
  // Fim Agendado
  if (currentTime === globalEvent.dailyEndTime && globalEvent.status === 'RUNNING') {
    if (autoDrawInterval) {
      clearInterval(autoDrawInterval);
      autoDrawInterval = null;
      io.emit('adminAutoStatus', false);
    }
    globalEvent.status = 'FINISHED';
    io.emit('eventUpdate', globalEvent);
  }
};

// Verifica a cada 30 segundos para precisão no minuto
setInterval(checkSchedule, 30000);

io.on('connection', (socket) => {
  onlineCount++;
  globalEvent.onlineCount = onlineCount;

  socket.on('requestSync', () => {
    socket.emit('initialState', { 
      event: globalEvent, 
      cards: globalCards, 
      users, 
      messages: chatMessages,
      isAutoDrawing: !!autoDrawInterval
    });
  });

  socket.on('registerUser', (userData: any) => {
    let user = users.find(u => u.whatsapp === userData.whatsapp);
    if (!user) {
      user = { id: userData.whatsapp, name: userData.name, whatsapp: userData.whatsapp, balance: 0, createdAt: Date.now() };
      users.push(user);
    }
    socket.emit('registrationSuccess', user);
    io.emit('usersUpdate', users);
  });

  socket.on('loginUser', (credentials: any) => {
    const user = users.find(u => u.whatsapp === credentials.whatsapp);
    if (user) socket.emit('loginSuccess', user);
    else socket.emit('authError', 'Usuário não encontrado');
  });

  socket.on('addBalance', ({ userId, amount }) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      user.balance += amount;
      socket.emit('balanceUpdate', user.balance);
      io.emit('usersUpdate', users);
    }
  });

  socket.on('buySeries', ({ userId, qty }) => {
    const user = users.find(u => u.id === userId);
    const totalCost = qty * globalEvent.cardPrice;
    if (user && user.balance >= totalCost) {
      user.balance -= totalCost;
      for (let i = 0; i < qty; i++) {
        const { cards } = generateFullSeriesForUser(userId, globalCards.length / 6, `PAC-${Date.now()}`);
        globalCards.push(...cards);
      }
      socket.emit('balanceUpdate', user.balance);
      io.emit('cardsUpdate', globalCards);
    }
  });

  // ADMIN ACTIONS
  socket.on('adminUpdateEvent', (data) => {
    globalEvent = { ...globalEvent, ...data };
    io.emit('eventUpdate', globalEvent);
  });

  socket.on('adminStartGame', () => {
    globalEvent.status = 'RUNNING';
    globalEvent.drawnBalls = [];
    globalEvent.winners = [];
    globalEvent.currentPrizeStep = 'QUADRA';
    io.emit('eventUpdate', globalEvent);
  });

  socket.on('adminDrawBall', () => drawBall());

  socket.on('adminToggleAuto', (enabled) => {
    if (enabled) {
      if (autoDrawInterval) clearInterval(autoDrawInterval);
      autoDrawInterval = setInterval(drawBall, globalEvent.autoInterval * 1000);
    } else {
      if (autoDrawInterval) clearInterval(autoDrawInterval);
      autoDrawInterval = null;
    }
    io.emit('adminAutoStatus', !!autoDrawInterval);
  });

  socket.on('adminReset', () => {
    if (autoDrawInterval) clearInterval(autoDrawInterval);
    autoDrawInterval = null;
    globalEvent.status = 'SETUP';
    globalEvent.drawnBalls = [];
    globalEvent.winners = [];
    globalCards = [];
    io.emit('eventUpdate', globalEvent);
    io.emit('cardsUpdate', globalCards);
    io.emit('adminAutoStatus', false);
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    globalEvent.onlineCount = onlineCount;
  });
});

httpServer.listen(3000);
