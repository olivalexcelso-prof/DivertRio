
import { io } from "https://esm.sh/socket.io-client@^4.8.1";
import { generateFullSeriesForUser } from "./bingoService";

const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  timeout: 5000,
  autoConnect: true
});

// Cache local para os listeners do mock, contornando limitações do objeto socket
const mockListeners: Record<string, Function[]> = {};

const originalOn = socket.on.bind(socket);
socket.on = function(event: string, callback: Function) {
  if (!mockListeners[event]) mockListeners[event] = [];
  mockListeners[event].push(callback);
  return originalOn(event, callback);
};

const triggerMock = (event: string, data: any) => {
  mockListeners[event]?.forEach(cb => cb(data));
};

socket.on("connect_error", () => {
  console.warn("Servidor central offline. Ativando simulador administrativo para testes.");
});

// Interceptor para garantir funcionamento total no Preview/Offline
const originalEmit = socket.emit;
socket.emit = function(event: string, ...args: any[]) {
  if (!socket.connected) {
    const savedUserStr = localStorage.getItem('bingo_user_session');
    let u = savedUserStr ? JSON.parse(savedUserStr) : null;

    // Fallback para Autenticação
    if (event === 'loginUser' || event === 'registerUser') {
      const data = args[0];
      if (!u) {
        u = { id: data.whatsapp, name: data.name || "Usuário Teste", whatsapp: data.whatsapp, balance: 100 };
        localStorage.setItem('bingo_user_session', JSON.stringify(u));
      }
      setTimeout(() => {
        triggerMock('loginSuccess', u);
        triggerMock('registrationSuccess', u);
      }, 300);
      return socket;
    }

    // Fallback para Depósito de Saldo (PIX)
    if (event === 'addBalance') {
      const { amount } = args[0];
      if (u) {
        u.balance = Number(u.balance) + Number(amount);
        localStorage.setItem('bingo_user_session', JSON.stringify(u));
        setTimeout(() => triggerMock('balanceUpdate', u.balance), 200);
      }
      return socket;
    }

    // Fallback para Compra de Séries
    if (event === 'buySeries') {
      const { qty } = args[0];
      const cardPrice = 10; 
      const totalCost = qty * cardPrice;
      
      if (u && u.balance >= totalCost) {
        u.balance -= totalCost;
        localStorage.setItem('bingo_user_session', JSON.stringify(u));
        
        const existingCardsStr = localStorage.getItem('bingo_mock_cards');
        const allCards = existingCardsStr ? JSON.parse(existingCardsStr) : [];
        const newCards = [];
        for (let i = 0; i < qty; i++) {
          const { cards } = generateFullSeriesForUser(u.id, Math.random() * 1000000, `PAC-${Date.now()}`);
          newCards.push(...cards);
        }
        const updatedCards = [...allCards, ...newCards];
        localStorage.setItem('bingo_mock_cards', JSON.stringify(updatedCards));
        
        setTimeout(() => {
          triggerMock('balanceUpdate', u.balance);
          triggerMock('cardsUpdate', updatedCards);
        }, 400);
      } else {
        alert("Saldo insuficiente no simulador!");
      }
      return socket;
    }

    // Fallback para Sincronização Inicial
    if (event === 'requestSync') {
      const existingCardsStr = localStorage.getItem('bingo_mock_cards');
      const allCards = existingCardsStr ? JSON.parse(existingCardsStr) : [];
      setTimeout(() => {
        triggerMock('initialState', {
          event: { status: 'SETUP', cardPrice: 10, name: 'Bingo Master', drawnBalls: [], currentPrizeStep: 'QUADRA', onlineCount: 1 },
          cards: allCards,
          users: u ? [u] : [],
          messages: [],
          isAutoDrawing: false
        });
      }, 100);
      return socket;
    }

    // Fallback para Admin
    if (event === 'adminReset') {
      localStorage.removeItem('bingo_mock_cards');
      setTimeout(() => {
        triggerMock('eventUpdate', { status: 'SETUP', drawnBalls: [], winners: [] });
        triggerMock('cardsUpdate', []);
      }, 200);
      return socket;
    }
  }
  return originalEmit.apply(socket, [event, ...args]);
};
