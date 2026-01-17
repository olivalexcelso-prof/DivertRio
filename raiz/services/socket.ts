
import { BingoEvent, User, Card, WinnerRecord } from '../types';
import { generateFullSeriesForUser, checkWinners } from './bingoService';

class BingoServerSimulator {
  private users: Record<string, User> = {};
  private cards: Card[] = [];
  private event: BingoEvent = {
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
    onlineCount: 1
  };
  private drawInterval: any = null;

  processLocalEmit(eventName: string, data: any) {
    if (eventName === 'registerUser') this.handleRegister(data);
    if (eventName === 'loginUser') this.handleLogin(data);
    if (eventName === 'buySeries') this.handleBuy(data);
    if (eventName === 'adminStartGame') this.handleStart();
    if (eventName === 'adminDrawBall') this.handleDraw();
    if (eventName === 'adminToggleAuto') this.handleToggleAuto(data);
    if (eventName === 'adminReset') this.handleReset();
  }

  private broadcast(eventName: string, data: any) {
    const event = new CustomEvent('socket_msg', { detail: { event: eventName, data } });
    window.dispatchEvent(event);
  }

  private handleRegister(data: any) {
    const user: User = { 
      id: data.whatsapp, 
      name: data.name, 
      whatsapp: data.whatsapp, 
      password: data.password, 
      pixKey: data.pixKey, 
      balance: 200, 
      createdAt: Date.now() 
    };
    this.users[user.id] = user;
    this.broadcast('registrationSuccess', user);
    this.broadcast('usersUpdate', Object.values(this.users));
  }

  private handleLogin(data: any) {
    const user = this.users[data.whatsapp];
    if (user && user.password === data.password) {
      this.broadcast('loginSuccess', user);
    } else {
      this.broadcast('authError', 'Usuário ou senha inválidos.');
    }
  }

  private handleBuy(data: any) {
    const user = this.users[data.userId];
    const cost = data.qty * this.event.cardPrice;
    if (user && user.balance >= cost) {
      user.balance -= cost;
      for (let i = 0; i < data.qty; i++) {
        const { cards } = generateFullSeriesForUser(user.id, Math.floor(Math.random() * 1000000), 'PAC1');
        this.cards.push(...cards);
      }
      this.broadcast('balanceUpdate', user.balance);
      this.broadcast('cardsUpdate', this.cards);
      this.broadcast('purchaseSuccess', null);
    }
  }

  private handleStart() {
    if (this.cards.length === 0) return;
    this.event.status = 'RUNNING';
    this.event.drawnBalls = [];
    this.event.winners = [];
    this.broadcast('gameStarted', this.event);
  }

  private handleDraw() {
    if (this.event.status !== 'RUNNING') return;
    const available = Array.from({length: 90}, (_, i) => i + 1).filter(n => !this.event.drawnBalls.includes(n));
    if (available.length === 0) return;
    const ball = available[Math.floor(Math.random() * available.length)];
    this.event.drawnBalls.push(ball);
    
    this.cards.forEach(c => {
      if (c.numbers.includes(ball)) {
        if (!c.markedNumbers.includes(ball)) c.markedNumbers.push(ball);
      }
    });

    const winners = checkWinners(this.cards, this.event.drawnBalls, this.event.currentPrizeStep);
    if (winners.length > 0) {
      const records: WinnerRecord[] = winners.map(w => ({
        prize: w.prize,
        cardId: w.cardId,
        userName: this.users[this.cards.find(c => c.id === w.cardId)!.userId]?.name || 'Jogador',
        ballCount: this.event.drawnBalls.length,
        timestamp: Date.now()
      }));
      this.event.winners.push(...records);
      this.broadcast('winnersAnnounced', records);
      
      if (this.event.currentPrizeStep === 'QUADRA') this.event.currentPrizeStep = 'QUINA';
      else if (this.event.currentPrizeStep === 'QUINA') this.event.currentPrizeStep = 'BINGO';
      else {
        this.event.status = 'FINISHED';
        if (this.drawInterval) clearInterval(this.drawInterval);
        this.drawInterval = null;
      }
    }
    this.broadcast('ballDrawn', { ball, event: this.event });
  }

  private handleToggleAuto(enabled: boolean) {
    if (enabled && !this.drawInterval) {
      this.drawInterval = setInterval(() => this.handleDraw(), 4000);
    } else {
      if (this.drawInterval) clearInterval(this.drawInterval);
      this.drawInterval = null;
    }
    this.broadcast('autoStatusUpdate', !!this.drawInterval);
  }

  private handleReset() {
    if (this.drawInterval) clearInterval(this.drawInterval);
    this.drawInterval = null;
    this.event = { ...this.event, status: 'SETUP', drawnBalls: [], winners: [], currentPrizeStep: 'QUADRA' };
    this.cards = [];
    this.broadcast('gameReset', this.event);
    this.broadcast('cardsUpdate', this.cards);
  }

  getInitialState() {
    return { event: this.event, cards: this.cards, users: Object.values(this.users) };
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
      setTimeout(() => callback(simulator.getInitialState()), 10);
    }
    return () => window.removeEventListener('socket_msg', handler);
  },
  emit: (event: string, data?: any) => {
    setTimeout(() => simulator.processLocalEmit(event, data), 0);
  },
  off: (event: string) => {}
};
