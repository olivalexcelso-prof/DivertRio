
import React, { useState, useEffect } from 'react';
import { User, Card, BingoEvent, VisualConfig, WinnerRecord } from './types';
import { announceBall, announceWinner } from './services/ttsService';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { FinalScoreboard } from './components/FinalScoreboard';
import { LayoutDashboard, Settings, Trophy, ShoppingBag, ArrowRight, ShoppingCart, Lock } from 'lucide-react';
import { socket } from './services/socket';
import { PRIZE_LABELS } from './constants';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '132435OLI';

const INITIAL_EVENT: BingoEvent = {
  id: 'GLOBAL_BINGO_SESSION',
  name: 'Grande Bingo Beneficente',
  cardPrice: 10,
  maxCards: 1000,
  drawnBalls: [],
  status: 'SETUP',
  currentPrizeStep: 'QUADRA',
  winners: [],
  startMode: 'MANUAL',
  autoInterval: 5,
  onlineCount: 1
};

const DEFAULT_VISUAL: VisualConfig = {
  appName: 'Bingo Beneficente',
  primaryColor: '#4f46e5',
  cardColor: '#00FF00',
  accentColor: '#fbbf24',
  backgroundColor: '#f8fafc',
  updatedAt: Date.now()
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('bingo_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [visual, setVisual] = useState<VisualConfig>(DEFAULT_VISUAL);
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN' | 'STORE'>('USER');
  const [event, setEvent] = useState<BingoEvent>(INITIAL_EVENT);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showFinalScoreboard, setShowFinalScoreboard] = useState(false);
  const [isAdminAutoDrawing, setIsAdminAutoDrawing] = useState(false);
  
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPix, setRegisterPix] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserField, setAdminUserField] = useState('');
  const [adminPassField, setAdminPassField] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);

  useEffect(() => {
    socket.on('initialState', (data: { event: BingoEvent, cards: Card[], users: User[] }) => {
      setEvent(data.event);
      setAllCards(data.cards);
      setAllUsers(data.users);
      if (data.event.status === 'FINISHED') setShowFinalScoreboard(true);
    });

    socket.on('ballDrawn', (data: { ball: number, event: BingoEvent }) => {
      announceBall(data.ball);
      setEvent(data.event);
    });

    socket.on('winnersAnnounced', (winners: WinnerRecord[]) => {
      if (winners && winners.length > 0) {
        announceWinner(event.currentPrizeStep, winners[0].userName);
        setAnnouncement(`VITÓRIA! ${winners[0].userName} conquistou ${PRIZE_LABELS[event.currentPrizeStep] || 'Prêmio'}!`);
        setTimeout(() => setAnnouncement(''), 3000);
      }
    });

    socket.on('usersUpdate', (users: User[]) => setAllUsers(users));
    socket.on('cardsUpdate', (cards: Card[]) => setAllCards(cards));
    socket.on('onlineCountUpdate', (count: number) => setEvent(prev => ({ ...prev, onlineCount: count })));
    socket.on('gameStarted', (evt: BingoEvent) => setEvent(evt));
    socket.on('autoStatusUpdate', (status: boolean) => setIsAdminAutoDrawing(status));
    
    socket.on('gameReset', (evt: BingoEvent) => {
      setEvent(evt);
      setAllCards([]);
      setShowFinalScoreboard(false);
    });

    socket.on('registrationSuccess', (u: User) => {
      setUser(u);
      localStorage.setItem('bingo_user_session', JSON.stringify(u));
    });

    socket.on('loginSuccess', (u: User) => {
      setUser(u);
      localStorage.setItem('bingo_user_session', JSON.stringify(u));
    });

    socket.on('balanceUpdate', (balance: number) => {
      setUser(prev => prev ? ({ ...prev, balance }) : null);
    });

    socket.on('purchaseSuccess', () => setAnnouncement("Séries adquiridas!"));
    socket.on('authError', (err: string) => alert(err));
  }, [event.currentPrizeStep]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'REGISTER') {
      socket.emit('registerUser', { name: registerName, whatsapp: loginWhatsapp, password: loginPassword, pixKey: registerPix });
    } else {
      socket.emit('loginUser', { whatsapp: loginWhatsapp, password: loginPassword });
    }
  };

  const handlePurchase = () => {
    if (user && event.status === 'SETUP') {
      socket.emit('buySeries', { userId: user.id, qty: purchaseQty });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bingo_user_session');
    setUser(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm">
          <div className="text-center mb-8">
            <Trophy size={48} className="mx-auto mb-4 text-indigo-600" />
            <h1 className="text-3xl font-black text-slate-900">{visual.appName}</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'REGISTER' && (
              <input type="text" placeholder="Seu Nome" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none" required />
            )}
            <input type="tel" placeholder="WhatsApp" value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none" required />
            <input type="password" placeholder="Senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none" required />
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">{authMode === 'LOGIN' ? 'Acessar' : 'Criar Conta'}</button>
            <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-indigo-600 font-bold text-sm">
              {authMode === 'LOGIN' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const userCards = allCards.filter(c => c.userId === user.id);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" style={{ backgroundColor: visual.backgroundColor }}>
      {announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-[2rem] text-center font-black shadow-2xl animate-in zoom-in duration-300">
            {announcement}
          </div>
        </div>
      )}

      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Trophy className="text-indigo-600" size={24} />
          <div>
            <h1 className="text-xl font-black">{visual.appName}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{event.onlineCount || 1} online</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Saldo</p>
          <p className="font-black text-indigo-600 text-lg leading-none">R$ {user.balance.toFixed(2)}</p>
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {activeTab === 'USER' && <UserDashboard user={user} cards={userCards} event={event} totalGlobalCards={allCards.length} />}
        
        {activeTab === 'ADMIN' && (
          isAdminAuthenticated ? (
            <AdminPanel 
              event={event} users={allUsers} cards={allCards}
              onDrawBall={() => socket.emit('adminDrawBall')}
              onResetEvent={() => socket.emit('adminReset')}
              onUpdatePrizeStep={(s) => socket.emit('adminUpdatePrize', s)}
              isAutoDrawing={isAdminAutoDrawing}
              onToggleAutoDraw={() => socket.emit('adminToggleAuto', !isAdminAutoDrawing)}
              onAddSeries={() => {}}
              onStartGame={() => socket.emit('adminStartGame')}
              visualConfig={visual}
              onUpdateVisual={setVisual}
              onUpdateEvent={() => {}}
            />
          ) : (
            <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-xl border mt-10">
              <div className="text-center mb-6">
                 <Lock size={40} className="mx-auto text-slate-300 mb-2" />
                 <h2 className="text-2xl font-black">Acesso Admin</h2>
              </div>
              <input type="text" placeholder="Operador" value={adminUserField} onChange={e => setAdminUserField(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl mb-4 outline-none" />
              <input type="password" placeholder="Senha" value={adminPassField} onChange={e => setAdminPassField(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl mb-4 outline-none" />
              <button onClick={() => { if(adminUserField === ADMIN_USER && adminPassField === ADMIN_PASS) setIsAdminAuthenticated(true) }} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl">Entrar no Painel</button>
            </div>
          )
        )}

        {activeTab === 'STORE' && (
          <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] shadow-xl text-center border mt-10">
            <ShoppingBag size={48} className="mx-auto text-indigo-600 mb-4" />
            <h2 className="text-2xl font-black mb-8">Loja de Séries</h2>
            <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl mb-8 border">
              <button onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))} className="w-12 h-12 bg-white rounded-xl shadow font-black">-</button>
              <div className="flex flex-col">
                <span className="text-4xl font-black">{purchaseQty}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">Séries</span>
              </div>
              <button onClick={() => setPurchaseQty(purchaseQty + 1)} className="w-12 h-12 bg-white rounded-xl shadow font-black">+</button>
            </div>
            <button onClick={handlePurchase} disabled={event.status !== 'SETUP'} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl disabled:opacity-50">
               Pagar R$ {(purchaseQty * event.cardPrice).toFixed(2)}
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-xl h-20 rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 z-40 border border-slate-200/50">
        <button onClick={() => setActiveTab('USER')} className={`flex flex-col items-center ${activeTab === 'USER' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={24} />
          <span className="text-[9px] font-black uppercase">Meu Jogo</span>
        </button>
        <button onClick={() => setActiveTab('STORE')} className={`flex flex-col items-center ${activeTab === 'STORE' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <ShoppingCart size={24} />
          <span className="text-[9px] font-black uppercase">Loja</span>
        </button>
        <button onClick={() => setActiveTab('ADMIN')} className={`flex flex-col items-center ${activeTab === 'ADMIN' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Settings size={24} />
          <span className="text-[9px] font-black uppercase">Painel</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center text-slate-400">
          <ArrowRight size={24} />
          <span className="text-[9px] font-black uppercase">Sair</span>
        </button>
      </nav>

      {showFinalScoreboard && (
        <FinalScoreboard event={event} onClose={() => setShowFinalScoreboard(false)} />
      )}
    </div>
  );
};

export default App;
