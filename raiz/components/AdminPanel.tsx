
import React, { useRef } from 'react';
import { BingoEvent, User, Card, VisualConfig } from '../types';
import { BINGO_MAX_BALLS } from '../constants';
import { Play, List, Zap, ZapOff, ShoppingCart, TrendingUp, Image as ImageIcon, Palette, Calendar, Clock, Save } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastBall = event.drawnBalls[event.drawnBalls.length - 1];
  const appPrimaryColor = visualConfig.primaryColor;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateVisual({ ...visualConfig, logoUrl: reader.result as string, updatedAt: Date.now() });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900">Painel de Controle</h1>
      </div>

      {/* 1. IDENTIDADE DA APLICAÇÃO */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Palette className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-slate-800">Identidade da Aplicação</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Nome da Aplicação</label>
              <input 
                type="text" 
                value={visualConfig.appName}
                onChange={(e) => onUpdateVisual({...visualConfig, appName: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 focus:ring-2 outline-none transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Cor Principal</label>
                <input 
                  type="color" 
                  value={visualConfig.primaryColor}
                  onChange={(e) => onUpdateVisual({...visualConfig, primaryColor: e.target.value})}
                  className="w-full h-12 rounded-xl border-0 cursor-pointer p-0 overflow-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Cor das Cartelas</label>
                <input 
                  type="color" 
                  value={visualConfig.cardColor}
                  onChange={(e) => onUpdateVisual({...visualConfig, cardColor: e.target.value})}
                  className="w-full h-12 rounded-xl border-0 cursor-pointer p-0 overflow-hidden"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Logomarca (512x512)</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {visualConfig.logoUrl ? (
                  <img src={visualConfig.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="text-slate-300" size={32} />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-100 transition-colors"
              >
                Upload PNG/SVG
              </button>
              <input ref={fileInputRef} type="file" accept=".png,.svg" onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. CONFIGURAÇÕES COMERCIAIS */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <TrendingUp className="text-emerald-600" size={24} />
          <h2 className="text-xl font-black text-slate-800">Configurações Comerciais</h2>
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Preço da Série (R$)</label>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
            <input 
              type="number" 
              value={event.cardPrice} 
              onChange={(e) => onUpdateEvent({...event, cardPrice: Number(e.target.value)})}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-3 focus:ring-2 outline-none transition-all font-black"
            />
          </div>
        </div>
      </section>

      {/* 3. CONFIGURAÇÕES DE PARTIDA */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <Calendar className="text-indigo-600" size={24} />
          <h2 className="text-xl font-black text-slate-800">Configurações de Partida</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Modo de Início</label>
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button 
                onClick={() => onUpdateEvent({...event, startMode: 'MANUAL'})}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${event.startMode === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Início Manual
              </button>
              <button 
                onClick={() => onUpdateEvent({...event, startMode: 'AUTO'})}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${event.startMode === 'AUTO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Automático / Agendado
              </button>
            </div>
          </div>

          {event.startMode === 'AUTO' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Intervalo entre Partidas (Minutos)</label>
              <div className="flex items-center gap-4">
                <Clock className="text-slate-400" size={20} />
                <input 
                  type="number" 
                  value={event.autoInterval} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdateEvent({...event, autoInterval: val});
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 font-bold"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* OPERAÇÃO (MANTIDA) */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white flex flex-col items-center shadow-2xl relative overflow-hidden">
        {event.status === 'SETUP' ? (
          <div className="w-full text-center space-y-6">
            <h2 className="text-3xl font-black">Pronto para Iniciar</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => onAddSeries(users[0]?.id)} className="bg-white text-indigo-950 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                <ShoppingCart size={20} /> Registrar Venda
              </button>
              <button onClick={onStartGame} disabled={cards.length === 0} className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:grayscale">
                <Play size={20} /> Iniciar Agora
              </button>
            </div>
            {event.startMode === 'AUTO' && event.nextAutoStart && (
              <p className="text-emerald-400 font-bold animate-pulse">
                Agendado para: {new Date(event.nextAutoStart).toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-48 h-48 rounded-full bg-white text-indigo-950 flex items-center justify-center text-8xl font-black shadow-2xl mb-12">
              {lastBall || '--'}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={onDrawBall} disabled={isAutoDrawing || event.status === 'FINISHED'} className="bg-white text-indigo-950 px-10 py-5 rounded-2xl font-black text-xl active:scale-95 disabled:opacity-50">
                Sortear Bola
              </button>
              <button onClick={onToggleAutoDraw} className={`px-10 py-5 rounded-2xl font-black text-lg border-2 ${isAutoDrawing ? 'border-rose-500 text-rose-500' : 'border-white/20 text-white'}`}>
                {isAutoDrawing ? <ZapOff className="inline mr-2" /> : <Zap className="inline mr-2" />}
                {isAutoDrawing ? 'Parar Automático' : 'Modo Automático'}
              </button>
            </div>
            <button onClick={onResetEvent} className="mt-8 text-indigo-300 font-bold uppercase text-xs tracking-widest">Zerar Evento</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
         <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><List size={20} style={{ color: appPrimaryColor }} /> Globo da Partida</h3>
         <div className="grid grid-cols-10 gap-2">
           {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
             const isDrawn = event.drawnBalls.includes(num);
             return (
               <div key={num} className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${isDrawn ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-200'}`}>
                 {num}
               </div>
             );
           })}
         </div>
      </div>
    </div>
  );
};
