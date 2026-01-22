
import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';
import { ChatMessage, AdConfig } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  adConfig?: AdConfig;
  onSendMessage: (text: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, currentUserId, adConfig, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [showAd, setShowAd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showAd]);

  useEffect(() => {
    if (!adConfig?.isActive) return;

    const intervalId = setInterval(() => {
      setShowAd(true);
      setTimeout(() => setShowAd(false), adConfig.displayDuration * 1000);
    }, adConfig.interval * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [adConfig]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Área de Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth scrollbar-hide">
        {messages.map((msg, idx) => {
          const isMe = msg.userId === currentUserId;
          
          return (
            <React.Fragment key={msg.id}>
              {showAd && idx === messages.length - 1 && (
                <div className="flex justify-center my-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-full h-[80px] bg-slate-100 rounded-xl overflow-hidden shadow-md border border-slate-200 relative">
                    <img src={adConfig?.imageUrl} alt="Publicidade" className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 bg-black/40 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">Publicidade</div>
                  </div>
                </div>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-0.5 px-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                    {isMe ? 'Você' : msg.userName}
                  </span>
                  <span className="text-[8px] text-slate-300">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`
                  max-w-[85%] px-3 py-2 rounded-2xl text-[11px] font-medium shadow-sm
                  ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}
                `}>
                  {msg.text}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
            <Send size={24} className="mb-2" />
            <p className="text-[9px] font-black uppercase tracking-widest text-center">Inicie uma conversa!</p>
          </div>
        )}
      </div>

      {/* Input de Mensagem */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Digite..."
          className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-600 transition-all font-medium"
        />
        <button 
          type="submit" 
          className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg active:scale-90 transition-all"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
