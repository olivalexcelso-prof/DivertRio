
import React, { useEffect, useState } from 'react';
import { BingoEvent, WinnerRecord, PrizeType } from '../types';
import { PRIZE_LABELS } from '../constants';
import { Award, Trophy, Star, X, CheckCircle2, RotateCcw, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FinalScoreboardProps {
  event: BingoEvent;
  onClose: () => void;
  onReset?: () => void;
}

export const FinalScoreboard: React.FC<FinalScoreboardProps> = ({ event, onClose, onReset }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Ativa a visibilidade para a animação de entrada
    setIsVisible(true);
    
    // Dispara a animação festiva de confetes
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Chamada segura garantindo que estamos no browser e com valores válidos
      if (typeof confetti === 'function') {
        try {
          confetti({ 
            ...defaults, 
            particleCount, 
            origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.4, 0.6) } 
          });
          confetti({ 
            ...defaults, 
            particleCount, 
            origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.4, 0.6) } 
          });
        } catch (err) {
          console.warn('Falha ao disparar confete:', err);
        }
      }
    }, 250);

    // FECHAMENTO AUTOMÁTICO APÓS 4 SEGUNDOS
    const autoCloseTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 500); // Tempo para animação de saída
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(autoCloseTimer);
      if (typeof confetti === 'function') {
        try {
          (confetti as any).reset();
        } catch (e) {}
      }
    };
  }, [onClose]);

  const getWinnerByPrize = (prize: PrizeType): WinnerRecord | undefined => {
    return event.winners.find(w => w.prize === prize);
  };

  const renderWinnerBlock = (prize: PrizeType, label: string, colorClass: string) => {
    const winner = getWinnerByPrize(prize);
    const seriesIdRaw = winner?.cardId.split(' ')[1] || '';
    const seriesNumber = seriesIdRaw.substring(0, 9) || '---';

    return (
      <div className={`p-5 rounded-2xl border-2 ${winner ? `${colorClass} border-current opacity-100` : 'bg-gray-50 border-gray-100 opacity-60'}`}>
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-black uppercase tracking-wider text-sm">{label}</h4>
          {winner ? <CheckCircle2 size={20} /> : <X size={20} className="text-gray-300" />}
        </div>
        
        {winner ? (
          <div className="space-y-1">
            <p className="text-lg font-black leading-tight">{winner.userName}</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-[10px] font-bold uppercase opacity-70">Série</p>
                <p className="text-xs font-mono font-bold">{seriesNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase opacity-70">Cartela</p>
                <p className="text-xs font-mono font-bold">{winner.cardId.split(' ').pop()}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-current/20">
              <p className="text-xs font-bold">
                {prize === 'BINGO' ? `Total de bolas: ${winner.ballCount}` : `Bola da vitória: ${event.drawnBalls[winner.ballCount - 1]}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase italic">
              {prize === 'ACCUMULATED' ? 'Não conquistado' : 'Sem ganhador'}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-700 ${isVisible ? 'bg-black/80 backdrop-blur-md' : 'bg-black/0 backdrop-blur-0'}`}>
      <div className={`bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden transition-all duration-500 transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0'}`}>
        
        {/* Header Festivo */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 p-8 text-center relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 animate-bounce"><Star size={24} fill="white" /></div>
            <div className="absolute bottom-10 right-10 animate-bounce delay-150"><Star size={20} fill="white" /></div>
          </div>
          <div className="inline-flex p-4 bg-white/20 rounded-3xl mb-4 backdrop-blur-sm">
            <Trophy size={48} className="text-yellow-400 drop-shadow-lg" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter">PLACAR FINAL</h2>
          <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs mt-2">Encerramento Oficial da Partida</p>
        </div>

        {/* Grade de Resultados */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderWinnerBlock('QUADRA', 'Quadra (Linha)', 'bg-blue-50 text-blue-700')}
          {renderWinnerBlock('QUINA', 'Quina (Linha)', 'bg-emerald-50 text-emerald-700')}
          {renderWinnerBlock('BINGO', 'Bingo (15 Dezenas)', 'bg-yellow-50 text-yellow-700')}
          {renderWinnerBlock('ACCUMULATED', 'Bingo Acumulado', 'bg-rose-50 text-rose-700')}
        </div>

        {/* Rodapé e Fechamento */}
        <div className="px-8 pb-8 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 500);
              }}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Home size={20} /> Voltar ao Início
            </button>
            <button 
              onClick={() => {
                if (onReset) {
                  setIsVisible(false);
                  setTimeout(onReset, 500);
                }
              }}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
            >
              {/* Fix: Corrected component name from <Rotate Ccw /> to <RotateCcw /> */}
              <RotateCcw size={20} /> Jogar Novamente
            </button>
          </div>
          
          <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
            {event.name} • Sistema Auditado
          </p>
        </div>
      </div>
    </div>
  );
};
