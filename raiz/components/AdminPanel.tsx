
import React, { useRef } from 'react';
import { BingoEvent, User, Card, VisualConfig } from '../types';
import { BINGO_MAX_BALLS } from '../constants';
import { Play, Zap, ZapOff, DollarSign, Megaphone, Settings2, Info, Palette, Clock, LogOut, Phone, Layout, Image as ImageIcon, Monitor } from 'lucide-react';

interface AdminPanelProps {
  event: BingoEvent;
  users: User[];
  cards: Card[];
  onDrawBall: () => void;
  onResetEvent: () => void;
  onUpdatePrizeStep: (step: BingoEvent['currentPrizeStep']) => void;
  isAutoDrawing: boolean;
  onToggleAutoDraw: () => void;
  onAddSeries: (userId: string) => void;
  onStartGame: () => void;
  visualConfig: VisualConfig;
  onUpdateVisual: (config: VisualConfig) => void;
  onUpdateEvent: (event: Partial<BingoEvent>) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  event, 
  users, 
  cards, 
  onDrawBall, 
  onResetEvent,
  isAutoDrawing,
  onToggleAutoDraw,
  onStartGame,
  visualConfig,
  onUpdateVisual,
  onUpdateEvent
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const loginBgInputRef = useRef<HTMLInputElement>(null);

  const lastBall = event.drawnBalls[event.drawnBalls.length - 1];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'loginBackgroundUrl' | 'faviconUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateVisual({ ...visualConfig, [field]: reader.result as string, updatedAt: Date.now() });
      };
      reader.readAsDataURL(file);
    }
  };

  const adConfig = event.adConfig || { imageUrl: '', displayDuration: 10, interval: 5, isActive: false };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Painel Administrativo</h1>
      </div>

      {/* PROGRAMAÇÃO E VALORES - TOTALMENTE EDITÁVEL */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Settings2 className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-slate-800 uppercase">Programação e Valores</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Preço Série (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="number" value={event.cardPrice} onChange={(e) => onUpdateEvent({ cardPrice: Number(e.target.value) })} className="w-full bg-slate-50 border-2 rounded-2xl pl-10 pr-5 py-3 font-bold" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">WhatsApp Suporte</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="DDD+Número" value={event.supportWhatsapp || ''} onChange={(e) => onUpdateEvent({ supportWhatsapp: e.target.value })} className="w-full bg-slate-50 border-2 rounded-2xl pl-10 pr-5 py-3 font-bold" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Modo de Jogo</label>
            <select value={event.startMode} onChange={(e) => onUpdateEvent({ startMode: e.target.value as any })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold">
              <option value="MANUAL">Manual (Gereciado)</option>
              <option value="AUTO">Automático (Servidor)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Intervalo Entre Jogos (Min)</label>
            <input type="number" value={event.autoInterval} onChange={(e) => onUpdateEvent({ autoInterval: Number(e.target.value) })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Início Diário</label>
            <input type="time" value={event.dailyStartTime || '08:00'} onChange={(e) => onUpdateEvent({ dailyStartTime: e.target.value })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Término Diário</label>
            <input type="time" value={event.dailyEndTime || '23:00'} onChange={(e) => onUpdateEvent({ dailyEndTime: e.target.value })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold" />
          </div>
        </div>
      </section>

      {/* PUBLICIDADE - TOTALMENTE EDITÁVEL */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Megaphone className="text-orange-500" size={24} />
          <h2 className="text-xl font-black text-slate-800 uppercase">Publicidade no Chat</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">URL da Imagem</label>
                <input type="text" value={adConfig.imageUrl} onChange={(e) => onUpdateEvent({ adConfig: { ...adConfig, imageUrl: e.target.value } })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold" placeholder="https://..." />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Duração (Seg)</label>
                  <input type="number" value={adConfig.displayDuration} onChange={(e) => onUpdateEvent({ adConfig: { ...adConfig, displayDuration: Number(e.target.value) } })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Intervalo (Min)</label>
                  <input type="number" value={adConfig.interval} onChange={(e) => onUpdateEvent({ adConfig: { ...adConfig, interval: Number(e.target.value) } })} className="w-full bg-slate-50 border-2 rounded-2xl px-5 py-3 font-bold" />
                </div>
             </div>
          </div>
          <div className="flex flex-col justify-center">
             <label className="flex items-center gap-4 cursor-pointer mb-4">
                <div 
                  onClick={() => onUpdateEvent({ adConfig: { ...adConfig, isActive: !adConfig.isActive } })}
                  className={`w-14 h-8 rounded-full transition-all relative ${adConfig.isActive ? 'bg-orange-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${adConfig.isActive ? 'left-7' : 'left-1'}`}></div>
                </div>
                <span className="font-black text-slate-700 uppercase text-xs">Ativar Anúncios</span>
             </label>
          </div>
        </div>
      </section>

      {/* OPERAÇÃO DO GLOBO */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col items-center shadow-2xl overflow-hidden">
        {event.status === 'SETUP' ? (
          <div className="w-full text-center space-y-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Próxima Partida</h2>
            <button onClick={onStartGame} disabled={cards.length === 0} className="bg-emerald-500 text-white px-10 py-5 rounded-[2rem] font-black flex items-center justify-center gap-2 disabled:grayscale shadow-xl text-xl uppercase tracking-widest"><Play size={24} /> Iniciar Agora</button>
            <p className="text-slate-400 font-bold uppercase text-[10px]">{cards.length} cartelas vendidas</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-52 h-52 rounded-full bg-white text-indigo-950 flex items-center justify-center text-8xl font-black shadow-2xl mb-12 border-8 border-indigo-500/20">{lastBall || '--'}</div>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={onDrawBall} disabled={isAutoDrawing || event.status === 'FINISHED'} className="bg-white text-indigo-950 px-12 py-6 rounded-[2rem] font-black text-2xl active:scale-95 shadow-xl uppercase">Chamar Bola</button>
              <button onClick={onToggleAutoDraw} className={`px-10 py-6 rounded-[2rem] font-black text-xl border-2 transition-all ${isAutoDrawing ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/20 text-white'}`}>{isAutoDrawing ? <ZapOff className="inline mr-2" /> : <Zap className="inline mr-2" />}{isAutoDrawing ? 'Parar Auto' : 'Modo Auto'}</button>
            </div>
            <button onClick={onResetEvent} className="mt-10 text-rose-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2"><LogOut size={16} /> Zerar Sistema</button>
          </div>
        )}
      </div>
    </div>
  );
};

