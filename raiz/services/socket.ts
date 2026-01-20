
import { BingoEvent, User, Card, WinnerRecord, PrizeType, ChatMessage, AdConfig } from '../types';
import { generateFullSeriesForUser, checkWinners, checkNearWin } from './bingoService';

class BingoServerSimulator {
  private users: Record<string, User> = {};
  private cards: Card[] = [];
  private messages: ChatMessage[] = [];
  private dailyDeposits: { amount: number; timestamp: number }[] = [];
  private notifiedNearWins: Set<string> = new Set();
  private event: BingoEvent = {
    id: 'GLOBAL_BINGO_SESSION',
    name: 'Grande Bingo Beneficente',
    cardPrice: 10,
    maxCards: 1000,
    drawnBalls: [],
    status: 'SETUP',
    currentPrizeStep: 'QUADRA',
    winners: [],
    startMode: 'AUTO',
    autoInterval: 5,
    dailyStartTime: "08:00",
    dailyEndTime: "23:00",
    onlineCount: 1,
    supportWhatsapp: '',
    lastReportSentDate: '',
    adConfig: {
      imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=320&h=100&auto=format&fit=crop',
      displayDuration: 10,
      interval: 5,
      isActive: false
    }
  };
  private fixedRevenue: number = 0;
  private drawInterval: any = null;
  private scheduleCheckInterval: any = null;

  constructor() {
    const savedUsers = localStorage.getItem('bingo_mock_db_users');
    const savedCards = localStorage.getItem('bingo_mock_db_cards');
    const savedEvent = localStorage.getItem('bingo_mock_db_event');
    const savedDeposits = localStorage.getItem('bingo_mock_db_deposits');
    
    if (savedUsers) this.users = JSON.parse(savedUsers);
    if (savedCards) this.cards = JSON.parse(savedCards);
    if (savedDeposits) this.dailyDeposits = JSON.parse(savedDeposits);
    if (savedEvent) {
      const parsed = JSON.parse(savedEvent);
      this.event = { ...this.event, ...parsed, drawnBalls: [], winners: [], status: 'SETUP' };
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (this.event.lastReportSentDate && this.event.lastReportSentDate !== today) {
      this.dailyDeposits = [];
      this.persist();
    }

    setInterval(() => {
      const variation = Math.floor(Math.random() * 3) - 1;
      this.event.onlineCount = Math.max(1, (this.event.onlineCount || 1) + variation);
      this.broadcast('onlineCountUpdate', this.event.onlineCount);
    }, 10000);

    this.scheduleCheckInterval = setInterval(() => this.checkSchedule(), 30000);
  }

  private persist() {
    localStorage.setItem('bingo_mock_db_users', JSON.stringify(this.users));
    localStorage.setItem('bingo_mock_db_cards', JSON.stringify(this.cards));
    localStorage.setItem('bingo_mock_db_event', JSON.stringify(this.event));
    localStorage.setItem('bingo_mock_db_deposits', JSON.stringify(this.dailyDeposits));
  }

  private checkSchedule() {
    if (this.event.startMode !== 'AUTO' || this.event.status === 'RUNNING') return;
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const startTime = this.event.dailyStartTime || "00:00";
    const endTime = this.event.dailyEndTime || "23:59";
    if (currentTimeStr >= startTime && currentTimeStr < endTime) {
      const lastEnd = this.event.lastGameEndTime || 0;
      const intervalMs = this.event.autoInterval * 60 * 1000;
      if (Date.now() > lastEnd + intervalMs) {
        const remainingMs = this.getTimeDiffInMs(currentTimeStr, endTime);
        const estimatedGameDuration = 10 * 60 * 1000;
        const totalCycle = estimatedGameDuration + intervalMs;
        const gamesLeft = Math.ceil(remainingMs / totalCycle);
        this.handleStart(gamesLeft);
      }
    }
  }

  private getTimeDiffInMs(start: string, end: string): number {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const d1 = new Date(); d1.setHours(h1, m1, 0, 0);
    const d2 = new Date(); d2.setHours(h2, m2, 0, 0);
    return d2.getTime() - d1.getTime();
  }

  processLocalEmit(eventName: string, data: any) {
    if (eventName === 'registerUser') this.handleRegister(data);
    if (eventName === 'loginUser') this.handleLogin(data);
    if (eventName === 'buySeries') this.handleBuy(data);
    if (eventName === 'addBalance') this.handleAddBalance(data);
    if (eventName === 'adminStartGame') this.handleStart();
    if (eventName === 'adminDrawBall') this.handleDraw();
    if (eventName === 'adminToggleAuto') this.handleToggleAuto(data);
    if (eventName === 'adminReset') this.handleReset();
    if (eventName === 'adminUpdateEvent') this.handleUpdateEvent(data);
    if (eventName === 'sendMessage') this.handleSendMessage(data);
  }

  private broadcast(eventName: string, data: any) {
    const event = new CustomEvent('socket_msg', { detail: { event: eventName, data } });
    window.dispatchEvent(event);
  }

  private handleSendMessage(data: { userId: string, text: string }) {
    const user = this.users[data.userId];
    if (!user) return;
    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      userId: user.id,
      userName: user.name,
      text: data.text,
      timestamp: Date.now()
    };
    this.messages.push(msg);
    if (this.messages.length > 50) this.messages.shift();
    this.broadcast('chatUpdate', this.messages);
  }

