
import React, { useEffect, useState, useRef } from 'react';

interface BallTubeProps {
  drawnBalls: number[];
}

export const BallTube: React.FC<BallTubeProps> = ({ drawnBalls }) => {
  const [displayBalls, setDisplayBalls] = useState<number[]>([]);
  
  useEffect(() => {
    // Mantemos a ordem cronológica: a mais nova entra pela esquerda (index 0)
    // A lista enviada pelo drawnBalls é cronológica [1, 2, 3]
    // Invertemos para [3, 2, 1] para que o 3 (recente) esteja na esquerda (index 0)
    const latest = [...drawnBalls].reverse().slice(0, 10);
    setDisplayBalls(latest);
  }, [drawnBalls]);

  const getBallColor = (n: number) => {
    if (n <= 18) return 'from-blue-500 to-blue-700';
    if (n <= 36) return 'from-red-500 to-red-700';
    if (n <= 54) return 'from-yellow-400 to-yellow-600';
    if (n <= 72) return 'from-green-500 to-green-700';
    return 'from-purple-500 to-purple-700';
  };

  return (
    <div className="w-full py-4 px-2 select-none">
      <div className="relative">
        <div className="absolute -top-3 left-8 z-20">
          <span className="bg-indigo-600 text-[10px] font-black text-white px-4 py-1 rounded-full shadow-lg uppercase tracking-widest border border-indigo-400">
            Últimas Chamadas
          </span>
        </div>

        {/* Tubo Horizontal */}
        <div className="relative h-24 w-full overflow-hidden rounded-full border border-white/30 bg-white/10 shadow-[inset_0_4px_12px_rgba(0,0,0,0.1),0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md flex items-center">
          
          {/* Efeito de Reflexo do Tubo */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
          
          {/* Container de Bolas com Animação */}
          <div className="flex items-center gap-4 px-8 h-full">
            {displayBalls.map((num, idx) => {
              const isNewest = idx === 0;
              // Chave única baseada no número e na quantidade total de bolas sorteadas
              const key = `ball-${num}-${drawnBalls.length - idx}`;
              
              return (
                <div
                  key={key}
                  className={`
                    flex-shrink-0 w-14 h-14 rounded-full 
                    bg-gradient-to-br ${getBallColor(num)}
                    shadow-[0_6px_15px_rgba(0,0,0,0.4),inset_0_-3px_8px_rgba(0,0,0,0.4),inset_0_3px_8px_rgba(255,255,255,0.6)]
                    flex items-center justify-center border-2 border-white/40
                    relative overflow-hidden
                    ${isNewest ? 'animate-ball-entry' : 'animate-ball-slide'}
                  `}
                >
                  <div className="absolute top-1.5 left-2.5 w-4 h-2.5 bg-white/40 rounded-full blur-[1px] -rotate-45"></div>
                  <span className="text-white font-black text-2xl drop-shadow-md z-10">
                    {num}
                  </span>
                  <div className="absolute inset-2 rounded-full border border-white/10 bg-black/5"></div>
                </div>
              );
            })}
          </div>

          {/* Gradientes de desvanecimento para saída fluida à direita */}
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-indigo-900/10 to-transparent pointer-events-none z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-indigo-900/10 to-transparent pointer-events-none z-10"></div>
        </div>
      </div>

      <style>{`
        @keyframes ball-entry-anim {
          0% {
            transform: translateX(-300%) rotate(-720deg) scale(0.3);
            opacity: 0;
          }
          100% {
            transform: translateX(0) rotate(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes ball-slide-anim {
          0% {
            transform: translateX(-70px);
          }
          100% {
            transform: translateX(0);
          }
        }
        .animate-ball-entry {
          animation: ball-entry-anim 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-ball-slide {
          animation: ball-slide-anim 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
};
