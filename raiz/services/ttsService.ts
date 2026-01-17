
/**
 * TTS Service utilizando Web Speech API (Gratuita e Nativa)
 */

const getPortugueseVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR') || voices.find(v => v.lang.startsWith('pt'));
};

const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancela falas anteriores para não acumular
  window.speechSynthesis.cancel();

  const msg = new SpeechSynthesisUtterance();
  msg.text = text;
  msg.lang = 'pt-BR';
  msg.rate = 1.0;
  msg.pitch = 1;

  const voice = getPortugueseVoice();
  if (voice) msg.voice = voice;

  window.speechSynthesis.speak(msg);
};

export const announceBall = (num: number) => {
  speak(`Bola número ${num}`);
};

export const announcePrizes = (revenue: number) => {
  const quadra = (revenue * (25 / 300)).toFixed(2);
  const linha = (revenue * (60 / 300)).toFixed(2);
  const bingo = (revenue * (150 / 300)).toFixed(2);
  const acumulado = (revenue * (5 / 300)).toFixed(2);

  speak(`Nesta partida, a premiação será: Quadra R$ ${quadra}, Linha R$ ${linha}, Bingo R$ ${bingo}, e R$ ${acumulado} acumulados para o Bingo Acumulado.`);
};

export const announceWinner = (prizeType: string, userName: string) => {
  let prizeText = '';
  
  if (prizeType === 'QUADRA') {
    prizeText = 'a Quadra';
  } else if (prizeType === 'QUINA') {
    prizeText = 'a Linha';
  } else if (prizeType === 'BINGO' || prizeType === 'ACCUMULATED') {
    prizeText = 'o Bingo';
  }

  if (prizeText) {
    speak(`Parabéns ${userName}, você ganhou ${prizeText}.`);
  }
};

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = getPortugueseVoice;
  }
}
