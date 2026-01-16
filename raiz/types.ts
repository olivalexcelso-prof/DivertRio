
export type PrizeType = 'QUADRA' | 'QUINA' | 'BINGO' | 'ACCUMULATED';

export interface VisualConfig {
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  cardColor: string;
  accentColor: string;
  backgroundColor: string;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  whatsapp: string;
  password?: string; // Campo de senha adicionado
  email?: string;
  pixKey?: string;
  balance: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'PURCHASE';
  amount: number;
  fee: number;
  netAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  pixCode?: string;
  createdAt: number;
}

export interface Card {
  id: string;
  serieId: string;
  cardSuffix: string;
  userId: string;
  numbers: number[]; 
  grid: (number | null)[][]; 
  markedNumbers: number[];
  isWinner: boolean;
  wonPrizes: PrizeType[];
}

export interface Series {
  id: string;
  packageId: string;
  userId: string;
  createdAt: number;
  cardIds: string[];
}

export interface BingoEvent {
  id: string;
  name: string;
  cardPrice: number;
  maxCards: number;
  drawnBalls: number[];
  status: 'SETUP' | 'RUNNING' | 'FINISHED';
  currentPrizeStep: PrizeType;
  winners: WinnerRecord[];
  startMode: 'MANUAL' | 'AUTO';
  autoInterval: number; // Intervalo em minutos
  nextAutoStart?: number; // Timestamp do próximo início
  onlineCount?: number; // Campo para rastrear jogadores conectados em tempo real
}

export interface WinnerRecord {
  prize: PrizeType;
  cardId: string;
  userName: string;
  ballCount: number;
  timestamp: number;
}
