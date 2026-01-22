
export const BINGO_MAX_BALLS = 90;
export const CARD_ROWS = 3;
export const CARD_COLS = 9; // 9 Colunas padrão para Bingo de 90 bolas
export const ACTIVE_NUMBERS_COUNT = 15;
export const ACCUMULATED_THRESHOLD = 40;

export const PRIZE_LABELS: Record<string, string> = {
  QUADRA: 'Quadra (4 na Linha)',
  QUINA: 'Quina (5 na Linha)',
  BINGO: 'Bingo (Cartela Cheia)',
  ACCUMULATED: 'Bingo Acumulado (Até bola 40)'
};
