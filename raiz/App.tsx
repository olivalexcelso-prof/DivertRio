
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Card, BingoEvent, VisualConfig, WinnerRecord, ChatMessage } from './types';
import { announceBall, announceWinner, announcePrizes } from './services/ttsService';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { FinalScoreboard } from './components/FinalScoreboard';
import { LayoutDashboard, Settings, Trophy, Wallet, X, Heart, CreditCard, LogOut, ArrowUpCircle, Layers } from 'lucide-react';
import { socket } from './services/socket';
import { PRIZE_LABELS } from './constants';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '132435OLI';

const INITIAL_EVENT: BingoEvent = {
  id: 'GLOBAL_BINGO_SESSION',
  name: 'Grande Bingo Master',
  cardPrice: 10,
  maxCards: 1000,
  drawnBalls: [],
  status: 'SETUP',
  currentPrizeStep: 'QUADRA',
  winners: [],
  startMode: 'AUTO',
  autoInterval: 5,
  dailyStartTime: '08:00',
  dailyEndTime: '23:00',
  onlineCount: 1,
  supportWhatsapp: ''
};

const DEFAULT_VISUAL: VisualConfig = {
  appName: 'Bingo Master',
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showFinalScoreboard, setShowFinalScoreboard] = useState(false);
  const [isAdminAutoDrawing, setIsAdminAutoDrawing] = useState(false);
  const [isAnnouncingStart, setIsAnnouncingStart] = useState(false);
  const [showNearWinEffect, setShowNearWinEffect] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserField, setAdminUserField] = useState('');
  const [adminPassField, setAdminPassField] = useState('');

  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawCpf, setWithdrawCpf] = useState('');
  const [withdrawKey, setWithdrawKey] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);

  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPix, setRegisterPix] = useState('');
  
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [depositAmount, setDepositAmount] = useState<number>(20);

  const playHeartbeat = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const playThump = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, time);
      osc.frequency.exponentialRampToValueAtTime(1, time + 0.15);
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    };
    const now = ctx.currentTime;
    playThump(now);
    playThump(now + 0.15);
  }, []);

  useEffect(() => {
    const cleanupInitialState = socket.on('initialState', (data: { event: BingoEvent, cards: Card[], users: User[], messages: ChatMessage[] }) => {
      setEvent(data.event);
      setAllCards(data.cards);
      setAllUsers(data.users);
      setChatMessages(data.messages || []);
      if (user) {
        const updatedMe = data.users.find(u => u.id === user.id);
        if (updatedMe) {
          setUser(updatedMe);
          localStorage.setItem('bingo_user_session', JSON.stringify(updatedMe));
        }
      }
      if (data.event.status === 'FINISHED') setShowFinalScoreboard(true);
    });

    const cleanupUsersUpdate = socket.on('usersUpdate', (users: User[]) => {
      setAllUsers(users);
      if (user) {
        const updatedMe = users.find(u => u.id === user.id);
        if (updatedMe) setUser(updatedMe);
      }
    });

    // LISTENER PARA SORTEIO DE VENCEDOR
    const cleanupDrawResult = socket.on('drawResult', (winner: User) => {
      setAnnouncement(`SORTEIO REALIZADO! Vencedor: ${winner.name}`);
      setTimeout(() => setAnnouncement(''), 5000);
    });

    const cleanupChat = socket.on('chatUpdate', (messages: ChatMessage[]) => setChatMessages(messages));
    const cleanupBallDrawn = socket.on('ballDrawn', (data: { ball: number, event: BingoEvent }) => {
      setEvent(data.event);
      if (!isAnnouncingStart) announceBall(data.ball);
    });

    const cleanupWinners = socket.on('winnersAnnounced', (winners: WinnerRecord[]) => {
      if (winners && winners.length > 0) {
        announceWinner(winners[0].prize, winners[0].userName);
        setAnnouncement(`VITORIA! ${winners[0].userName} conquistou ${PRIZE_LABELS[winners[0].prize] || 'Prêmio'}!`);
        setTimeout(() => setAnnouncement(''), 7000);
      }
    });

    const cleanupNearWin = socket.on('nearWin', () => {
      setShowNearWinEffect(true);
      playHeartbeat();
      setTimeout(() => setShowNearWinEffect(false), 3000);
    });

    const cleanupCardsUpdate = socket.on('cardsUpdate', (cards: Card[]) => setAllCards(cards));
    const cleanupOnlineCount = socket.on('onlineCountUpdate', (count: number) => setEvent(prev => ({ ...prev, onlineCount: count })));
    
    const cleanupGameStarted = (data: BingoEvent & { gamesLeft?: number }) => {
      setEvent(data);
      setAnnouncement("A PARTIDA VAI COMEÇAR!");
      setIsAnnouncingStart(true);
      const revenue = (allCards.length / 6) * data.cardPrice;
      announcePrizes(revenue, data.gamesLeft, () => {
        setIsAnnouncingStart(false);
        setAnnouncement("");
      });
    };
    const cleanupGameStartedHandler = socket.on('gameStarted', cleanupGameStarted);
    const cleanupAutoStatus = socket.on('autoStatusUpdate', (status: boolean) => setIsAdminAutoDrawing(status));
    
    const cleanupGameReset = socket.on('gameReset', (evt: BingoEvent) => {
      setEvent(evt);
      setAllCards([]);
      setChatMessages([]);
      setShowFinalScoreboard(false);
      setIsAnnouncingStart(false);
      setAnnouncement("Partida reiniciada.");
      setTimeout(() => setAnnouncement(''), 2000);
    });

    const cleanupRegistration = socket.on('registrationSuccess', (u: User) => {
      setUser(u);
      localStorage.setItem('bingo_user_session', JSON.stringify(u));
    });

    const cleanupBalance = socket.on('balanceUpdate', (balance: number) => {
      setUser(prev => prev ? ({ ...prev, balance }) : null);
    });

    const cleanupError = socket.on('authError', (err: string) => {
      setAnnouncement(err);
      setTimeout(() => setAnnouncement(''), 3000);
    });

    return () => {
      socket.off('initialState'); socket.off('usersUpdate'); socket.off('drawResult');
      socket.off('chatUpdate'); socket.off('ballDrawn'); socket.off('winnersAnnounced');
      socket.off('nearWin'); socket.off('cardsUpdate'); socket.off('onlineCountUpdate');
      socket.off('gameStarted'); socket.off('autoStatusUpdate'); socket.off('gameReset');
      socket.off('registrationSuccess'); socket.off('balanceUpdate'); socket.off('authError');
    };
  }, [allCards.length, isAnnouncingStart, user?.id, playHeartbeat]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    socket.emit('registerUser', { name: registerName, whatsapp: loginWhatsapp, password: loginPassword, pixKey: registerPix });
  };

  const handleAdminLogin = () => {
    if (adminUserField === ADMIN_USER && adminPassField === ADMIN_PASS) { setIsAdminAuthenticated(true); }
    else { alert("Credenciais Administrativas Incorretas."); }
  };

  const handlePurchase = () => {
    if (user && (event.status === 'SETUP' || event.status === 'FINISHED')) socket.emit('buySeries', { userId: user.id, qty: purchaseQty });
  };

  const handleSendMessage = (text: string) => {
    if (user) socket.emit('sendMessage', { userId: user.id, text });
  };

  const handleLogout = () => { localStorage.removeItem('bingo_user_session'); setUser(null); };

  const userSeriesCount = useMemo(() => {
    if (!user) return 0;
    const myCards = allCards.filter(c => c.userId === user.id);
    return new Set(myCards.map(c => c.serieId)).size;
  }, [allCards, user]);

  if (!user) {
    const loginStyle = visual.loginBackgroundUrl ? { backgroundImage: `url(${visual.loginBackgroundUrl})`, backgroundSize: 'cover' } : { backgroundColor: '#020617' };
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={loginStyle}>
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl w-full max-w-[320px] border-b-[6px] border-indigo-600">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl rotate-3">
              {visual.logoUrl ? <img src={visual.logoUrl} alt="Logo" className="w-10 h-10 object-contain" /> : <Trophy size={28} />}
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">{visual.appName}</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === 'REGISTER' && (
              <div className="space-y-0.5">
                <label className="text-[8px] font-black uppercase text-slate-400 ml-3">Nome Completo</label>
                <input type="text" placeholder="Seu Nome" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" required />
              </div>
            )}
            <div className="space-y-0.5">
              <label className="text-[8px] font-black uppercase text-slate-400 ml-3">WhatsApp</label>
              <input type="tel" placeholder="11999999999" value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" required />
            </div>
            <div className="space-y-0.5">
              <label className="text-[8px] font-black uppercase text-slate-400 ml-3">Senha</label>
              <input type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" required />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl text-xs active:scale-95 mt-2 uppercase">{authMode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</button>
            <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-indigo-600 font-black text-[9px] uppercase">{authMode === 'LOGIN' ? 'Não tem conta? Clique aqui' : 'Já tem conta? Faça Login'}</button>
          </form>
        </div>
      </div>
    );
  }

  const userCards = allCards.filter(c => c.userId === user.id);

  return (
    <div className="h-screen flex flex-row overflow-hidden" style={{ backgroundColor: visual.backgroundColor }}>
      {showNearWinEffect && (
        <div className="fixed inset-0 z-[150] pointer-events-none flex items-center justify-center bg-red-500/10">
           <Heart className="text-red-600 animate-ping opacity-50" size={160} fill="currentColor" />
        </div>
      )}

      {announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-950/60 backdrop-blur-md p-4">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl animate-in zoom-in border-b-8 border-indigo-600 max-w-sm">
            <Trophy size={48} className="mx-auto text-indigo-600 mb-4 animate-bounce" />
            <p className="text-xl font-black text-slate-900 leading-tight">{announcement}</p>
          </div>
        </div>
      )}

      <nav className="w-16 md:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-40 shadow-sm shrink-0">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-2 shadow-lg rotate-3">
          {visual.logoUrl ? <img src={visual.logoUrl} className="w-6 h-6 object-contain" /> : <Trophy size={20} />}
        </div>

        <button onClick={() => setActiveTab('USER')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'USER' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`p-2.5 rounded-xl ${activeTab === 'USER' ? 'bg-indigo-50 border border-indigo-100' : ''}`}><LayoutDashboard size={24} /></div>
          <span className="text-[7px] font-black uppercase text-center leading-none">Jogo</span>
        </button>

        <div className="flex flex-col items-center gap-1 text-indigo-900">
           <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 relative">
             <Layers size={24} />
             {userSeriesCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-black shadow-sm">
                  {userSeriesCount}
                </div>
             )}
           </div>
           <span className="text-[7px] font-black uppercase text-center leading-none">Minhas<br/>Séries</span>
        </div>
        
        <button onClick={() => setActiveTab('STORE')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'STORE' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`p-2.5 rounded-xl ${activeTab === 'STORE' ? 'bg-indigo-50 border border-indigo-100' : ''}`}><Wallet size={24} /></div>
          <span className="text-[7px] font-black uppercase text-center leading-none">Loja</span>
        </button>

        <button 
          onClick={() => setIsWithdrawalOpen(true)}
          className="flex flex-col items-center gap-1 text-emerald-600 hover:scale-110 transition-all mt-2"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm"><ArrowUpCircle size={24} /></div>
          <span className="text-[7px] font-black uppercase text-center leading-none">Sacar</span>
        </button>
        
        <button onClick={() => setActiveTab('ADMIN')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ADMIN' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`p-2.5 rounded-xl ${activeTab === 'ADMIN' ? 'bg-indigo-50 border border-indigo-100' : ''}`}><Settings size={24} /></div>
          <span className="text-[7px] font-black uppercase text-center leading-none">Admin</span>
        </button>

        <div className="flex-1"></div>
        
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-rose-400 hover:scale-110 transition-all mb-4">
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100"><LogOut size={24} /></div>
          <span className="text-[7px] font-black uppercase text-center leading-none">Sair</span>
        </button>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center z-30 shrink-0">
          <h1 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{visual.appName}</h1>
          <div className="bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[7px] font-black text-indigo-400 uppercase leading-none">Saldo</p>
                <p className="font-black text-indigo-600 text-[10px]">R$ {user.balance.toFixed(2)}</p>
              </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'USER' && (
            <UserDashboard 
              user={user} cards={userCards} event={event} messages={chatMessages}
              totalGlobalCards={allCards.length} 
              onSendMessage={handleSendMessage}
            />
          )}
          
          {activeTab === 'ADMIN' && (
            <div className="h-full overflow-y-auto p-4 md:p-8">
              {isAdminAuthenticated ? (
                <AdminPanel 
                  event={event} users={allUsers} cards={allCards}
                  onDrawBall={() => socket.emit('requestDraw')} // TAREFA: Apenas emite evento central
                  onResetEvent={() => socket.emit('adminReset')}
                  onUpdatePrizeStep={(s) => socket.emit('adminUpdatePrize', s)}
                  isAutoDrawing={isAdminAutoDrawing}
                  onToggleAutoDraw={() => socket.emit('adminToggleAuto', !isAdminAutoDrawing)}
                  onAddSeries={() => {}}
                  onStartGame={() => socket.emit('adminStartGame')}
                  visualConfig={visual} onUpdateVisual={setVisual}
                  onUpdateEvent={(evt) => socket.emit('adminUpdateEvent', evt)}
                />
              ) : (
                <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 mt-10 text-center">
                  <h2 className="text-2xl font-black mb-6 uppercase">Admin</h2>
                  <div className="space-y-4 text-left">
                    <input type="text" placeholder="Usuário" value={adminUserField} onChange={e => setAdminUserField(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                    <input type="password" placeholder="Senha" value={adminPassField} onChange={e => setAdminPassField(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                    <button onClick={handleAdminLogin} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 uppercase">Acessar Painel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showFinalScoreboard && <FinalScoreboard event={event} onClose={() => setShowFinalScoreboard(false)} onReset={() => socket.emit('adminReset')} />}
    </div>
  );
};

export default App;
