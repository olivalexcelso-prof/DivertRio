
import { io } from "https://esm.sh/socket.io-client@^4.8.1";

// Conecta ao servidor no mesmo host da aplicação
export const socket = io(window.location.origin, {
  transports: ['websocket', 'polling']
});

socket.on("connect", () => {
  console.log("Conectado ao servidor central de Bingo.");
});

socket.on("disconnect", () => {
  console.log("Desconectado do servidor.");
});
