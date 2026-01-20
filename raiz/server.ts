
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { BingoEvent, User, Card, WinnerRecord, ChatMessage } from './types';
import { generateFullSeriesForUser, checkWinners } from './services/bingoService';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ESTADO GLOBAL CENTRALIZADO NO SERVIDOR
let users: User[] = [];
let globalCards: Card[] = [];
let chatMessages: ChatMessage[] = [];
let onlineCount = 0;

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
  dailyStartTime: '08:00',
  dailyEndTime: '23:00',
  onlineCount: 0,
  supportWhatsapp: '',
  adConfig: {
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=320&h=100&auto=format&fit=crop',
    displayDuration: 10,
    interval: 5,
    isActive: true
  }
};

let drawInterval: any = null;

const sendSync = (socket: any) => {
  socket.emit('initialState', {
    event: globalEvent,
    cards: globalCards,
    users: users,
    messages: chatMessages
  });
};

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

  // Marcar internamente no servidor para validação de ganhadores
  globalCards.forEach(card => {
    if (card.numbers.includes(nextBall) && !card.markedNumbers.includes(nextBall)) {
      card.markedNumbers.push(nextBall);
    }
  });

  const winners = checkWinners(globalCards, globalEvent.drawnBalls, globalEvent.currentPrizeStep);
  
  if (winners.length > 0) {
    const winnerRecords: WinnerRecord[] = winners.map(w => {
      const card = globalCards.find(c => c.id === w.cardId)!;
      const winnerUser = users.find(u => u.id === card.userId);
      if (!card.wonPrizes.includes(w.prize)) card.wonPrizes.push(w.prize);

      return {
        prize: w.prize,
        cardId: w.cardId,
        userName: winnerUser ? winnerUser.name : 'Participante',
        ballCount: globalEvent.drawnBalls.length,
        timestamp: Date.now()
      };
    });

    globalEvent.winners.push(...winnerRecords);

    if (globalEvent.currentPrizeStep === 'QUADRA') globalEvent.currentPrizeStep = 'QUINA';
    else if (globalEvent.currentPrizeStep === 'QUINA') globalEvent.currentPrizeStep = 'BINGO';
    else if (globalEvent.currentPrizeStep === 'BINGO') {
      globalEvent.status = 'FINISHED';
      if (drawInterval) clearInterval(drawInterval);
      drawInterval = null;
    }
    
    io.emit('winnersAnnounced', winnerRecords);
    io.emit('cardsUpdate', globalCards);
  }

  io.emit('ballDrawn', { ball: nextBall, event: globalEvent });
};

io.on('connection', (socket) => {
  onlineCount++;
  globalEvent.onlineCount = onlineCount;
  
  // Envia estado atual ao conectar
  sendSync(socket);

  // Permite que o cliente peça sincronização se perder o estado
  socket.on('requestSync', () => sendSync(socket));

  socket.on('registerUser', (userData: any) => {
    let user = users.find(u => u.whatsapp === userData.whatsapp);
    if (!user) {
      user = {
        id: userData.whatsapp,
        name: userData.name,
        whatsapp: userData.whatsapp,
        balance: 100,
        createdAt: Date.now(),
        pixKey: userData.pixKey
      };
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

  socket.on('buySeries', ({ userId, qty }) => {
    const user = users.find(u => u.id === userId);
    const totalCost = qty * globalEvent.cardPrice;

    if (user && user.balance >= totalCost && globalEvent.status !== 'RUNNING') {
      user.balance -= totalCost;
      for (let i = 0; i < qty; i++) {
        const seriesIdx = globalCards.length / 6;
        const { cards } = generateFullSeriesForUser(userId, seriesIdx, `PAC-${Date.now()}`);
        globalCards.push(...cards);
      }
      socket.emit('balanceUpdate', user.balance);
      socket.emit('purchaseSuccess');
      io.emit('cardsUpdate', globalCards);
      io.emit('usersUpdate', users);
    } else {
      socket.emit('authError', 'Saldo insuficiente ou partida em andamento');
    }
  });

  socket.on('sendMessage', ({ userId, text }) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const msg: ChatMessage = {
        id: Math.random().toString(36),
        userId,
        userName: user.name,
        text,
        timestamp: Date.now()
      };
      chatMessages.push(msg);
      if (chatMessages.length > 50) chatMessages.shift();
      io.emit('chatUpdate', chatMessages);
    }
  });

  socket.on('adminUpdateEvent', (updatedData: Partial<BingoEvent>) => {
    globalEvent = { ...globalEvent, ...updatedData };
    io.emit('eventUpdate', globalEvent);
  });

  socket.on('adminStartGame', () => {
    if (globalCards.length > 0) {
      globalEvent.status = 'RUNNING';
      globalEvent.drawnBalls = [];
      globalEvent.winners = [];
      globalEvent.currentPrizeStep = 'QUADRA';
      globalCards.forEach(c => { c.markedNumbers = []; c.wonPrizes = []; });
      io.emit('gameStarted', globalEvent);
      io.emit('cardsUpdate', globalCards);
    }
  });

  socket.on('adminDrawBall', () => processBallDraw());

  socket.on('adminToggleAuto', (enabled: boolean) => {
    if (enabled && !drawInterval) {
      drawInterval = setInterval(processBallDraw, 4000);
    } else {
      clearInterval(drawInterval);
      drawInterval = null;
    }
    io.emit('autoStatusUpdate', !!drawInterval);
  });

  socket.on('adminReset', () => {
    clearInterval(drawInterval);
    drawInterval = null;
    globalEvent.status = 'SETUP';
    globalEvent.drawnBalls = [];
    globalEvent.winners = [];
    globalEvent.currentPrizeStep = 'QUADRA';
    globalCards = [];
    chatMessages = [];
    io.emit('gameReset', globalEvent);
    io.emit('initialState', { event: globalEvent, cards: [], users: users, messages: [] });
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    globalEvent.onlineCount = onlineCount;
    io.emit('onlineCountUpdate', onlineCount);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`SERVIDOR BINGO ATIVO: Porta ${PORT}`));
