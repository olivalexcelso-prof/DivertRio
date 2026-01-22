
import React, { useState, useEffect, useRef } from 'react';
import { User, Card, BingoEvent, VisualConfig, ChatMessage } from './types';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { FinalScoreboard } from './components/FinalScoreboard';
import { Chat } from './components/Chat';
import { LayoutDashboard, Settings, Trophy, LogOut, ShoppingCart, Wallet, ShieldCheck, Users, Layers, Plus, Minus, MessageSquare, X } from 'lucide-react';
import { socket } from './services/socket';

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
  logoUrl: '',
  loginBackgroundUrl: '',
  faviconUrl: '',
  adConfig: { imageUrl: '', displayDuration: 10, interval: 5, isActive: false }
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
  
  const [visual] = useState<VisualConfig>(DEFAULT_VISUAL);
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN' | 'STORE' | 'WALLET'>('USER');
  const [event, setEvent] = useState<BingoEvent>(INITIAL_EVENT);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showFinalScoreboard, setShowFinalScoreboard] = useState(false);
  const [isAdminAutoDrawing, setIsAdminAutoDrawing] = useState(false);
  
  // Chat Flutuante
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPos, setChatPos] = useState({ x: window.innerWidth - 350, y: window.innerHeight - 500 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('bingo_admin_auth') === 'true';
  });
  
  const [adminUserField, setAdminUserField] = useState('');
  const [adminPassField, setAdminPassField] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loginWhatsapp, setLoginWhatsapp] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [depositValue, setDepositValue] = useState<string>('0.00');
  const [purchaseQty, setPurchaseQty] = useState<number>(1);

  useEffect(() => {
    socket.emit('requestSync');
    
    socket.on('initialState', (data) => {
      if (data.event) setEvent(data.event);
      if (data.cards) setAllCards(data.cards);
      if (data.users) setAllUsers(data.users);
      if (data.messages) setChatMessages(data.messages);
      setIsAdminAutoDrawing(data.isAutoDrawing || false);
    });

    socket.on('balanceUpdate', (newBalance: number) => {
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, balance: newBalance };
        localStorage.setItem('bingo_user_session', JSON.stringify(updated));
        return updated;
      });
    });

    socket.on('eventUpdate', (updated) => {
      setEvent(prev => ({ ...prev, ...updated }));
      if (updated.status === 'FINISHED') setShowFinalScoreboard(true);
      if (updated.status === 'SETUP') setShowFinalScoreboard(false);
    });

    socket.on('adminAutoStatus', (status) => setIsAdminAutoDrawing(status));
    socket.on('cardsUpdate', (cards) => setAllCards(cards));
    socket.on('usersUpdate', (users) => setAllUsers(users));
    socket.on('chatUpdate', (messages) => setChatMessages(messages));
    socket.on('registrationSuccess', (u) => { setUser(u); localStorage.setItem('bingo_user_session', JSON.stringify(u)); });
    socket.on('loginSuccess', (u) => { setUser(u); localStorage.setItem('bingo_user_session', JSON.stringify(u)); });

    return () => {
      socket.off('initialState');
      socket.off('balanceUpdate');
      socket.off('eventUpdate');
      socket.off('adminAutoStatus');
      socket.off('chatUpdate');
      socket.off('cardsUpdate');
      socket.off('usersUpdate');
      socket.off('registrationSuccess');
      socket.off('loginSuccess');
    };
  }, []);

  // Draggable Chat Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setChatPos({
          x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 450, e.clientY - dragOffset.current.y))
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - chatPos.x, y: e.clientY - chatPos.y };
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUserField.trim() === ADMIN_USER && adminPassField === ADMIN_PASS) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('bingo_admin_auth', 'true');
      setAdminUserField('');
      setAdminPassField('');
    } else {
      alert("Usuário ou Senha Admin incorretos!");
    }
  };

  const handlePIXDeposit = () => {
    const val = parseFloat(depositValue);
    if (isNaN(val) || val <= 0) return alert("Valor inválido");
    socket.emit('addBalance', { userId: user?.id, amount: val });
    setAnnouncement(`PIX CONFIRMADO!`);
    setTimeout(() => setAnnouncement(''), 2000);
    setDepositValue('0.00');
  };

  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-6 bg-slate-950 bg-cover bg-center bg-no-repeat"
        style={event.loginBackgroundUrl ? { backgroundImage: `url(${event.loginBackgroundUrl})` } : {}}
      >
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl w-full max-w-[380px] border-b-8 border-indigo-600">
          <div className="text-center mb-8">
            {event.logoUrl ? (
               <img src={event.logoUrl} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain rounded-2xl" />
            ) : (
               <Trophy size={48} className="mx-auto text-indigo-600 mb-2" />
            )}
            <h1 className="text-2xl font-black text-slate-900 uppercase">{event.name}</h1>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (authMode === 'REGISTER') socket.emit('registerUser', { name: registerName, whatsapp: loginWhatsapp });
            else socket.emit('loginUser', { whatsapp: loginWhatsapp });
          }} className="space-y-4">
            {authMode === 'REGISTER' && <input type="text" placeholder="Nome Completo" value={registerName} onChange={e => setRegisterName(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold" required />}
            <input type="tel" placeholder="WhatsApp" value={loginWhatsapp} onChange={e => setLoginWhatsapp(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold" required />
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase shadow-lg active:scale-95 transition-all">Entrar</button>
            <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-indigo-600 font-black text-xs uppercase pt-2">
              {authMode === 'LOGIN' ? 'Não tem conta? Cadastre-se' : 'Já tenho conta, entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-row overflow-hidden bg-slate-50 relative">
      {announcement && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-indigo-950/80 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl border-b-8 border-indigo-600 animate-bounce">
            <Trophy size={64} className="mx-auto text-indigo-600 mb-4" />
            <p className="text-2xl font-black text-slate-900 uppercase">{announcement}</p>
          </div>
        </div>
      )}

      {/* CHAT FLUTUANTE */}
      {isChatOpen && (
        <div 
          style={{ left: chatPos.x, top: chatPos.y }}
          className="fixed w-80 h-[450px] bg-white rounded-3xl shadow-2xl z-[200] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200"
        >
          <div onMouseDown={startDrag} className="bg-slate-900 p-4 flex justify-between items-center cursor-move select-none">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Chat do Bingo</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <Chat messages={chatMessages} currentUserId={user.id} adConfig={event.adConfig} onSendMessage={(text) => socket.emit('sendMessage', { userId: user.id, text })} />
          </div>
        </div>
      )}

      {/* MENU LATERAL */}
      <nav className="w-20 md:w-24 bg-white border-r flex flex-col items-center py-6 gap-6 shrink-0 shadow-lg z-50">
        <div className="mb-2">
          {event.logoUrl ? <img src={event.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl shadow-sm" /> : <Trophy size={32} className="text-indigo-600" />}
        </div>
        
        <button onClick={() => setActiveTab('USER')} className={`flex flex-col items-center gap-1 group ${activeTab === 'USER' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <LayoutDashboard size={28} className="group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black uppercase">Jogo</span>
        </button>

        <button onClick={() => setIsChatOpen(!isChatOpen)} className={`flex flex-col items-center gap-1 group ${isChatOpen ? 'text-indigo-600' : 'text-slate-300'}`}>
          <MessageSquare size={28} className="group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black uppercase">Chat</span>
        </button>

        <button onClick={() => setActiveTab('WALLET')} className={`flex flex-col items-center gap-1 group ${activeTab === 'WALLET' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <Wallet size={28} className="group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black uppercase">PIX</span>
        </button>

        <button onClick={() => setActiveTab('STORE')} className={`flex flex-col items-center gap-1 group ${activeTab === 'STORE' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <ShoppingCart size={28} className="group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black uppercase">Loja</span>
        </button>

        <button onClick={() => setActiveTab('ADMIN')} className={`flex flex-col items-center gap-1 group ${activeTab === 'ADMIN' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <Settings size={28} className="group-hover:scale-110 transition-transform" />
          <span className="text-[8px] font-black uppercase">Admin</span>
        </button>

        <div className="flex-1"></div>

        <div className="flex flex-col gap-4 mb-4 items-center w-full px-2">
          <div className="flex flex-col items-center bg-indigo-50 p-2 rounded-xl border border-indigo-100 w-14 shadow-sm">
            <Users size={18} className="text-indigo-600" />
            <span className="text-[10px] font-black text-indigo-950 mt-1 leading-none">{event.onlineCount || 0}</span>
          </div>
        </div>

        <button onClick={() => { localStorage.removeItem('bingo_user_session'); setUser(null); }} className="text-rose-400 p-2 hover:bg-rose-50 rounded-xl transition-colors">
          <LogOut size={24} />
        </button>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
          <h1 className="font-black text-slate-900 uppercase text-lg tracking-tight">{event.name}</h1>
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 text-right shadow-sm">
            <p className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1 tracking-widest">Saldo Atual</p>
            <p className="font-black text-emerald-600 text-xl leading-none">R$ {user.balance.toFixed(2)}</p>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {activeTab === 'USER' && (
            <UserDashboard user={user} cards={allCards.filter(c => c.userId === user.id)} event={event} messages={chatMessages} totalGlobalCards={allCards.length} onSendMessage={(text) => socket.emit('sendMessage', { userId: user.id, text })} />
          )}

          {activeTab === 'WALLET' && (
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50">
              <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl border-b-[12px] border-emerald-500 text-center">
                 <h2 className="text-3xl font-black text-slate-900 uppercase mb-8 tracking-tighter">Depósito PIX</h2>
                 <div className="space-y-6">
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-3xl">R$</span>
                      <input type="number" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} className="w-full pl-20 pr-8 py-8 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-4xl outline-none focus:border-emerald-500 text-emerald-600" />
                    </div>
                    <button onClick={handlePIXDeposit} className="w-full py-8 bg-emerald-500 text-white font-black rounded-3xl shadow-[0_12px_0_0_rgba(16,185,129,1)] active:translate-y-2 active:shadow-none transition-all uppercase text-2xl">Confirmar Depósito</button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'STORE' && (
             <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl text-center border-b-8 border-indigo-600">
                    <h2 className="text-3xl font-black uppercase text-slate-900 mb-6">Comprar Séries</h2>
                    <div className="space-y-6 mb-8">
                      <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-2 text-center">Quantidade de Séries</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPurchaseQty(prev => Math.max(1, prev - 1))} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors active:scale-90"><Minus size={24} /></button>
                          <input type="number" min="1" value={purchaseQty} onChange={(e) => setPurchaseQty(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-3xl text-slate-700 outline-none text-center" />
                          <button onClick={() => setPurchaseQty(prev => prev + 1)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors active:scale-90"><Plus size={24} /></button>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                        <span className="text-xs font-black text-slate-400 uppercase">Total a Pagar</span>
                        <span className="text-2xl font-black text-indigo-600">R$ {(purchaseQty * event.cardPrice).toFixed(2)}</span>
                      </div>
                    </div>
                    <button onClick={() => socket.emit('buySeries', { userId: user.id, qty: purchaseQty })} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl uppercase active:scale-95 transition-all hover:bg-indigo-700 text-xl">Comprar Agora</button>
                </div>
             </div>
          )}

          {activeTab === 'ADMIN' && (
            <div className="h-full overflow-y-auto p-8 bg-slate-50">
              {isAdminAuthenticated ? (
                <AdminPanel event={event} users={allUsers} cards={allCards} onDrawBall={() => socket.emit('adminDrawBall')} onResetEvent={() => socket.emit('adminReset')} onUpdatePrizeStep={(s) => socket.emit('adminUpdateEvent', { currentPrizeStep: s })} isAutoDrawing={isAdminAutoDrawing} onToggleAutoDraw={() => socket.emit('adminToggleAuto', !isAdminAutoDrawing)} onAddSeries={() => {}} onStartGame={() => socket.emit('adminStartGame')} visualConfig={visual} onUpdateVisual={() => {}} onUpdateEvent={(updated) => socket.emit('adminUpdateEvent', updated)} />
              ) : (
                <div className="max-w-md mx-auto bg-white p-12 rounded-[3.5rem] shadow-2xl mt-12 text-center border-b-[12px] border-slate-900">
                  <h2 className="text-3xl font-black mb-8 uppercase text-slate-900 flex items-center justify-center gap-3"><ShieldCheck size={32} /> Acesso Admin</h2>
                  <form onSubmit={handleAdminAuth} className="space-y-4">
                    <input type="text" placeholder="Usuário" value={adminUserField} onChange={e => setAdminUserField(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none" />
                    <input type="password" placeholder="Senha" value={adminPassField} onChange={e => setAdminPassField(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-bold focus:border-indigo-600 outline-none" />
                    <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase active:scale-95 transition-all">Acessar Painel</button>
                  </form>
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
