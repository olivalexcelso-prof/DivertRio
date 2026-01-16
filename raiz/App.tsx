
import React, { useState, useEffect, useCallback } from 'react';
import { User, Card, BingoEvent, VisualConfig } from './types';
import { generateFullSeriesForUser, formatPackageId, checkWinners } from './services/bingoService';
import { announceBall, announceWinner, announcePrizes } from './services/ttsService';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { FinalScoreboard } from './components/FinalScoreboard';
import { LayoutDashboard, Settings, Trophy, ShoppingBag, Minus, Plus, Wallet, ArrowRight, PlusCircle } from 'lucide-react';
import { db } from './services/firebaseService';
import { PRIZE_LABELS } from './constants';

const EVENT_ID = 'main-event';
const VISUAL_ID = 'config-visual';
const PACKAGE_ID = formatPackageId(1);
const MIN_DEPOSIT = 30;

const DEFAULT_VISUAL: VisualConfig = {
  appName: 'Bingo Beneficente',
  primaryColor: '#4f46e5',
  cardColor: '#00FF00',
  accentColor: '#fbbf24',
  backgroundColor: '#f8fafc',
  updatedAt: Date.now()
};

const INITIAL_EVENT: BingoEvent = {
  id: EVENT_ID,
  name: 'Grande Bingo Beneficente',
  cardPrice: 10,
  maxCards: 1000,
  drawnBalls: [],
  status: 'SETUP',
  currentPrizeStep: 'QUADRA',
  winners: [],
  startMode: 'MANUAL',
  autoInterval: 5
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bingo_user_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [visual, setVisual] = useState<VisualConfig>(DEFAULT_VISUAL);
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN' | 'STORE'>('USER');
  const [isAutoDrawing, setIsAutoDrawing] = useState(false);
  const [event, setEvent] = useState<BingoEvent>(INITIAL_EVENT);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showFinalScoreboard, setShowFinalScoreboard] = useState(false);
  
  const [step, setStep] = useState<'LOGIN' | 'PIX'>('LOGIN');
  const [loginName, setLoginName] = useState('');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [depositAmount, setDepositAmount] = useState(30);

  useEffect(() => {
    const unsubVisual = db.onSnapshot('config_visual', VISUAL_ID, (data) => {
      if (data) {
        setVisual(data);
        document.documentElement.style.setProperty('--primary-color', data.primaryColor);
        document.documentElement.style.setProperty('--card-color', data.cardColor);
      } else {
        db.set('config_visual', VISUAL_ID, DEFAULT_VISUAL);
      }
    });

    const unsubEvent = db.onSnapshot('estado_bingo', EVENT_ID, (data) => {
      if (data) setEvent(data);
    });

    const unsubCards = db.onSnapshotCollection('cartelas', (cards) => {
      setAllCards(cards as Card[]);
    });

    if (user) {
      const unsubUser = db.onSnapshot('users', user.id, (data) => {
        if (data) {
          setUser(data);
          localStorage.setItem('bingo_user_session', JSON.stringify(data));
        }
      });
      return () => { unsubVisual(); unsubEvent(); unsubCards(); unsubUser(); };
    }
    return () => { unsubVisual(); unsubEvent(); unsubCards(); };
  }, [user?.id]);

  useEffect(() => {
    if (event.status === 'SETUP' && event.startMode === 'AUTO' && event.nextAutoStart) {
      const timer = setInterval(() => {
        if (Date.now() >= event.nextAutoStart! && allCards.length > 0) {
          handleStartGame();
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [event.status, event.startMode, event.nextAutoStart, allCards.length]);

  const handleDepositPix = async () => {
    if (!user) return;
    setAnnouncement(`Confirmando depósito de R$ ${depositAmount}...`);
    setTimeout(async () => {
      await db.set('users', user.id, { ...user, balance: user.balance + depositAmount });
      setAnnouncement(`Depósito confirmado!`);
      setTimeout(() => setAnnouncement(''), 1500);
    }, 1500);
  };

  const handleBuySeries = async () => {
    if (!user || event.status !== 'SETUP') return;
    const totalCost = purchaseQty * event.cardPrice;
    if (user.balance < totalCost) {
      setAnnouncement("Saldo insuficiente.");
      return;
    }
    
    setAnnouncement("Processando compra...");
    
    // Pequeno delay para garantir que a UI renderize a mensagem antes do loop de processamento
    setTimeout(async () => {
      try {
        const allSeries = await db.getAll('series');
        let currentSeriesIdx = allSeries.length;
        const batch = db.batch();
        
        batch.update('users', user.id, { balance: user.balance - totalCost });
        
        for (let i = 0; i < purchaseQty; i++) {
          currentSeriesIdx++;
          const { series, cards } = generateFullSeriesForUser(user.id, currentSeriesIdx, PACKAGE_ID);
          batch.set('series', series.id, series);
          cards.forEach(card => batch.set('cartelas', card.id, card));
        }
        
        await batch.commit();
        setAnnouncement(`Sucesso! ${purchaseQty} séries adquiridas.`);
        setPurchaseQty(1);
        setTimeout(() => {
          setAnnouncement('');
          setActiveTab('USER');
        }, 1500);
      } catch (e) {
        setAnnouncement("Erro ao processar compra.");
        setTimeout(() => setAnnouncement(''), 3000);
      }
    }, 100);
  };

  const handleResetEvent = useCallback(async () => {
    setIsAutoDrawing(false);
    setShowFinalScoreboard(false);
    const nextStart = event.startMode === 'AUTO' ? Date.now() + (event.autoInterval * 60 * 1000) : undefined;
    await db.clearCollection('cartelas');
    await db.clearCollection('series');
    await db.set('estado_bingo', EVENT_ID, { 
      ...INITIAL_EVENT, 
      startMode: event.startMode, 
      autoInterval: event.autoInterval, 
      cardPrice: event.cardPrice,
      nextAutoStart: nextStart
    });
  }, [event.startMode, event.autoInterval, event.cardPrice]);

  const handleStartGame = useCallback(async () => {
    if (allCards.length === 0) return;
    const totalSeries = Math.floor(allCards.length / 6);
    announcePrizes(totalSeries * event.cardPrice);
    await db.set('estado_bingo', EVENT_ID, { ...event, status: 'RUNNING', nextAutoStart: undefined });
  }, [allCards.length, event]);

  const handleDrawBall = useCallback(async () => {
    if (event.status !== 'RUNNING' || !user) return;
    const available = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !event.drawnBalls.includes(n));
    if (available.length === 0) return;
    
    const nextBall = available[Math.floor(Math.random() * available.length)];
    const newDrawn = [...event.drawnBalls, nextBall];
    announceBall(nextBall);
    
    const winners = checkWinners(allCards, newDrawn, event.currentPrizeStep);
    const batch = db.batch();
    
    allCards.forEach(c => {
      if (c.numbers.includes(nextBall)) {
        batch.update('cartelas', c.id, { markedNumbers: [...c.markedNumbers, nextBall] });
      }
    });

    const eventUpdates: any = { ...event, drawnBalls: newDrawn };
    if (winners.length > 0) {
      const win = winners[0];
      const winningCard = allCards.find(c => c.id === win.cardId);
      const winnerUser = await db.get('users', winningCard?.userId || '');
      const winnerName = winnerUser?.name || 'Ganhador';
      announceWinner(win.prize, winnerName);
      eventUpdates.winners = [...(event.winners || []), { ...win, userName: winnerName, timestamp: Date.now(), ballCount: newDrawn.length }];
      
      if (win.prize === 'QUADRA') {
        eventUpdates.currentPrizeStep = 'QUINA';
      } else if (win.prize === 'QUINA') {
        eventUpdates.currentPrizeStep = 'BINGO';
      } else { 
        // Partida Encerrada
        eventUpdates.status = 'FINISHED'; 
        setIsAutoDrawing(false);
        setShowFinalScoreboard(true);

        // CORREÇÃO OBRIGATÓRIA: Lógica de Crédito do Operador
        // Somar todas as premiações ganhas na partida e creditar o valor total no saldo.
        const totalSeries = Math.floor(allCards.length / 6);
        const totalRevenue = totalSeries * event.cardPrice;
        
        // Relação de valores conforme exemplo (Quadra: 25/300, Linha: 60/300, Bingo: 150/300)
        const vQuadra = totalRevenue * (25 / 300);
        const vLinha = totalRevenue * (60 / 300);
        const vBingo = totalRevenue * (150 / 300);
        
        const valorTotalGanho = vQuadra + vLinha + vBingo;
        
        if (valorTotalGanho > 0) {
          batch.update('users', user.id, { balance: user.balance + valorTotalGanho });
        }
      }
      setAnnouncement(`VITÓRIA! ${winnerName} conquistou ${PRIZE_LABELS[win.prize]}!`);
      setTimeout(() => setAnnouncement(''), 3000);
    }
    batch.set('estado_bingo', EVENT_ID, eventUpdates);
    await batch.commit();
  }, [event, allCards, user]);

  useEffect(() => {
    let interval: any;
    if (isAutoDrawing && !announcement && event.status === 'RUNNING') {
      interval = setInterval(handleDrawBall, 4000);
    }
    return () => clearInterval(interval);
  }, [isAutoDrawing, announcement, event.status, handleDrawBall]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f172a]">
        <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl">
          <div className="text-center mb-8">
            <Trophy size={48} className="mx-auto mb-4" style={{ color: visual.primaryColor }} />
            <h1 className="text-3xl font-black text-slate-900">{visual.appName}</h1>
          </div>
          {step === 'LOGIN' ? (
            <form onSubmit={(e) => { e.preventDefault(); setStep('PIX'); }} className="space-y-4">
              <input type="text" required value={loginName} onChange={e => setLoginName(e.target.value)} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 outline-none" placeholder="Nome" />
              <input type="tel" required value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 outline-none" placeholder="WhatsApp" />
              <button type="submit" className="w-full py-4 rounded-2xl font-black text-white shadow-xl" style={{ backgroundColor: visual.primaryColor }}>Próximo</button>
            </form>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const newUser: User = { id: crypto.randomUUID(), name: loginName, whatsapp: loginWhatsapp, pixKey, balance: 0, createdAt: Date.now() };
              await db.set('users', newUser.id, newUser);
              setUser(newUser);
            }} className="space-y-4">
              <input type="text" required value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 outline-none" placeholder="Chave PIX" />
              <button type="submit" className="w-full py-4 rounded-2xl font-black text-white shadow-xl" style={{ backgroundColor: visual.primaryColor }}>Entrar</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: visual.backgroundColor }}>
      {announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-xl font-black text-slate-900 mb-6">{announcement}</h2>
            {announcement.includes('Sucesso') || announcement.includes('insuficiente') ? (
              <button onClick={() => setAnnouncement('')} className="w-full py-4 text-white rounded-2xl font-bold" style={{ backgroundColor: visual.primaryColor }}>Fechar</button>
            ) : null}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Trophy style={{ color: visual.primaryColor }} size={24} />
             <span className="text-xl font-black text-slate-900">{visual.appName}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Saldo</p>
                <p className="text-lg font-black text-slate-900">R$ {user.balance.toFixed(2)}</p>
             </div>
             <button onClick={() => setActiveTab('STORE')} className="p-2 bg-slate-50 text-slate-600 rounded-xl"><PlusCircle size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'USER' ? (
          <UserDashboard user={user} cards={allCards.filter(c => c.userId === user.id)} event={event} totalGlobalCards={allCards.length} />
        ) : activeTab === 'STORE' ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-8 flex items-center gap-2"><Wallet size={20} style={{ color: visual.primaryColor }} /> Adicionar Saldo</h3>
                <div className="bg-slate-50 p-6 rounded-2xl mb-6 flex items-center justify-between">
                  <button onClick={() => setDepositAmount(Math.max(MIN_DEPOSIT, depositAmount - 10))} className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center"><Minus size={20} /></button>
                  <span className="text-3xl font-black">R$ {depositAmount}</span>
                  <button onClick={() => setDepositAmount(depositAmount + 10)} className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center"><Plus size={20} /></button>
                </div>
                <button onClick={handleDepositPix} className="w-full text-white py-5 rounded-2xl font-black shadow-xl" style={{ backgroundColor: visual.primaryColor }}>Pagar via PIX</button>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-8 flex items-center gap-2"><ShoppingBag size={20} style={{ color: visual.primaryColor }} /> Comprar Séries</h3>
                <div className="bg-slate-50 p-6 rounded-2xl mb-6 flex items-center justify-between">
                  <button onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))} className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center"><Minus size={20} /></button>
                  <span className="text-3xl font-black">{purchaseQty}</span>
                  <button onClick={() => setPurchaseQty(purchaseQty + 1)} className="w-12 h-12 bg-white rounded-xl shadow-sm border flex items-center justify-center"><Plus size={20} /></button>
                </div>
                <button onClick={handleBuySeries} disabled={event.status !== 'SETUP'} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl disabled:opacity-50">
                  Pagar R$ {(purchaseQty * event.cardPrice).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <AdminPanel 
            event={event} 
            users={[user]} 
            cards={allCards} 
            onDrawBall={handleDrawBall} 
            onResetEvent={handleResetEvent} 
            onUpdatePrizeStep={(s) => db.set('estado_bingo', EVENT_ID, { ...event, currentPrizeStep: s })} 
            isAutoDrawing={isAutoDrawing} 
            onToggleAutoDraw={() => setIsAutoDrawing(!isAutoDrawing)} 
            onAddSeries={() => {}} 
            onStartGame={handleStartGame} 
            visualConfig={visual} 
            onUpdateVisual={(v) => db.set('config_visual', VISUAL_ID, v)}
            onUpdateEvent={(e) => db.set('estado_bingo', EVENT_ID, e)}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-5 z-40">
        <div className="max-w-md mx-auto flex justify-around">
          <button onClick={() => setActiveTab('USER')} className={`flex flex-col items-center gap-1 ${activeTab === 'USER' ? '' : 'text-slate-300'}`} style={{ color: activeTab === 'USER' ? visual.primaryColor : undefined }}>
            <LayoutDashboard size={24} /><span className="text-[10px] font-black uppercase">Meu Jogo</span>
          </button>
          <button onClick={() => setActiveTab('STORE')} className={`flex flex-col items-center gap-1 ${activeTab === 'STORE' ? '' : 'text-slate-300'}`} style={{ color: activeTab === 'STORE' ? visual.primaryColor : undefined }}>
            <Wallet size={24} /><span className="text-[10px] font-black uppercase">Loja</span>
          </button>
          <button onClick={() => setActiveTab('ADMIN')} className={`flex flex-col items-center gap-1 ${activeTab === 'ADMIN' ? '' : 'text-slate-300'}`} style={{ color: activeTab === 'ADMIN' ? visual.primaryColor : undefined }}>
            <Settings size={24} /><span className="text-[10px] font-black uppercase text-center">Painel</span>
          </button>
        </div>
      </nav>
      {showFinalScoreboard && <FinalScoreboard event={event} onClose={() => setShowFinalScoreboard(false)} onReset={handleResetEvent} />}
    </div>
  );
};

export default App;
