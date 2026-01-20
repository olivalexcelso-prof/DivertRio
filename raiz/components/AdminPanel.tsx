
import React, { useRef } from 'react';
import { BingoEvent, User, Card, VisualConfig } from '../types';
import { BINGO_MAX_BALLS } from '../constants';
import { Play, List, Zap, ZapOff, ShoppingCart, TrendingUp, Image as ImageIcon, Palette, Calendar, Clock, Save, LogOut, MessageCircle, Monitor, Megaphone, Settings2, Info, DollarSign, Layout, Phone } from 'lucide-react';

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
  onUpdateEvent: (event: BingoEvent) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  event, 
  users, 
  cards, 
  onDrawBall, 
  onResetEvent,
  isAutoDrawing,
  onToggleAutoDraw,
  onAddSeries,
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Painel Operacional</h1>
      </div>

      {/* CONFIGURAÇÃO DE AGENDAMENTO E PREÇOS */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Settings2 className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-slate-800">Programação e Valores</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Preço da Série (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                value={event.cardPrice} 
                onChange={(e) => onUpdateEvent({...event, cardPrice: Number(e.target.value)})}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-5 py-3 font-bold focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">WhatsApp Suporte/Saque</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Ex: 86999999999"
                value={event.supportWhatsapp || ''} 
                onChange={(e) => onUpdateEvent({...event, supportWhatsapp: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-5 py-3 font-bold focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Modo de Início</label>
            <select 
              value={event.startMode} 
              onChange={(e) => onUpdateEvent({...event, startMode: e.target.value as any})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
            >
              <option value="MANUAL">Manual (Botão)</option>
              <option value="AUTO">Automático (Agendado)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Intervalo entre Jogos (Min)</label>
            <input 
              type="number" 
              value={event.autoInterval} 
              onChange={(e) => onUpdateEvent({...event, autoInterval: Number(e.target.value)})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Início Diário</label>
            <input 
              type="time" 
              value={event.dailyStartTime} 
              onChange={(e) => onUpdateEvent({...event, dailyStartTime: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Término Diário</label>
            <input 
              type="time" 
              value={event.dailyEndTime} 
              onChange={(e) => onUpdateEvent({...event, dailyEndTime: e.target.value})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
            />
          </div>

          <div className="flex items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100 md:col-span-3">
            <Info className="text-indigo-600 mr-3 shrink-0" size={20} />
            <p className="text-[11px] text-indigo-700 font-bold uppercase leading-tight">
              O número de WhatsApp inserido acima receberá todos os dados dos clientes que solicitarem saque (Nome, CPF e Chave PIX).
            </p>
          </div>
        </div>
      </section>

      {/* CONFIGURAÇÃO DE PUBLICIDADE */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Megaphone className="text-orange-500" size={24} />
          <h2 className="text-xl font-black text-slate-800">Publicidade no Chat</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">URL da Imagem (320x100px)</label>
                <input 
                  type="text" 
                  value={event.adConfig?.imageUrl || ''}
                  onChange={(e) => onUpdateEvent({...event, adConfig: {...event.adConfig!, imageUrl: e.target.value}})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
                  placeholder="https://suaimagem.com/banner.png"
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Exibição (Segundos)</label>
                  <input 
                    type="number" 
                    value={event.adConfig?.displayDuration || 10}
                    onChange={(e) => onUpdateEvent({...event, adConfig: {...event.adConfig!, displayDuration: Number(e.target.value)}})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Intervalo (Minutos)</label>
                  <input 
                    type="number" 
                    value={event.adConfig?.interval || 5}
                    onChange={(e) => onUpdateEvent({...event, adConfig: {...event.adConfig!, interval: Number(e.target.value)}})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold"
                  />
                </div>
             </div>
          </div>
          <div className="flex flex-col justify-center">
             <label className="flex items-center gap-3 cursor-pointer group mb-4">
                <div className={`w-14 h-7 rounded-full transition-all relative ${event.adConfig?.isActive ? 'bg-orange-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${event.adConfig?.isActive ? 'left-8' : 'left-1'}`}></div>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={event.adConfig?.isActive} 
                  onChange={(e) => onUpdateEvent({...event, adConfig: {...event.adConfig!, isActive: e.target.checked}})}
                />
                <span className="font-black text-slate-700 uppercase text-xs tracking-widest">Ativar Anúncios no Chat</span>
             </label>
             <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Dica Admin</p>
                <p className="text-[9px] text-orange-400 font-medium">Banners serão inseridos no fluxo de mensagens para todos os usuários conforme o intervalo definido.</p>
             </div>
          </div>
        </div>
      </section>

      {/* IDENTIDADE VISUAL COMPLETA */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Palette className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-slate-800">Identidade Visual</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Nome do Aplicativo</label>
              <input type="text" value={visualConfig.appName} onChange={(e) => onUpdateVisual({...visualConfig, appName: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Cor Principal</label><input type="color" value={visualConfig.primaryColor} onChange={(e) => onUpdateVisual({...visualConfig, primaryColor: e.target.value})} className="w-full h-12 rounded-xl border-0 p-0 shadow-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Cor Cartelas</label><input type="color" value={visualConfig.cardColor} onChange={(e) => onUpdateVisual({...visualConfig, cardColor: e.target.value})} className="w-full h-12 rounded-xl border-0 p-0 shadow-sm" /></div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Logo */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                    {visualConfig.logoUrl ? <img src={visualConfig.logoUrl} className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-300" size={20} />}
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase">Logotipo</span>
                </div>
                <button onClick={() => logoInputRef.current?.click()} className="text-[10px] font-black uppercase text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">Alterar</button>
                <input ref={logoInputRef} type="file" onChange={(e) => handleFileUpload(e, 'logoUrl')} className="hidden" />
              </div>

              {/* Favicon */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                    {visualConfig.faviconUrl ? <img src={visualConfig.faviconUrl} className="w-full h-full object-contain" /> : <Layout className="text-slate-300" size={20} />}
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase">Favicon</span>
                </div>
                <button onClick={() => faviconInputRef.current?.click()} className="text-[10px] font-black uppercase text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">Alterar</button>
                <input ref={faviconInputRef} type="file" onChange={(e) => handleFileUpload(e, 'faviconUrl')} className="hidden" />
              </div>

              {/* Fundo Login */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                    {visualConfig.loginBackgroundUrl ? <img src={visualConfig.loginBackgroundUrl} className="w-full h-full object-cover" /> : <Monitor className="text-slate-300" size={20} />}
                  </div>
                  <span className="text-xs font-bold text-slate-600 uppercase">Fundo Login</span>
                </div>
                <button onClick={() => loginBgInputRef.current?.click()} className="text-[10px] font-black uppercase text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">Alterar</button>
                <input ref={loginBgInputRef} type="file" onChange={(e) => handleFileUpload(e, 'loginBackgroundUrl')} className="hidden" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OPERAÇÃO DO GLOBO */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col items-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Calendar size={120} /></div>
        {event.status === 'SETUP' ? (
          <div className="w-full text-center space-y-6 relative z-10">
            <h2 className="text-3xl font-black">Módulo de Operação</h2>
            <button onClick={onStartGame} disabled={cards.length === 0} className="bg-emerald-500 text-white px-10 py-5 rounded-[2rem] font-black flex items-center justify-center gap-2 disabled:grayscale shadow-xl shadow-emerald-900/40 text-xl"><Play size={24} /> INICIAR PARTIDA</button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center relative z-10">
            <div className="w-52 h-52 rounded-full bg-white text-indigo-950 flex items-center justify-center text-8xl font-black shadow-2xl mb-12 border-8 border-indigo-500/20">{lastBall || '--'}</div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={onDrawBall} disabled={isAutoDrawing || event.status === 'FINISHED'} className="bg-white text-indigo-950 px-12 py-6 rounded-[2rem] font-black text-2xl active:scale-95 shadow-xl">CHAMAR BOLA</button>
              <button onClick={onToggleAutoDraw} className={`px-10 py-6 rounded-[2rem] font-black text-xl border-2 transition-all ${isAutoDrawing ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/20 text-white hover:bg-white/5'}`}>{isAutoDrawing ? <ZapOff className="inline mr-2" /> : <Zap className="inline mr-2" />}{isAutoDrawing ? 'PARAR AUTO' : 'MODO AUTO'}</button>
            </div>
            <button onClick={onResetEvent} className="mt-10 text-rose-400 font-bold uppercase text-xs tracking-widest hover:text-rose-300 transition-colors flex items-center gap-2"><LogOut size={16} /> ZERAR SISTEMA</button>
          </div>
        )}
      </div>
    </div>
  );
};
