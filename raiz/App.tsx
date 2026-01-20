
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Card, BingoEvent, VisualConfig, WinnerRecord, ChatMessage } from './types';
import { announceBall, announceWinner, announcePrizes } from './services/ttsService';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { FinalScoreboard } from './components/FinalScoreboard';
import { LayoutDashboard, Settings, Trophy, Wallet, X, Heart, CreditCard, LogOut, ArrowUpCircle, Layers, ShoppingCart, Info, Phone } from 'lucide-react';
import { socket } from './services/socket';
import { PRIZE_LABELS } from './constants';

const ADMIN_USER = 'admin';
const ADMIN_PASS = '132435OLI';

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
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN' | 'STORE'>('USER');
  const [event, setEvent] = useState<BingoEvent | null>(null);
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
  const [registerPix, setRegisterPix] = useState('');
  
  const [purchaseQty, setPurchaseQty] = useState(1);

  useEffect(() => {
    // Pedir sincronização caso a conexão já tenha ocorrido antes do mount
    socket.emit('requestSync');

    socket.on('initialState', (data) => {
      setEvent(data.event);
      setAllCards(data.cards);
      setAllUsers(data.users);
      setChatMessages(data.messages);
      if (data.event.status === 'FINISHED') setShowFinalScoreboard(true);
      else setShowFinalScoreboard(false);
    });

    socket.on('eventUpdate', (updatedEvent) => setEvent(updatedEvent));
    socket.on('chatUpdate', (msgs) => setChatMessages(msgs));
    socket.on('cardsUpdate', (cards) => setAllCards(cards));
    socket.on('autoStatusUpdate', (status) => setIsAdminAutoDrawing(status));
    
    socket.on('usersUpdate', (users) => {
      setAllUsers(users);
      if (user) {
        const me = users.find(u => u.id === user.id);
        if (me) setUser(me);
      }
    });
    
    socket.on('ballDrawn', ({ ball, event }) => {
      setEvent(event);
      announceBall(ball);
    });

    socket.on('winnersAnnounced', (winners) => {
      if (winners.length > 0) {
        announceWinner(winners[0].prize, winners[0].userName);
        setAnnouncement(`VITORIA! ${winners[0].userName} - ${PRIZE_LABELS[winners[0].prize]}`);
        setTimeout(() => setAnnouncement(''), 5000);
      }
    });

    socket.on('gameStarted', (evt) => {
      setEvent(evt);
      setAnnouncement("A PARTIDA COMEÇOU!");
      setTimeout(() => setAnnouncement(''), 3000);
    });

    socket.on('gameReset', (evt) => {
      setEvent(evt);
      setAllCards([]);
      setShowFinalScoreboard(false);
    });

    socket.on('registrationSuccess', (u) => {
      setUser(u);
      localStorage.setItem('bingo_user_session', JSON.stringify(u));
    });
    
    socket.on('loginSuccess', (u) => {
      setUser(u);
      localStorage.setItem('bingo_user_session', JSON.stringify(u));
    });

    socket.on('balanceUpdate', (bal) => setUser(prev => prev ? {...prev, balance: bal} : null));
    
    socket.on('purchaseSuccess', () => {
      setAnnouncement("Séries adquiridas com sucesso!");
      setTimeout(() => setAnnouncement(''), 3000);
      setActiveTab('USER');
    });

    socket.on('authError', (err) => alert(err));

    return () => {
      socket.off('initialState'); socket.off('eventUpdate'); socket.off('chatUpdate');
      socket.off('usersUpdate'); socket.off('ballDrawn'); socket.off('winnersAnnounced');
      socket.off('cardsUpdate'); socket.off('gameStarted'); socket.off('gameReset');
    };
  }, [user?.id]);

  const handleLogout = () => {
    localStorage.removeItem('bingo_user_session');
    setUser(null);
  };

  const userSeriesCount = useMemo(() => {
    if (!user) return 0;
    const myCards = allCards.filter(c => c.userId === user.id);
    return new Set(myCards.map(c => c.serieId)).size;
  }, [allCards, user]);

  // CORREÇÃO: Renderiza Login ANTES de checar o estado do evento
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-[380px] border-b-8 border-indigo-600">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3"><Trophy size={32} /></div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">Acesse o Bingo</h1>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (authMode === 'REGISTER') socket.emit('registerUser', { name: registerName, whatsapp: loginWhatsapp, pixKey: registerPix });
            else socket.emit('loginUser', { whatsapp: loginWhatsapp });
          }} className="space-y-4">
            {authMode === 'REGISTER' && (
              <input type="text" placeholder="Nome Completo" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold shadow-inner" required />
            )}
            <input type="tel" placeholder="WhatsApp" value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold shadow-inner" required />
            {authMode === 'REGISTER' && (
              <input type="text" placeholder="Chave PIX (opcional)" value={registerPix} onChange={e => setRegisterPix(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold shadow-inner" />
            )}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase shadow-xl active:scale-95 transition-all">
              {authMode === 'LOGIN' ? 'Entrar Agora' : 'Finalizar Cadastro'}
            </button>
            <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-indigo-600 font-black text-xs uppercase pt-2">
              {authMode === 'LOGIN' ? 'Criar nova conta' : 'Já tenho conta'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Só mostra carregando se o usuário estiver logado mas o evento ainda não chegou
  if (!event) return <div className="h-screen flex items-center justify-center font-black animate-pulse bg-slate-50 text-slate-400 uppercase tracking-widest">Sincronizando com Servidor...</div>;

  const userCards = allCards.filter(c => c.userId === user.id);

  return (
    <div className="h-screen flex flex-row overflow-hidden bg-slate-50">
      {announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-950/80 p-4 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl animate-bounce border-b-8 border-indigo-600 max-w-sm">
            <Trophy size={64} className="mx-auto text-indigo-600 mb-6" />
            <p className="text-2xl font-black text-slate-900 leading-tight uppercase">{announcement}</p>
          </div>
        </div>
      )}

      <nav className="w-20 md:w-24 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 z-40 shrink-0 shadow-sm">
        <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg rotate-3 mb-4"><Trophy size={24} /></div>
        
        <button onClick={() => setActiveTab('USER')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'USER' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <LayoutDashboard size={28} />
          <span className="text-[9px] font-black uppercase">Jogo</span>
        </button>

        <button onClick={() => setActiveTab('STORE')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'STORE' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <div className="relative">
            <ShoppingCart size={28} />
            {userSeriesCount > 0 && <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black border-2 border-white">{userSeriesCount}</span>}
          </div>
          <span className="text-[9px] font-black uppercase">Loja</span>
        </button>

        <button onClick={() => setActiveTab('ADMIN')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ADMIN' ? 'text-indigo-600 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
          <Settings size={28} />
          <span className="text-[9px] font-black uppercase">Admin</span>
        </button>

        <div className="flex-1"></div>

        {event.supportWhatsapp && (
          <a href={`https://wa.me/55${event.supportWhatsapp}`} target="_blank" className="flex flex-col items-center gap-1 text-emerald-500 hover:scale-110 transition-all">
            <Phone size={24} />
            <span className="text-[8px] font-black uppercase">Suporte</span>
          </a>
        )}

        <button onClick={handleLogout} className="text-rose-400 hover:text-rose-600 transition-colors mb-4"><LogOut size={24} /></button>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center shrink-0 shadow-sm">
          <h1 className="font-black text-slate-900 uppercase tracking-tighter text-lg">{visual.appName}</h1>
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex flex-col items-end">
              <p className="text-[9px] font-black text-emerald-400 uppercase leading-none">Seu Saldo</p>
              <p className="font-black text-emerald-600 text-lg">R$ {user.balance.toFixed(2)}</p>
            </div>
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

          {activeTab === 'STORE' && (
            <div className="h-full overflow-y-auto p-8 bg-slate-50 flex flex-col items-center">
              <div className="max-w-md w-full space-y-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center border-b-8 border-indigo-600">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Layers size={40} /></div>
                  <h2 className="text-3xl font-black mb-2 uppercase text-slate-900">Comprar Séries</h2>
                  <p className="text-slate-400 font-bold mb-8 uppercase text-xs tracking-widest">Cada série contém 6 cartelas</p>
                  
                  <div className="flex items-center justify-center gap-8 mb-10">
                    <button onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))} className="w-16 h-16 bg-slate-100 rounded-2xl text-3xl font-black hover:bg-slate-200 transition-colors">-</button>
                    <span className="text-6xl font-black text-indigo-600">{purchaseQty}</span>
                    <button onClick={() => setPurchaseQty(purchaseQty + 1)} className="w-16 h-16 bg-slate-100 rounded-2xl text-3xl font-black hover:bg-slate-200 transition-colors">+</button>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-[2rem] mb-8 border border-indigo-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-indigo-400 uppercase">Preço p/ Série</span>
                      <span className="text-sm font-black text-indigo-600">R$ {event.cardPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-indigo-200">
                      <span className="text-xs font-black text-indigo-900 uppercase">Total a Pagar</span>
                      <span className="text-3xl font-black text-indigo-600">R$ {(purchaseQty * event.cardPrice).toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => socket.emit('buySeries', { userId: user.id, qty: purchaseQty })} 
                    disabled={event.status === 'RUNNING'}
                    className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase active:scale-95 transition-all disabled:grayscale disabled:opacity-50 text-lg"
                  >
                    {event.status === 'RUNNING' ? 'Partida em Andamento' : 'Confirmar Compra'}
                  </button>
                </div>
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
                <div className="max-w-md mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 mt-12 text-center">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"><Settings size={40} /></div>
                  <h2 className="text-3xl font-black mb-8 uppercase text-slate-900">Acesso Restrito</h2>
                  <div className="space-y-4 text-left">
                    <input type="text" placeholder="Usuário Admin" value={adminUserField} onChange={e => setAdminUserField(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                    <input type="password" placeholder="Senha" value={adminPassField} onChange={e => setAdminPassField(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                    <button onClick={() => {
                      if (adminUserField === ADMIN_USER && adminPassField === ADMIN_PASS) setIsAdminAuthenticated(true);
                      else alert("Credenciais incorretas.");
                    }} className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 uppercase text-lg">Entrar</button>
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
