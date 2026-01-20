
import React, { useState, useEffect, useMemo } from 'react';
import { User, Card, BingoEvent, VisualConfig, ChatMessage } from './types';
import { announceBall, announceWinner } from './services/ttsService';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { FinalScoreboard } from './components/FinalScoreboard';
import { LayoutDashboard, Settings, Trophy, LogOut, Layers, ShoppingCart, Phone, Wallet, PlusCircle, ArrowUpCircle } from 'lucide-react';
import { socket } from './services/socket';
import { PRIZE_LABELS } from './constants';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '132435OLI';

const INITIAL_EVENT: BingoEvent = {
  id: 'BINGO_SESSION',
  name: 'Bingo Master',
  cardPrice: 10,
  maxCards: 1000,
  drawnBalls: [],
  status: 'SETUP',
  currentPrizeStep: 'QUADRA',
  winners: [],
  startMode: 'MANUAL',
  autoInterval: 5,
  onlineCount: 0,
  supportWhatsapp: '',
  adConfig: {
    imageUrl: '',
    displayDuration: 10,
    interval: 5,
    isActive: false
  }
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
    const saved = localStorage.getItem('bingo_user_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [visual, setVisual] = useState<VisualConfig>(DEFAULT_VISUAL);
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN' | 'STORE' | 'WALLET'>('USER');
  const [event, setEvent] = useState<BingoEvent>(INITIAL_EVENT);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showFinalScoreboard, setShowFinalScoreboard] = useState(false);
  const [isAdminAutoDrawing, setIsAdminAutoDrawing] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserField, setAdminUserField] = useState('');
  const [adminPassField, setAdminPassField] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [purchaseQty, setPurchaseQty] = useState(1);

  useEffect(() => {
    const onConnect = () => socket.emit('requestSync');
    const handleInitialState = (data: any) => {
      if (data.event) setEvent({ ...INITIAL_EVENT, ...data.event });
      if (data.cards) setAllCards(data.cards);
      if (data.users) setAllUsers(data.users);
      if (data.messages) setChatMessages(data.messages);
      if (data.event?.status === 'FINISHED') setShowFinalScoreboard(true);
    };

    socket.on('connect', onConnect);
    socket.on('initialState', handleInitialState);
    socket.on('eventUpdate', (updated) => setEvent(prev => ({ ...prev, ...updated })));
    socket.on('chatUpdate', (msgs) => setChatMessages(msgs));
    socket.on('cardsUpdate', (cards) => setAllCards(cards));
    socket.on('autoStatusUpdate', (status) => setIsAdminAutoDrawing(status));
    socket.on('usersUpdate', (users) => setAllUsers(users));
    socket.on('ballDrawn', ({ ball, event: updatedEvent }) => {
      setEvent(updatedEvent);
      announceBall(ball);
    });
    socket.on('winnersAnnounced', (winners) => {
      if (winners.length > 0) {
        announceWinner(winners[0].prize, winners[0].userName);
        setAnnouncement(`VITÓRIA! ${winners[0].userName} - ${PRIZE_LABELS[winners[0].prize]}`);
        setTimeout(() => setAnnouncement(''), 5000);
      }
    });
    socket.on('gameStarted', (evt) => { setEvent(evt); setAnnouncement("PARTIDA INICIADA!"); setTimeout(() => setAnnouncement(''), 3000); });
    socket.on('gameReset', (evt) => { setEvent(evt); setAllCards([]); setShowFinalScoreboard(false); });
    socket.on('registrationSuccess', (u) => { setUser(u); localStorage.setItem('bingo_user_session', JSON.stringify(u)); });
    socket.on('loginSuccess', (u) => { setUser(u); localStorage.setItem('bingo_user_session', JSON.stringify(u)); });
    socket.on('balanceUpdate', (bal) => { if (user) { const newUser = { ...user, balance: bal }; setUser(newUser); localStorage.setItem('bingo_user_session', JSON.stringify(newUser)); } });
    socket.on('purchaseSuccess', () => { setAnnouncement("Séries adquiridas!"); setTimeout(() => setAnnouncement(''), 2000); setActiveTab('USER'); });
    socket.on('authError', (err) => alert(err));

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect); socket.off('initialState', handleInitialState);
      socket.off('eventUpdate'); socket.off('chatUpdate'); socket.off('cardsUpdate');
      socket.off('autoStatusUpdate'); socket.off('usersUpdate'); socket.off('ballDrawn');
      socket.off('winnersAnnounced'); socket.off('gameStarted'); socket.off('gameReset');
      socket.off('registrationSuccess'); socket.off('loginSuccess'); socket.off('balanceUpdate');
      socket.off('purchaseSuccess'); socket.off('authError');
    };
  }, [user?.id]);

  const userCards = useMemo(() => allCards.filter(c => c.userId === user?.id), [allCards, user?.id]);
  const userSeriesCount = useMemo(() => new Set(userCards.map(c => c.serieId)).size, [userCards]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-[380px] border-b-8 border-indigo-600 animate-in fade-in zoom-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3"><Trophy size={32} /></div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">Acesse o Bingo</h1>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (authMode === 'REGISTER') socket.emit('registerUser', { name: registerName, whatsapp: loginWhatsapp });
            else socket.emit('loginUser', { whatsapp: loginWhatsapp });
          }} className="space-y-4">
            {authMode === 'REGISTER' && <input type="text" placeholder="Nome Completo" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" required />}
            <input type="tel" placeholder="WhatsApp" value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold" required />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase shadow-xl active:scale-95 transition-all">{authMode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}</button>
            <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-indigo-600 font-black text-xs uppercase pt-2">{authMode === 'LOGIN' ? 'Criar conta' : 'Já tenho conta'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-row overflow-hidden bg-slate-50">
      {announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-950/80 p-4 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl animate-bounce border-b-8 border-indigo-600 max-w-sm">
            <Trophy size={64} className="mx-auto text-indigo-600 mb-6" />
            <p className="text-2xl font-black text-slate-900 uppercase">{announcement}</p>
          </div>
        </div>
      )}

      {/* SIDEBAR COMPLETA RESTAURADA */}
      <nav className="w-20 md:w-24 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 z-40 shrink-0 shadow-sm">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3 mb-4"><Trophy size={24} /></div>
        
        <button onClick={() => setActiveTab('USER')} title="Jogo" className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'USER' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <LayoutDashboard size={28} />
          <span className="text-[9px] font-black uppercase">Jogo</span>
        </button>

        <button onClick={() => setActiveTab('WALLET')} title="Financeiro" className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'WALLET' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <Wallet size={28} />
          <span className="text-[9px] font-black uppercase">Sacar</span>
        </button>

        <button onClick={() => setActiveTab('STORE')} title="Loja" className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'STORE' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <div className="relative">
            <ShoppingCart size={28} />
            {userSeriesCount > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black border-2 border-white">{userSeriesCount}</span>}
          </div>
          <span className="text-[9px] font-black uppercase">Loja</span>
        </button>

        <button onClick={() => setActiveTab('ADMIN')} title="Admin" className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ADMIN' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <Settings size={28} />
          <span className="text-[9px] font-black uppercase">Admin</span>
        </button>

        <div className="flex-1"></div>

        {event.supportWhatsapp && (
          <a href={`https://wa.me/55${event.supportWhatsapp}`} target="_blank" className="flex flex-col items-center gap-1 text-emerald-500 hover:scale-110 transition-all mb-4">
            <Phone size={24} />
            <span className="text-[8px] font-black uppercase">Ajuda</span>
          </a>
        )}

        <button onClick={() => { localStorage.removeItem('bingo_user_session'); setUser(null); }} className="text-rose-400 hover:text-rose-600 mb-4"><LogOut size={24} /></button>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center shrink-0 shadow-sm">
          <h1 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{visual.appName}</h1>
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex flex-col items-end shadow-sm">
              <p className="text-[9px] font-black text-emerald-400 uppercase leading-none">Saldo</p>
              <p className="font-black text-emerald-600 text-lg">R$ {user.balance.toFixed(2)}</p>
            </div>
            {/* BOTÃO ADICIONAR SALDO REINSERIDO */}
            <button onClick={() => setActiveTab('WALLET')} className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all">
              <PlusCircle size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'USER' && (
            <UserDashboard 
              user={user} cards={userCards} 
              event={event} messages={chatMessages} totalGlobalCards={allCards.length}
              onSendMessage={(text) => socket.emit('sendMessage', { userId: user.id, text })}
            />
          )}

          {activeTab === 'WALLET' && (
            <div className="h-full overflow-y-auto p-8 flex flex-col items-center">
              <div className="max-w-md w-full space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border-b-8 border-indigo-600">
                   <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><ArrowUpCircle size={32} /></div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase">Financeiro</h2>
                   <p className="text-slate-400 text-xs font-bold uppercase mb-6">Saldo disponível: R$ {user.balance.toFixed(2)}</p>
                   
                   <div className="grid grid-cols-1 gap-4">
                      <button className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg uppercase active:scale-95 transition-all flex items-center justify-center gap-2">
                         <PlusCircle size={20} /> Depositar via PIX
                      </button>
                      <button className="w-full py-4 bg-slate-100 text-slate-700 font-black rounded-2xl uppercase active:scale-95 transition-all flex items-center justify-center gap-2">
                         <ArrowUpCircle size={20} className="rotate-180" /> Solicitar Saque
                      </button>
                   </div>
                   <p className="mt-6 text-[10px] text-slate-400 font-bold leading-tight uppercase">
                      Ao solicitar saque, seus dados (Nome e Chave PIX) serão enviados para o suporte via WhatsApp.
                   </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'STORE' && (
            <div className="h-full overflow-y-auto p-8 flex flex-col items-center">
              <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl text-center border-b-8 border-indigo-600">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Layers size={40} /></div>
                  <h2 className="text-3xl font-black mb-2 uppercase text-slate-900">Comprar Séries</h2>
                  <div className="flex items-center justify-center gap-8 my-8">
                    <button onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))} className="w-16 h-16 bg-slate-100 rounded-2xl text-3xl font-black">-</button>
                    <span className="text-6xl font-black text-indigo-600">{purchaseQty}</span>
                    <button onClick={() => setPurchaseQty(purchaseQty + 1)} className="w-16 h-16 bg-slate-100 rounded-2xl text-3xl font-black">+</button>
                  </div>
                  <div className="bg-indigo-50 p-6 rounded-[2rem] mb-8">
                      <span className="text-sm font-black text-indigo-900 uppercase">Total: R$ {(purchaseQty * event.cardPrice).toFixed(2)}</span>
                  </div>
                  <button onClick={() => socket.emit('buySeries', { userId: user.id, qty: purchaseQty })} disabled={event.status === 'RUNNING'} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase active:scale-95 disabled:opacity-50 text-lg">
                    Confirmar Compra
                  </button>
              </div>
            </div>
          )}

          {activeTab === 'ADMIN' && (
            <div className="h-full overflow-y-auto p-8">
              {isAdminAuthenticated ? (
                <AdminPanel 
                  event={event} users={allUsers} cards={allCards}
                  onDrawBall={() => socket.emit('adminDrawBall')}
                  onResetEvent={() => socket.emit('adminReset')}
                  onUpdatePrizeStep={(s) => socket.emit('adminUpdateEvent', { currentPrizeStep: s })}
                  isAutoDrawing={isAdminAutoDrawing}
                  onToggleAutoDraw={() => socket.emit('adminToggleAuto', !isAdminAutoDrawing)}
                  onAddSeries={() => {}}
                  onStartGame={() => socket.emit('adminStartGame')}
                  visualConfig={visual} onUpdateVisual={setVisual}
                  onUpdateEvent={(updated) => socket.emit('adminUpdateEvent', updated)}
                />
              ) : (
                <div className="max-w-md mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl mt-12 text-center">
                  <h2 className="text-3xl font-black mb-8 uppercase text-slate-900 tracking-tighter">Acesso Admin</h2>
                  <div className="space-y-4 text-left">
                    <input type="text" placeholder="Usuário Admin" value={adminUserField} onChange={e => setAdminUserField(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
                    <input type="password" placeholder="Senha" value={adminPassField} onChange={e => setAdminPassField(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold" />
                    <button onClick={() => { if (adminUserField === ADMIN_USER && adminPassField === ADMIN_PASS) setIsAdminAuthenticated(true); else alert("Erro!"); }} className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 uppercase text-lg">Entrar</button>
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




