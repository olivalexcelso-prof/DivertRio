
import { Card, Series } from '../types';

export const formatPackageId = (num: number): string => `PAC ${num.toString().padStart(9, '0')}A`;
export const formatSeriesId = (num: number): string => num.toString().padStart(9, '0');

/**
 * GERADOR RESTAURADO (FLUXO ORIGINAL)
 * Processamento linear O(n) que não trava o navegador.
 */
export const generateFullSeriesForUser = (
  userId: string, 
  seriesIndex: number, 
  packageId: string
): { series: Series, cards: Card[] } => {
  const seriesIdRaw = formatSeriesId(seriesIndex);
  const seriesIdFormatted = `Série ${seriesIdRaw}`;
  const suffixes = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Criar pool total de 90 números e embaralhar
  const totalPool = Array.from({ length: 90 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  
  const cards: Card[] = [];
  
  // Distribuir 15 números para cada uma das 6 cartelas (Total 90 números usados sem repetição na série)
  for (let cIdx = 0; cIdx < 6; cIdx++) {
    const cardNumbers = totalPool.slice(cIdx * 15, (cIdx + 1) * 15).sort((a, b) => a - b);
    const grid: (number | null)[][] = Array.from({ length: 3 }, () => Array(9).fill(null));
    
    // Distribuição simplificada em 3 linhas de 5 números cada
    for (let r = 0; r < 3; r++) {
      const rowNumbers = cardNumbers.slice(r * 5, (r + 1) * 5);
      rowNumbers.forEach(num => {
        let col = Math.floor(num / 10);
        if (col > 8) col = 8;
        // Se a coluna já estiver ocupada nesta linha, move para a próxima disponível linearmente
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
