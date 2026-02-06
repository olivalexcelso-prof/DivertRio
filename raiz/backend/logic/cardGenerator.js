
/**
 * Gera uma série de 6 cartelas contendo exatamente os números de 1 a 90.
 * Lógica baseada na versão original do frontend, mas adaptada para o backend.
 */
function generateSeries(userId) {
  // 1. Criar pools de números por coluna
  const pools = [
    Array.from({ length: 9 }, (_, i) => i + 1),    // 01-09
    Array.from({ length: 10 }, (_, i) => i + 10), // 10-19
    Array.from({ length: 10 }, (_, i) => i + 20), // 20-29
    Array.from({ length: 10 }, (_, i) => i + 30), // 30-39
    Array.from({ length: 10 }, (_, i) => i + 40), // 40-49
    Array.from({ length: 10 }, (_, i) => i + 50), // 50-59
    Array.from({ length: 10 }, (_, i) => i + 60), // 60-69
    Array.from({ length: 10 }, (_, i) => i + 70), // 70-79
    Array.from({ length: 11 }, (_, i) => i + 80), // 80-90
  ];

  // Embaralhar pools
  pools.forEach(p => p.sort(() => Math.random() - 0.5));

  // 2. Definir a contagem de números por coluna em cada cartela
  const colCountsPerCard = Array.from({ length: 6 }, () => Array(9).fill(1));
  const poolRemainders = pools.map(p => p.length - 6);
  
  for (let c = 0; c < 6; c++) {
    let extraNeeded = 6;
    while (extraNeeded > 0) {
      const colIdx = Math.floor(Math.random() * 9);
      if (colCountsPerCard[c][colIdx] < 3 && poolRemainders[colIdx] > 0) {
        colCountsPerCard[c][colIdx]++;
        poolRemainders[colIdx]--;
        extraNeeded--;
      }
    }
  }

  // 3. Distribuir os números nas matrizes 3x9
  const seriesCards = Array.from({ length: 6 }, () => 
    Array.from({ length: 3 }, () => Array(9).fill(null))
  );

  for (let cardIdx = 0; cardIdx < 6; cardIdx++) {
    const counts = colCountsPerCard[cardIdx];
    let success = false;
    let attempts = 0;
    
    // Mapear quais números pertencem a quais colunas para esta cartela
    const colNums = Array.from({ length: 9 }, () => []);
    counts.forEach((count, colIdx) => {
      for (let i = 0; i < count; i++) {
        colNums[colIdx].push(pools[colIdx].pop());
      }
    });

    while (!success && attempts < 100) {
      attempts++;
      const tempMatrix = Array.from({ length: 3 }, () => Array(9).fill(null));
      const rowCounts = [0, 0, 0];
      const colUsage = colNums.map(nums => nums.length);

      // Regra: colunas com 3 números ocupam todas as linhas
      colUsage.forEach((count, colIdx) => {
        if (count === 3) {
          tempMatrix[0][colIdx] = 0; tempMatrix[1][colIdx] = 0; tempMatrix[2][colIdx] = 0;
          rowCounts[0]++; rowCounts[1]++; rowCounts[2]++;
        }
      });

      // Distribuir colunas com 2 e 1
      const remainingCols = colUsage.map((count, i) => count > 0 && count < 3 ? i : -1).filter(i => i !== -1);
      remainingCols.sort(() => Math.random() - 0.5);

      remainingCols.forEach(colIdx => {
        const count = colUsage[colIdx];
        const availableRows = [0, 1, 2]
          .filter(r => rowCounts[r] < 5 && tempMatrix[r][colIdx] === null)
          .sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < count && i < availableRows.length; i++) {
          const rowIdx = availableRows[i];
          tempMatrix[rowIdx][colIdx] = 0;
          rowCounts[rowIdx]++;
        }
      });

      if (rowCounts.every(c => c === 5)) {
        for (let col = 0; col < 9; col++) {
          const nums = colNums[col].sort((a, b) => a - b);
          let nIdx = 0;
          for (let row = 0; row < 3; row++) {
            if (tempMatrix[row][col] !== null) {
              tempMatrix[row][col] = nums[nIdx++];
            }
          }
        }
        seriesCards[cardIdx] = tempMatrix;
        success = true;
      }
    }
    
    if (!success) return generateSeries(userId);
  }

  return {
    id: Math.random().toString(36).substr(2, 9).toUpperCase(),
    cards: seriesCards.map(matrix => ({
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      userId,
      matrix,
      markedNumbers: []
    }))
  };
}

module.exports = { generateSeries };
