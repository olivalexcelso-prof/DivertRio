
import React, { useMemo } from 'react';
import { User, Card, BingoEvent, ChatMessage } from '../types';
import { BingoCard } from './BingoCard';
import { BallTube } from './BallTube';
import { Chat } from './Chat';
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
      
      {/* ÁREA DE JOGO (TOPO) - SEM CABEÇALHOS INTERNOS */}
      <div className="flex-1 flex flex-col p-2 md:p-4 overflow-hidden">
        
        {/* ÁREA SCROLLÁVEL DE CONTEÚDO */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
          {/* Painel de Prêmios - POSIÇÃO ABSOLUTA TOPO */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden shrink-0 border border-slate-700">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                 <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-white/5 pb-2">
                    <div className="flex flex-col"><span className="text-[6px] text-slate-400 font-black uppercase">Quadra</span><span className="text-[10px] font-black">R$ {prizes.quadra.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-[6px] text-slate-400 font-black uppercase">Quina</span><span className="text-[10px] font-black">R$ {prizes.quina.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-[6px] text-slate-400 font-black uppercase">Bingo</span><span className="text-xs font-black text-yellow-400">R$ {prizes.bingo.toFixed(2)}</span></div>
                 </div>
                 <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">{PRIZE_LABELS[event.currentPrizeStep]}</h3>
                    <div className="text-right">
                       <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase ${isAccumulatedEligible ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                         Acumulado: R$ {prizes.acumulado.toFixed(2)}
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-2xl border border-white/10 w-20">
                 <div className="w-10 h-10 bg-white text-indigo-950 rounded-full flex items-center justify-center text-xl font-black shadow-lg">{lastBall || '--'}</div>
              </div>
            </div>
          </div>

          {event.status === 'RUNNING' && <BallTube drawnBalls={event.drawnBalls} />}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 pb-4">
            {sortedUserCards.map(card => <BingoCard key={card.id} card={card} drawnBalls={event.drawnBalls} />)}
          </section>

          {cards.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Ticket className="text-slate-200 mx-auto mb-3" size={32} />
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Suas séries aparecerão aqui</p>
            </div>
          )}
        </div>
      </div>

      {/* CHAT INFERIOR - EXPANDIDO PARA 30% DA ALTURA (30vh) */}
      <div className="h-[30vh] w-full border-t border-slate-200 bg-white z-20 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
        <Chat 
          messages={messages} 
          currentUserId={user.id} 
          adConfig={event.adConfig}
          onSendMessage={onSendMessage} 
        />
      </div>
    </div>
  );
};
