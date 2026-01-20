
import { io } from "https://esm.sh/socket.io-client@^4.8.1";

const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  autoConnect: true,
  timeout: 10000
});

socket.on("connect", () => {
  console.log("[SOCKET] Conexão estabelecida com sucesso.");
});

socket.on("connect_error", (error) => {
  console.error("[SOCKET] Falha na conexão:", error.message);
});
