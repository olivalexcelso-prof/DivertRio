
/**
 * TTS Service utilizando Web Speech API (Gratuita e Nativa)
 */

let voices: SpeechSynthesisVoice[] = [];
let speechQueue: { text: string; onEnd?: () => void }[] = [];
let isProcessingQueue = false;

const loadVoices = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    voices = window.speechSynthesis.getVoices();
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  if ('onvoiceschanged' in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

const getPortugueseVoice = () => {
  if (voices.length === 0) loadVoices();
  return voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) || 
         voices.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR') || 
         voices.find(v => v.lang.startsWith('pt'));
};

const processQueue = () => {
  if (speechQueue.length === 0 || isProcessingQueue) return;
  
  const item = speechQueue[0];
  isProcessingQueue = true;

  const msg = new SpeechSynthesisUtterance();
  msg.text = item.text;
  msg.lang = 'pt-BR';
  msg.rate = 1.0; 
  msg.pitch = 1.0;
  msg.volume = 1.0;

  msg.onend = () => {
    isProcessingQueue = false;
    speechQueue.shift();
    item.onEnd?.();
    processQueue();
  };
  
  msg.onerror = () => {
    isProcessingQueue = false;
    speechQueue.shift();
    item.onEnd?.();
    processQueue();
  };

  const voice = getPortugueseVoice();
  if (voice) msg.voice = voice;

  window.speechSynthesis.speak(msg);
};

const speak = (text: string, onEnd?: () => void, priority = false) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return;
  }

  if (priority) {
    window.speechSynthesis.cancel();
    speechQueue = [];
    isProcessingQueue = false;
  }

  speechQueue.push({ text, onEnd });
  processQueue();
};

let lastAnnouncedBall: number | null = null;

export const announceBall = (num: number) => {
  if (lastAnnouncedBall === num) return;
  lastAnnouncedBall = num;
  speak(`Atenção! Bola número ${num}.`);
};

export const announcePrizes = (revenue: number, gamesLeft: number | undefined, onFinished: () => void) => {
  const quadra = (revenue * (25 / 300)).toFixed(2);
  const quina = (revenue * (60 / 300)).toFixed(2);
  const bingo = (revenue * (150 / 300)).toFixed(2);
  const acumulado = (revenue * (5 / 300)).toFixed(2);

  const text = `Sejam bem-vindos! A partida vai começar agora. Fiquem atentos aos prêmios desta rodada: Pagaremos R$ ${quadra} para a Quadra. R$ ${quina} para a Quina. O grande prêmio do Bingo principal é de R$ ${bingo}. E temos o prêmio acumulado especial no valor de R$ ${acumulado}. Boa sorte a todos e vamos ao sorteio!`;
  
  speak(text, onFinished, true);
};

export const announceWinner = (prizeType: string, userName: string) => {
  let prizeText = '';
  if (prizeType === 'QUADRA') prizeText = 'acaba de completar a Quadra de Linha! Parabéns!';
  else if (prizeType === 'QUINA') prizeText = 'completou a Quina de Linha! Que espetáculo!';
  else if (prizeType === 'BINGO') prizeText = 'é o grande campeão do Bingo desta rodada! Sensacional!';
  else if (prizeType === 'ACCUMULATED') prizeText = 'conquistou o Bingo Acumulado! Meus parabéns pela grande vitória!';

  if (prizeText) {
    speak(`Temos um ganhador! ${userName} ${prizeText}`);
  }
};
