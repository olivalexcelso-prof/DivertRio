
import { Card } from '../types';
import React from 'react';

interface BingoCardProps {
  card: Card;
  drawnBalls: number[];
}

export const BingoCard = React.memo<BingoCardProps>(({ card, drawnBalls }) => {
  const drawnSet = new Set(drawnBalls);

  return (
    <div className="rounded-lg shadow-md p-1.5 border-2 border-black max-w-full mx-auto relative overflow-hidden transition-all duration-300 hover:shadow-xl" style={{ backgroundColor: 'var(--card-color)' }}>
      {/* Header da Cartela */}
      <div className="flex justify-between items-center mb-1 px-1 border-b border-black/20 pb-0.5">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-black uppercase leading-none">Cartela</span>
          <span className="text-[10px] font-black text-black leading-none">
            {card.id.split(' ').pop()}
          </span>
        </div>
        <div className="text-[8px] font-black text-black uppercase tracking-tight">
          {card.serieId}
        </div>
        <div className="flex gap-1">
          {card.wonPrizes.map(p => (
            <span key={p} className="bg-yellow-400 text-black text-[7px] px-1 py-0.5 rounded-sm font-black border border-black animate-pulse">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Grid de Números 3x9 */}
      <div className="grid grid-cols-9 gap-0.5 bg-black/10 p-0.5 rounded-sm">
        {card.grid.map((row, rIdx) => (
          row.map((val, cIdx) => {
            const isMarked = val !== null && drawnSet.has(val);
            return (
              <div 
                key={`${rIdx}-${cIdx}`}
                className={`
                  aspect-square flex items-center justify-center rounded-sm text-[12px] font-black relative
                  ${val === null ? '' : 'bg-white border-[0.5px] border-black/10'}
                  transition-all duration-300
                `}
                style={val === null ? { backgroundColor: 'var(--card-color)' } : {}}
              >
                {val !== null && (
                  <span className={`z-10 ${isMarked ? 'text-white' : 'text-[#0000FF]'}`}>
                    {val}
                  </span>
                )}
                {isMarked && (
                  <div className="absolute inset-0.5 bg-red-600 rounded-full animate-in zoom-in duration-300 shadow-inner border border-red-800"></div>
                )}
              </div>
            );
          })
        ))}
      </div>

      {/* Footer / Score */}
      <div className="mt-1.5 flex justify-between items-center px-1">
        <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden mr-3">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500" 
            style={{ width: `${(card.markedNumbers.length / 15) * 100}%` }}
          ></div>
        </div>
        <span className="text-[9px] font-black text-black">
          {card.markedNumbers.length}/15
        </span>
      </div>
    </div>
  );
});