  private handleUpdateEvent(newEvent: BingoEvent) {
    this.event = { ...this.event, ...newEvent };
    this.persist();
    this.broadcast('initialState', this.getInitialState());
  }

  private handleRegister(data: any) {
    const user: User = { 
      id: data.whatsapp, 
      name: data.name, 
      whatsapp: data.whatsapp, 
      password: data.password, 
      pixKey: data.pixKey, 
      balance: 0, 
      createdAt: Date.now() 
    };
    this.users[user.id] = user;
    this.persist();
    this.broadcast('registrationSuccess', { ...user });
    this.broadcast('usersUpdate', Object.values(this.users).map(u => ({ ...u })));
  }

  private handleLogin(data: any) {
    const user = this.users[data.whatsapp];
    if (user && user.password === data.password) {
      this.broadcast('loginSuccess', { ...user });
    } else {
      this.broadcast('authError', 'Usuário ou senha inválidos.');
    }
  }

  private handleAddBalance(data: { userId: string, amount: number }) {
    if (data.amount > 0 && data.amount < 20) {
      this.broadcast('authError', 'O valor mínimo para depósito é R$ 20,00.');
      return;
    }
    if (this.users[data.userId]) {
      const currentBalance = this.users[data.userId].balance;
      const newBalance = Number((currentBalance + data.amount).toFixed(2));
      this.users[data.userId].balance = newBalance;
      if (data.amount > 0) this.dailyDeposits.push({ amount: data.amount, timestamp: Date.now() });
      this.persist();
      this.broadcast('balanceUpdate', newBalance);
      this.broadcast('usersUpdate', Object.values(this.users).map(u => ({ ...u })));
    }
  }

  private handleBuy(data: { userId: string, qty: number }) {
    const user = this.users[data.userId];
    if (!user) return;
    const cost = Number((data.qty * this.event.cardPrice).toFixed(2));
    if (user.balance >= cost) {
      user.balance = Number((user.balance - cost).toFixed(2));
      const newCards: Card[] = [];
      for (let i = 0; i < data.qty; i++) {
        const seriesIdx = Math.floor(Math.random() * 1000000);
        const { cards } = generateFullSeriesForUser(user.id, seriesIdx, 'PAC-01');
        newCards.push(...cards);
      }
      this.cards = [...this.cards, ...newCards];
      this.persist();
      this.broadcast('balanceUpdate', user.balance);
      this.broadcast('cardsUpdate', this.cards.map(c => ({ ...c })));
      this.broadcast('purchaseSuccess', null);
      this.broadcast('usersUpdate', Object.values(this.users).map(u => ({ ...u })));
    } else {
      this.broadcast('authError', `Saldo insuficiente.`);
    }
  }

  private handleStart(gamesLeft?: number) {
    if (this.cards.length === 0) return;
    const totalSeries = this.cards.length / 6;
    this.fixedRevenue = Number((totalSeries * this.event.cardPrice).toFixed(2));
    this.event.status = 'RUNNING';
    this.event.drawnBalls = [];
    this.event.winners = [];
    this.event.currentPrizeStep = 'QUADRA';
    this.event.gamesLeft = gamesLeft;
    this.notifiedNearWins.clear();
    this.broadcast('gameStarted', { ...this.event, gamesLeft });
    if (this.event.startMode === 'AUTO') {
      setTimeout(() => {
        if (!this.drawInterval && this.event.status === 'RUNNING') this.handleToggleAuto(true);
      }, 20000);
    }
  }

