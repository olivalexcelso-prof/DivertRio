
const { generateSeries } = require('../logic/cardGenerator');

class GameService {
  constructor() {
    this.status = 'SCHEDULED';
    this.drawnBalls = [];
    this.lastBall = null;
    this.startTime = Date.now() + 180000;
    this.winners = [];
    this.currentMatchRevenue = 0;
    this.config = null;
    this.io = null;
    this.drawInterval = null;
  }

  init(io, config) {
    this.io = io;
    this.config = config;
  }

  startMatch() {
    if (this.status === 'PLAYING') return;

    this.status = 'PLAYING';
    this.drawnBalls = [];
    this.lastBall = null;
    this.winners = [];
    
    this.broadcastState();

    // Inicia o sorteio das bolas
    if (this.drawInterval) clearInterval(this.drawInterval);
    this.drawInterval = setInterval(() => this.drawBall(), 6000);
  }

  drawBall() {
    if (this.status !== 'PLAYING' || this.drawnBalls.length >= 90) {
      this.endMatch();
      return;
    }

    const available = Array.from({ length: 90 }, (_, i) => i + 1)
      .filter(n => !this.drawnBalls.includes(n));
    
    if (available.length === 0) {
      this.endMatch();
      return;
    }

    const nextBall = available[Math.floor(Math.random() * available.length)];
    this.drawnBalls.push(nextBall);
    this.lastBall = nextBall;

    // Lógica de verificação de ganhadores (Fakes e Reais) pode ser expandida aqui
    // Por simplicidade inicial, focamos no fluxo de sorteio centralizado
    
    this.broadcastState();
  }

  endMatch() {
    this.status = 'FINISHED';
    if (this.drawInterval) clearInterval(this.drawInterval);
    this.broadcastState();
  }

  broadcastState() {
    if (this.io) {
      this.io.emit('game_state_update', this.getState());
    }
  }

  getState() {
    return {
      status: this.status,
      drawnBalls: this.drawnBalls,
      lastBall: this.lastBall,
      startTime: this.startTime,
      winners: this.winners,
      currentMatchRevenue: this.currentMatchRevenue
    };
  }

  buySeries(userId, isFake = false) {
    const series = generateSeries(userId);
    if (!isFake) {
      this.currentMatchRevenue += (this.config ? this.config.seriesPrice : 10);
      this.broadcastState();
    }
    return series;
  }
}

module.exports = new GameService();
