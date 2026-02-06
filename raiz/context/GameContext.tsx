
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppConfig, GameState, GameStatus, User, Series, WinEvent } from '../types';
import { DEFAULT_CONFIG, INITIAL_GAME_STATE } from '../constants';
import { checkWin } from '../services/bingoEngine';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:3001'; // Ajustar para produção

interface GameContextType {
  config: AppConfig;
  gameState: GameState;
  user: User | null;
  userSeries: Series[];
  updateConfig: (newConfig: AppConfig) => void;
  buySeries: () => void;
  setUser: (user: User | null) => void;
  addBalance: (amount: number) => void;
  forceStart: () => void;
  forceEnd: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('bingo_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [user, setUser] = useState<User | null>(null);
  const [userSeries, setUserSeries] = useState<Series[]>([]);
  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const synth = window.speechSynthesis;

  // Sincronização com o Backend via WebSocket
  useEffect(() => {
    socketRef.current = io(API_URL);

    socketRef.current.on('game_state_update', (newState: GameState) => {
      setGameState(prev => {
        // Se uma nova bola foi sorteada, narrar
        if (newState.lastBall && newState.lastBall !== prev.lastBall) {
          speak(`${config.ttsTexts.ballDrawn} ${newState.lastBall}`);
        }
        return { ...prev, ...newState };
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [config.ttsTexts.ballDrawn]);

  useEffect(() => {
    localStorage.setItem('bingo_config', JSON.stringify(config));
  }, [config]);

  const speak = (text: string, onEnd?: () => void) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    if (onEnd) utterance.onend = onEnd;
    synth.speak(utterance);
  };

  const updateConfig = (newConfig: AppConfig) => setConfig(newConfig);

  const addBalance = (amount: number) => {
    setUser(prev => prev ? { ...prev, balance: prev.balance + amount } : null);
  };

  const buySeries = async () => {
    if (!user || user.balance < config.seriesPrice) {
      alert("Saldo insuficiente! Adicione créditos clicando no '+' ao lado do saldo.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/game/buy-series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isFake: user.isFake })
      });
      const newSeries = await response.json();
      
      setUserSeries(prev => [...prev, newSeries]);
      setUser(prev => prev ? { ...prev, balance: prev.balance - config.seriesPrice } : null);
    } catch (error) {
      console.error("Erro ao comprar série no servidor:", error);
    }
  };

  const forceStart = async () => {
    try {
      await fetch(`${API_URL}/api/game/start`, { method: 'POST' });
    } catch (error) {
      console.error("Erro ao iniciar partida no servidor:", error);
    }
  };

  const forceEnd = async () => {
    try {
      await fetch(`${API_URL}/api/game/end`, { method: 'POST' });
    } catch (error) {
      console.error("Erro ao encerrar partida no servidor:", error);
    }
  };

  return (
    <GameContext.Provider value={{ 
      config, gameState, user, userSeries, 
      updateConfig, buySeries, setUser, addBalance,
      forceStart, forceEnd 
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
