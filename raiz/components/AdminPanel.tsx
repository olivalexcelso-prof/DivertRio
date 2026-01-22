
import React, { useState, useEffect } from 'react';
import { BingoEvent, User, Card, VisualConfig } from '../types';
import { 
  Settings2, DollarSign, Phone, Play, Zap, ZapOff, 
  LogOut, Award, Users, Layers, Megaphone, Clock, Save, 
  RotateCcw, ShieldCheck, Calendar, ImageIcon
} from 'lucide-react';

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
  onUpdatePrizeStep,
  isAutoDrawing,
  onToggleAutoDraw,
  onStartGame,
  onUpdateEvent,
}) => {
  const lastBall = event.drawnBalls[event.drawnBalls.length - 1];
  
  const [localPrice, setLocalPrice] = useState(event.cardPrice);
  const [localWhatsapp, setLocalWhatsapp] = useState(event.supportWhatsapp || '');
  const [localInterval, setLocalInterval] = useState(event.autoInterval);
  const [localAdUrl, setLocalAdUrl] = useState(event.adConfig?.imageUrl || '');
  const [localStartTime, setLocalStartTime] = useState(event.dailyStartTime || '');
  const [localEndTime, setLocalEndTime] = useState(event.dailyEndTime || '');
  
  const [localLogo, setLocalLogo] = useState(event.logoUrl || '');
  const [localLoginBg, setLocalLoginBg] = useState(event.loginBackgroundUrl || '');
  const [localFavicon, setLocalFavicon] = useState(event.faviconUrl || '');

  useEffect(() => {
    setLocalPrice(event.cardPrice);
    setLocalWhatsapp(event.supportWhatsapp || '');
    setLocalInterval(event.autoInterval);
    setLocalAdUrl(event.adConfig?.imageUrl || '');
    setLocalStartTime(event.dailyStartTime || '');
    setLocalEndTime(event.dailyEndTime || '');
    setLocalLogo(event.logoUrl || '');
    setLocalLoginBg(event.loginBackgroundUrl || '');
    setLocalFavicon(event.faviconUrl || '');
  }, [
    event.cardPrice, 
    event.supportWhatsapp, 
    event.autoInterval, 
    event.adConfig?.imageUrl,
    event.dailyStartTime,
    event.dailyEndTime,
    event.logoUrl,
    event.loginBackgroundUrl,
    event.faviconUrl
  ]);

  const saveSettings = () => {
    onUpdateEvent({
      cardPrice: localPrice,
      supportWhatsapp: localWhatsapp,
      autoInterval: localInterval,
      dailyStartTime: localStartTime,
      dailyEndTime: localEndTime,
      logoUrl: localLogo,
      loginBackgroundUrl: localLoginBg,
      faviconUrl: localFavicon,
      adConfig: {
        ...event.adConfig!,
        imageUrl: localAdUrl
      }
    });
    alert("Configurações atualizadas!");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Painel de Controle</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Gerenciamento Operacional da Partida</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-indigo-600">
          <div className="relative z-10 flex flex-col items-center">
            {event.status === 'SETUP' ? (
              <div className="py-12 text-center space-y-8">
                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto border-4 border-dashed border-white/20">
                  <Play size={48} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight">Sala de Espera</h2>
                  <p className="text-slate-400 font-bold text-sm mt-2">Aguardando início da rodada.</p>
                </div>
                <button 
                  onClick={onStartGame} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-16 py-6 rounded-[2rem] font-black text-2xl shadow-[0_8px_0_0_rgba(67,56,202,1)] active:translate-y-1 active:shadow-none transition-all uppercase tracking-widest"
                >
                  Iniciar Partida
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-10">
                <div className="flex flex-col items-center">
                  <p className="text-indigo-400 font-black uppercase text-[10px] tracking-widest mb-4">Última Bola Sorteada</p>
                  <div className="w-48 h-48 rounded-full bg-white text-slate-900 flex items-center justify-center text-8xl font-black shadow-[0_0_60px_rgba(255,255,255,0.1)] border-8 border-indigo-500 animate-in zoom-in duration-300">
                    {lastBall || '--'}
                  </div>
                  <p className="mt-4 text-slate-500 font-black uppercase text-xs">Total: {event.drawnBalls.length}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={onDrawBall} 
                    disabled={isAutoDrawing}
                    className="bg-white text-slate-900 p-6 rounded-3xl font-black text-xl hover:bg-slate-50 transition-all shadow-xl uppercase disabled:opacity-30 flex items-center justify-center gap-3"
                  >
                    <RotateCcw size={24} className="text-indigo-600" /> Sortear Manual
                  </button>
                  <button 
                    onClick={onToggleAutoDraw} 
                    className={`p-6 rounded-3xl font-black text-xl border-4 transition-all flex items-center justify-center gap-3 ${isAutoDrawing ? 'bg-rose-600 border-rose-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-white'}`}
                  >
                    {isAutoDrawing ? <ZapOff size={24} /> : <Zap size={24} />}
                    {isAutoDrawing ? 'Parar Automático' : 'Ligar Automático'}
                  </button>
                </div>

                <div className="w-full border-t border-white/10 pt-8">
                  <p className="text-center text-slate-500 font-black uppercase text-[10px] tracking-widest mb-6">Controle de Prêmio Atual</p>
                  <div className="flex justify-center gap-4">
                    {(['QUADRA', 'QUINA', 'BINGO'] as const).map(step => (
                      <button 
                        key={step}
                        onClick={() => onUpdatePrizeStep(step)}
                        className={`flex-1 max-w-[150px] py-4 rounded-2xl font-black text-xs uppercase border-2 transition-all flex flex-col items-center gap-2 ${event.currentPrizeStep === step ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-105 z-10' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}
                      >
                        <Award size={18} />
                        {step}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={onResetEvent} 
                  className="text-rose-400 hover:text-rose-300 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 py-4 mt-4"
                >
                  <LogOut size={16} /> Finalizar e Limpar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* SEÇÃO DE LAYOUT */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3">
              <ImageIcon className="text-purple-500" /> Identidade Visual
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logo (512x512px)</label>
                <input 
                  type="text" 
                  value={localLogo} 
                  placeholder="URL da Imagem"
                  onChange={(e) => setLocalLogo(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-medium text-slate-600 outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fundo Login (1080x1920px)</label>
                <input 
                  type="text" 
                  value={localLoginBg} 
                  placeholder="URL da Imagem"
                  onChange={(e) => setLocalLoginBg(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-medium text-slate-600 outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Favicon (512x512px)</label>
                <input 
                  type="text" 
                  value={localFavicon} 
                  placeholder="URL da Imagem"
                  onChange={(e) => setLocalFavicon(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-medium text-slate-600 outline-none focus:border-indigo-500" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3">
              <Calendar className="text-orange-500" /> Agendamento
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Início Diário</label>
                <input 
                  type="time" 
                  value={localStartTime} 
                  onChange={(e) => setLocalStartTime(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fim Diário</label>
                <input 
                  type="time" 
                  value={localEndTime} 
                  onChange={(e) => setLocalEndTime(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3">
              <DollarSign className="text-emerald-500" /> Finanças
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço da Série (R$)</label>
                <input 
                  type="number" 
                  value={localPrice} 
                  onChange={(e) => setLocalPrice(Number(e.target.value))} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intervalo Auto (Seg)</label>
                <div className="flex items-center gap-3">
                   <Clock size={16} className="text-slate-300" />
                   <input 
                    type="number" 
                    value={localInterval} 
                    onChange={(e) => setLocalInterval(Number(e.target.value))} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3">
              <Megaphone className="text-indigo-500" /> Publicidade
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">URL Banner Chat</label>
                <input 
                  type="text" 
                  value={localAdUrl} 
                  onChange={(e) => setLocalAdUrl(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-medium text-[10px] text-slate-500 outline-none focus:border-indigo-500" 
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="ad-toggle"
                  checked={event.adConfig?.isActive} 
                  onChange={(e) => onUpdateEvent({ adConfig: { ...event.adConfig!, isActive: e.target.checked }})}
                  className="w-5 h-5 rounded border-2 cursor-pointer" 
                />
                <label htmlFor="ad-toggle" className="text-xs font-black text-slate-600 uppercase cursor-pointer select-none">Banner Ativo</label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3">
              <Phone className="text-blue-500" /> Suporte
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Suporte</label>
                <input 
                  type="text" 
                  value={localWhatsapp} 
                  onChange={(e) => setLocalWhatsapp(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500" 
                />
              </div>
            </div>
          </div>

          <button 
            onClick={saveSettings}
            className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-lg shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Save size={24} /> Salvar Tudo
          </button>
        </div>
      </div>
    </div>
  );
};
