
import React, { useMemo } from 'react';
import { User, Card, BingoEvent } from '../types';
import { BingoCard } from './BingoCard';
import { Layers, Banknote, Ticket } from 'lucide-react';
import { PRIZE_LABELS, ACCUMULATED_THRESHOLD } from '../constants';
import { getCardScore } from '../services/bingoService';

interface UserDashboardProps {
  user: User;
  cards: Card[];
  event: BingoEvent;
  totalGlobalCards: number;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, cards, event, totalGlobalCards }) => {
  const lastBall = event.drawnBalls[event.drawnBalls.length - 1];
  const ballCount = event.drawnBalls.length;
  const isAccumulatedEligible = ballCount <= ACCUMULATED_THRESHOLD;

  const totalGlobalSeries = Math.floor(totalGlobalCards / 6);
  const totalRevenue = totalGlobalSeries * event.cardPrice;

  // Lógica de premiação idêntica à do Admin
  const prizes = {
    quadra: totalRevenue * (25 / 300),
    linha: totalRevenue * (60 / 300),
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
    return cardsWithScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.card);
  }, [cards, event.currentPrizeStep, event.drawnBalls]);

  const userSeries = useMemo(() => new Set(cards.map(c => c.serieId)).size, [cards]);

  return (
    <div className="space-y-6">
      <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Layers size={24} /></div>
           <div>
              <h2 className="text-xl font-black text-indigo-900">Meu Jogo</h2>
              <p className="text-xs text-gray-500">{userSeries} séries em sua posse.</p>
           </div>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-bold text-gray-400 uppercase">Saldo Carteira</p>
           <p className="text-sm font-black text-indigo-600">R$ {user.balance.toFixed(2)}</p>
        </div>
      </header>

      <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400 text-yellow-900 rounded-lg"><Banknote size={20} /></div>
                <div>
                   <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest">Prêmios Acumulados por Vendas</p>
                   <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-200 uppercase font-black">Quadra</span>
                        <span className="text-lg font-black text-white">R$ {prizes.quadra.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-200 uppercase font-black">Linha</span>
                        <span className="text-lg font-black text-white">R$ {prizes.linha.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-200 uppercase font-black">Bingo</span>
                        <span className="text-lg font-black text-white">R$ {prizes.bingo.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-yellow-400 uppercase font-black">Acumulado</span>
                        <span className="text-lg font-black text-yellow-400">+R$ {prizes.acumulado.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <div className="flex-1">
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">Status da Rodada</p>
                  <h3 className="text-2xl font-black tracking-tight uppercase">{PRIZE_LABELS[event.currentPrizeStep]}</h3>
                </div>
                <div className="flex flex-col items-end">
                   <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider mb-1 ${isAccumulatedEligible ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                      {isAccumulatedEligible ? 'Acumulado Disponível' : 'Acumulado Expirado'}
                   </span>
                   <span className="text-[10px] text-indigo-200 font-bold">Total Chamadas: {ballCount}</span>
                </div>
             </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
             <p className="text-[10px] font-bold text-indigo-300 uppercase mb-3 tracking-widest">Última Chamada</p>
             <div className="w-24 h-24 bg-white text-indigo-950 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl border-4 border-indigo-500/20">
                {lastBall || '--'}
             </div>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedUserCards.slice(0, 300).map(card => (
          <BingoCard key={card.id} card={card} drawnBalls={event.drawnBalls} />
        ))}
      </section>

      {cards.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <Ticket className="text-slate-200 mx-auto mb-4" size={48} />
          <p className="text-slate-400 font-medium">Você ainda não tem séries para esta rodada.</p>
        </div>
      )}
    </div>
  );
};
