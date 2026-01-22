
export type PrizeType = 'QUADRA' | 'QUINA' | 'BINGO' | 'ACCUMULATED';

export interface VisualConfig {
  appName: string;
  logoUrl?: string;
  loginBackgroundUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  cardColor: string;
  accentColor: string;
  backgroundColor: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface AdConfig {
  imageUrl: string;
  displayDuration: number; // segundos
  interval: number; // minutos
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  whatsapp: string;
  password?: string;
  email?: string;
  pixKey?: string;
  balance: number;
  createdAt: number;
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
  autoInterval: number;
  dailyStartTime?: string;
  dailyEndTime?: string;
  lastGameEndTime?: number;
  onlineCount?: number;
  supportWhatsapp?: string;
  lastReportSentDate?: string;
  gamesLeft?: number;
  adConfig?: AdConfig;
  logoUrl?: string;
  loginBackgroundUrl?: string;
  faviconUrl?: string;
}

export interface WinnerRecord {
  prize: PrizeType;
  cardId: string;
  userName: string;
  ballCount: number;
  timestamp: number;
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
