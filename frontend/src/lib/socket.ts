import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/api";

// The backend serves Socket.io on the same origin/port as the REST API —
// strip the "/api" suffix to get the base server URL.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

/** Returns a shared, already-connecting socket instance (auth via cookie). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
