
import React, { useMemo } from 'react';
import { User, Card, BingoEvent, ChatMessage } from '../types';
import { BingoCard } from './BingoCard';
import { BallTube } from './BallTube';
import { Ticket } from 'lucide-react';
import { PRIZE_LABELS, ACCUMULATED_THRESHOLD } from '../constants';
import { getCardScore } from '../services/bingoService';

interface UserDashboardProps {
  user: User;
  cards: Card[];
  event: BingoEvent;
  messages: ChatMessage[];
  totalGlobalCards: number;
  onSendMessage: (text: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ 
  user, 
  cards, 
  event, 
  messages,
  totalGlobalCards, 
  onSendMessage 
}) => {
  const lastBall = event.drawnBalls[event.drawnBalls.length - 1];
  const ballCount = event.drawnBalls.length;
  const isAccumulatedEligible = ballCount <= ACCUMULATED_THRESHOLD;

  const totalGlobalSeries = Math.floor(totalGlobalCards / 6);
  const totalRevenue = totalGlobalSeries * event.cardPrice;

  const prizes = {
    quadra: totalRevenue * (25 / 300),
    quina: totalRevenue * (60 / 300),
    bingo: totalRevenue * (150 / 300),
    acumulado: totalRevenue * (5 / 300)
  };
  
  const sortedUserCards = useMemo(() => {
    if (cards.length === 0) return [];
    const drawnSet = new Set<number>(event.drawnBalls);
    const cardsWithScores = cards.map(card => ({
      card,
      score: getCardScore(card, event.currentPrizeStep, drawnSet)
    }));
    return cardsWithScores.sort((a, b) => b.score - a.score).map(item => item.card);
  }, [cards, event.currentPrizeStep, event.drawnBalls]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      
      {/* ÁREA DE JOGO (OCUPA ESPAÇO TOTAL AGORA) */}
      <div className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden">
        
        {/* ÁREA SCROLLÁVEL DE CONTEÚDO */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide pb-20">
          {/* Painel de Prêmios */}
          <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden shrink-0 border border-slate-700">
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                 <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-white/5 pb-3">
                    <div className="flex flex-col"><span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Quadra</span><span className="text-sm font-black">R$ {prizes.quadra.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Quina</span><span className="text-sm font-black">R$ {prizes.quina.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">Bingo Principal</span><span className="text-lg font-black text-yellow-400">R$ {prizes.bingo.toFixed(2)}</span></div>
                 </div>
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest leading-none">{PRIZE_LABELS[event.currentPrizeStep]}</h3>
                    <div className="text-right">
                       <span className={`text-[7px] font-black px-2 py-1 rounded uppercase tracking-tighter ${isAccumulatedEligible ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                         Acumulado: R$ {prizes.acumulado.toFixed(2)}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-3xl border border-white/10 w-28">
                 <p className="text-[8px] font-black text-slate-500 uppercase mb-2 tracking-widest">Última</p>
                 <div className="w-16 h-16 bg-white text-indigo-950 rounded-full flex items-center justify-center text-3xl font-black shadow-2xl border-4 border-indigo-500">{lastBall || '--'}</div>
              </div>
            </div>
          </div>

          {event.status === 'RUNNING' && <BallTube drawnBalls={event.drawnBalls} />}

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {sortedUserCards.map(card => <BingoCard key={card.id} card={card} drawnBalls={event.drawnBalls} />)}
          </section>

          {cards.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 m-4">
              <div className="p-8 bg-slate-50 rounded-full mb-6">
                <Ticket className="text-slate-200" size={64} />
              </div>
              <p className="text-slate-400 font-black uppercase text-xs tracking-[0.3em]">Aguardando Início ou Compra de Séries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