  private handleDraw() {
    if (this.event.status !== 'RUNNING') return;
    const available = Array.from({length: 90}, (_, i) => i + 1).filter(n => !this.event.drawnBalls.includes(n));
    if (available.length === 0) return;
    const ball = available[Math.floor(Math.random() * available.length)];
    this.event.drawnBalls = [...this.event.drawnBalls, ball];
    this.cards.forEach(c => {
      if (c.numbers.includes(ball)) {
        if (!c.markedNumbers.includes(ball)) c.markedNumbers = [...c.markedNumbers, ball];
      }
    });
    this.cards.forEach(card => {
      const cacheKey = `${card.id}-${this.event.currentPrizeStep}`;
      if (!this.notifiedNearWins.has(cacheKey)) {
        if (checkNearWin(card, this.event.drawnBalls, this.event.currentPrizeStep)) {
          this.notifiedNearWins.add(cacheKey);
          this.broadcast('nearWin', { cardId: card.id, prize: this.event.currentPrizeStep });
        }
      }
    });
    const winners = checkWinners(this.cards, this.event.drawnBalls, this.event.currentPrizeStep);
    if (winners.length > 0) {
      if (this.drawInterval) {
        clearInterval(this.drawInterval);
        this.drawInterval = null;
        this.broadcast('autoStatusUpdate', false);
      }
      const poolPercentages: Record<PrizeType, number> = {
        QUADRA: 25 / 300, QUINA: 60 / 300, BINGO: 150 / 300, ACCUMULATED: 5 / 300
      };
      const currentPrizeType = winners[0].prize;
      const totalPrizeForStep = Number((this.fixedRevenue * poolPercentages[currentPrizeType]).toFixed(2));
      const individualPrizeValue = Number((totalPrizeForStep / winners.length).toFixed(2));
      const records: WinnerRecord[] = winners.map(w => {
        const userId = this.cards.find(c => c.id === w.cardId)!.userId;
        const winnerUser = this.users[userId];
        if (winnerUser) winnerUser.balance = Number((winnerUser.balance + individualPrizeValue).toFixed(2));
        return { prize: w.prize, cardId: w.cardId, userName: winnerUser?.name || 'Jogador', ballCount: this.event.drawnBalls.length, timestamp: Date.now() };
      });
      this.event.winners = [...this.event.winners, ...records];
      if (this.event.currentPrizeStep === 'QUADRA') this.event.currentPrizeStep = 'QUINA';
      else if (this.event.currentPrizeStep === 'QUINA') this.event.currentPrizeStep = 'BINGO';
      else {
        this.event.status = 'FINISHED';
        this.event.lastGameEndTime = Date.now();
        if (this.event.gamesLeft === 1) this.triggerDailyReport();
        this.cards = [];
        this.notifiedNearWins.clear();
      }
      if (this.event.startMode === 'AUTO' && this.event.status === 'RUNNING') {
        setTimeout(() => {
          if (!this.drawInterval && this.event.status === 'RUNNING') this.handleToggleAuto(true);
        }, 3000);
      }
      this.persist();
      this.broadcast('usersUpdate', Object.values(this.users).map(u => ({ ...u })));
      this.broadcast('winnersAnnounced', records);
    }
    this.broadcast('ballDrawn', { ball, event: { ...this.event } });
  }

  private triggerDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    if (this.event.lastReportSentDate === today) return;
    const totalDeposits = this.dailyDeposits.length;
    const totalAmount = this.dailyDeposits.reduce((acc, d) => acc + d.amount, 0);
    const dateFormatted = new Date().toLocaleDateString('pt-BR');
    let reportText = `*RELATÓRIO DIÁRIO DE DEPÓSITOS - BINGO MASTER*\nData: ${dateFormatted}\n--------------------------------\nTotal de Depósitos: ${totalDeposits}\n\n*Lista de Valores:*\n`;
    this.dailyDeposits.forEach((d, i) => { reportText += `${i + 1}. R$ ${d.amount.toFixed(2)}\n`; });
    reportText += `\n--------------------------------\n*VALOR TOTAL DO DIA: R$ ${totalAmount.toFixed(2)}*\n(Base para cálculo de royalties)\n`;
    const encoded = encodeURIComponent(reportText);
    const masterNum = "86999334312";
    window.open(`https://wa.me/55${masterNum}?text=${encoded}`, '_blank');
    if (this.event.supportWhatsapp) {
      const supportNum = this.event.supportWhatsapp.replace(/\D/g, '');
      if (supportNum && supportNum !== masterNum) {
        setTimeout(() => { window.open(`https://wa.me/55${supportNum}?text=${encoded}`, '_blank'); }, 1000);
      }
    }
    this.event.lastReportSentDate = today;
    this.persist();
    this.broadcast('initialState', this.getInitialState());
  }

  private handleToggleAuto(enabled: boolean) {
    if (enabled) {
      if (!this.drawInterval) this.drawInterval = setInterval(() => this.handleDraw(), 6000);
    } else {
      if (this.drawInterval) clearInterval(this.drawInterval);
      this.drawInterval = null;
    }
    this.broadcast('autoStatusUpdate', !!this.drawInterval);
  }

  private handleReset() {
    if (this.drawInterval) clearInterval(this.drawInterval);
    this.drawInterval = null;
    this.event = { ...this.event, status: 'SETUP', drawnBalls: [], winners: [], currentPrizeStep: 'QUADRA', lastGameEndTime: 0 };
    this.cards = [];
    this.messages = [];
    this.fixedRevenue = 0;
    this.notifiedNearWins.clear();
    this.persist();
    this.broadcast('gameReset', { ...this.event });
    this.broadcast('cardsUpdate', []);
    this.broadcast('chatUpdate', []);
  }

  getInitialState() {
    return { 
      event: { ...this.event }, 
      cards: this.cards.map(c => ({ ...c })), 
      users: Object.values(this.users).map(u => ({ ...u })),
      messages: this.messages
    };
  }
}

const simulator = new BingoServerSimulator();

export const socket = {
  on: (event: string, callback: Function) => {
    const handler = (e: any) => {
      if (e.detail.event === event) callback(e.detail.data);
    };
    window.addEventListener('socket_msg', handler);
    if (event === 'initialState') {
      setTimeout(() => callback(simulator.getInitialState()), 100);
    }
    return () => window.removeEventListener('socket_msg', handler);
  },
  emit: (event: string, data?: any) => {
    setTimeout(() => simulator.processLocalEmit(event, data), 0);
  },
  off: (event: string) => {}
};
