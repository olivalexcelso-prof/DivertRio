
import { BingoEvent, User, Card, WinnerRecord } from '../types';
import { generateFullSeriesForUser, checkWinners } from './bingoService';

/**
 * MOCK SERVER LOGIC (Simulação do Backend Node.js)
 * Esta lógica reside aqui apenas para o preview funcionar.
 * Na arquitetura real solicitada, este código estaria no server.ts.
 */
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
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => cb(...args));
    
    // Simulação de processamento de rede
    if (event === 'registerUser') this.handleRegister(args[0]);
    if (event === 'loginUser') this.handleLogin(args[0]);
    if (event === 'buySeries') this.handleBuy(args[0]);
    if (event === 'adminStartGame') this.handleStart();
    if (event === 'adminDrawBall') this.handleDraw();
    if (event === 'adminToggleAuto') this.handleToggleAuto(args[0]);
    if (event === 'adminReset') this.handleReset();
  }

  private broadcast(event: string, data: any) {
    // Simula o io.emit()
    window.dispatchEvent(new CustomEvent('socket_msg', { detail: { event, data } }));
  }

  private handleRegister(data: any) {
    const user = { ...data, id: data.whatsapp, balance: 200, createdAt: Date.now() };
    this.users[user.id] = user;
    this.broadcast('registrationSuccess', user);
    this.broadcast('usersUpdate', Object.values(this.users));
  }

  private handleLogin(data: any) {
    const user = this.users[data.whatsapp];
    if (user && user.password === data.password) {
      this.broadcast('loginSuccess', user);
    } else {
      this.broadcast('authError', 'Credenciais inválidas');
    }
  }

  private handleBuy(data: any) {
    const user = this.users[data.userId];
    if (user && user.balance >= data.qty * this.event.cardPrice) {
      user.balance -= data.qty * this.event.cardPrice;
      for (let i = 0; i < data.qty; i++) {
        const { cards } = generateFullSeriesForUser(user.id, Math.floor(Math.random()*100000), 'PAC1');
        this.cards.push(...cards);
      }
      this.broadcast('balanceUpdate', user.balance);
      this.broadcast('cardsUpdate', this.cards);
      this.broadcast('purchaseSuccess', null);
    }
  }

  private handleStart() {
    this.event.status = 'RUNNING';
    this.event.drawnBalls = [];
    this.broadcast('gameStarted', this.event);
  }

  private handleDraw() {
    const available = Array.from({length: 90}, (_, i) => i + 1).filter(n => !this.event.drawnBalls.includes(n));
    if (available.length === 0) return;
    const ball = available[Math.floor(Math.random() * available.length)];
    this.event.drawnBalls.push(ball);
    
    this.cards.forEach(c => {
      if (c.numbers.includes(ball)) c.markedNumbers.push(ball);
    });

    const winners = checkWinners(this.cards, this.event.drawnBalls, this.event.currentPrizeStep);
    if (winners.length > 0) {
      const records = winners.map(w => ({
        prize: w.prize,
        cardId: w.cardId,
        userName: this.users[this.cards.find(c => c.id === w.cardId)!.userId]?.name || 'Jogador',
        ballCount: this.event.drawnBalls.length,
        timestamp: Date.now()
      }));
      this.event.winners.push(...records);
      this.broadcast('winnersAnnounced', records);
      
      // Evolução de prêmio
      if (this.event.currentPrizeStep === 'QUADRA') this.event.currentPrizeStep = 'QUINA';
      else if (this.event.currentPrizeStep === 'QUINA') this.event.currentPrizeStep = 'BINGO';
      else {
        this.event.status = 'FINISHED';
        if (this.drawInterval) clearInterval(this.drawInterval);
      }
    }
    this.broadcast('ballDrawn', { ball, event: this.event });
  }

  private handleToggleAuto(enabled: boolean) {
    if (enabled && !this.drawInterval) {
      this.drawInterval = setInterval(() => this.handleDraw(), 4000);
    } else {
      clearInterval(this.drawInterval);
      this.drawInterval = null;
    }
    this.broadcast('autoStatusUpdate', !!this.drawInterval);
  }

  private handleReset() {
    clearInterval(this.drawInterval);
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

/**
 * CLIENT INTERFACE (O que o App consome)
 */
export const socket = {
  on: (event: string, callback: Function) => {
    window.addEventListener('socket_msg', (e: any) => {
      if (e.detail.event === event) callback(e.detail.data);
    });
    // Força o envio do estado inicial na conexão
    if (event === 'initialState') {
      setTimeout(() => callback(simulator.getInitialState()), 100);
    }
  },
  emit: (event: string, data?: any) => {
    simulator.emit(event, data);
  },
  off: (event: string) => {
    // Mock simplificado
  }
};

