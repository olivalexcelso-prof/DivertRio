
import { Card, Series } from '../types';

export const formatPackageId = (num: number): string => `PAC ${num.toString().padStart(9, '0')}A`;
export const formatSeriesId = (num: number): string => num.toString().padStart(9, '0');

/**
 * GERADOR RESTAURADO (FLUXO ORIGINAL)
 */
export const generateFullSeriesForUser = (
  userId: string, 
  seriesIndex: number, 
  packageId: string
): { series: Series, cards: Card[] } => {
  const seriesIdRaw = formatSeriesId(seriesIndex);
  const seriesIdFormatted = `Série ${seriesIdRaw}`;
  const suffixes = ['A', 'B', 'C', 'D', 'E', 'F'];

  const totalPool = Array.from({ length: 90 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  
  const cards: Card[] = [];
  
  for (let cIdx = 0; cIdx < 6; cIdx++) {
    const cardNumbers = totalPool.slice(cIdx * 15, (cIdx + 1) * 15).sort((a, b) => a - b);
    const grid: (number | null)[][] = Array.from({ length: 3 }, () => Array(9).fill(null));
    
    for (let r = 0; r < 3; r++) {
      const rowNumbers = cardNumbers.slice(r * 5, (r + 1) * 5);
      rowNumbers.forEach(num => {
        let col = Math.floor(num / 10);
        if (col > 8) col = 8;
        while (grid[r][col] !== null) {
          col = (col + 1) % 9;
        }
        grid[r][col] = num;
      });
    }

    cards.push({
      id: `Cartela ${seriesIdRaw}${suffixes[cIdx]}`,
      serieId: seriesIdFormatted,
      cardSuffix: suffixes[cIdx],
      userId,
      numbers: cardNumbers,
      grid,
      markedNumbers: [],
      isWinner: false,
      wonPrizes: []
    });
  }

  return {
    series: {
      id: seriesIdFormatted,
      packageId,
      userId,
      createdAt: Date.now(),
      cardIds: cards.map(c => c.id)
    },
    cards
  };
};

export const checkWinners = (cards: Card[], drawnBalls: number[], currentPrizeStep: string): any[] => {
  const winners: any[] = [];
  const drawnSet = new Set(drawnBalls);
  
  for (const card of cards) {
    const markedCount = card.numbers.filter(n => drawnSet.has(n)).length;
    if (currentPrizeStep === 'QUADRA') {
       if (hasLineMatch(card.grid, drawnSet, 4)) winners.push({ prize: 'QUADRA', cardId: card.id });
    } else if (currentPrizeStep === 'QUINA') {
       if (hasLineMatch(card.grid, drawnSet, 5)) winners.push({ prize: 'QUINA', cardId: card.id });
    } else if (currentPrizeStep === 'BINGO' || currentPrizeStep === 'ACCUMULATED') {
       if (markedCount === 15) winners.push({ prize: drawnBalls.length <= 40 ? 'ACCUMULATED' : 'BINGO', cardId: card.id });
    }
  }
  return winners;
};

/**
 * Verifica se a cartela está a 1 número de ganhar no passo atual
 */
export const checkNearWin = (card: Card, drawnBalls: number[], currentPrizeStep: string): boolean => {
  const drawnSet = new Set(drawnBalls);
  const totalMarked = card.numbers.filter(n => drawnSet.has(n)).length;

  if (currentPrizeStep === 'QUADRA') {
    return hasLineMatch(card.grid, drawnSet, 3) && !hasLineMatch(card.grid, drawnSet, 4);
  } else if (currentPrizeStep === 'QUINA') {
    return hasLineMatch(card.grid, drawnSet, 4) && !hasLineMatch(card.grid, drawnSet, 5);
  } else if (currentPrizeStep === 'BINGO' || currentPrizeStep === 'ACCUMULATED') {
    return totalMarked === 14;
  }
  return false;
};

const hasLineMatch = (grid: (number | null)[][], drawnSet: Set<number>, count: number): boolean => {
  for (const row of grid) {
    let matches = 0;
    for (const n of row) if (n !== null && drawnSet.has(n)) matches++;
    if (matches >= count) return true;
  }
  return false;
};

export const getCardScore = (card: Card, prizeType: string, drawnSet: Set<number>): number => {
  const totalMarked = card.numbers.filter(n => drawnSet.has(n)).length;
  if (prizeType === 'BINGO' || prizeType === 'ACCUMULATED') return totalMarked;
  
  let maxLine = 0;
  for (const row of card.grid) {
    let line = 0;
    for (const n of row) if (n !== null && drawnSet.has(n)) line++;
    if (line > maxLine) maxLine = line;
  }
  return (maxLine * 100) + totalMarked;
};
