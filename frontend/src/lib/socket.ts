import { io, type Socket } from "socket.io-client";
import {
  API_BASE_URL,
  getAccessToken,
  onAccessTokenChange,
  refreshAccessToken,
} from "@/lib/api";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

let socket: Socket | null = null;
let unsubscribeToken: (() => void) | null = null;
let refreshInFlight: Promise<void> | null = null;

async function reconnectWithFreshToken(current: Socket) {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const token = await refreshAccessToken();
    if (!token || socket !== current) {
      current.disconnect();
      return;
    }

    // Socket.IO calls the auth callback on the next connection attempt.
    current.disconnect();
    current.connect();
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * One shared Socket.IO connection. The API's current authentication contract
 * is a short-lived Bearer access token in the handshake, refreshed through the
 * HttpOnly refresh cookie. Do not switch this to cookie-only auth unless the
 * backend socket middleware is migrated at the same time.
 */
export function getSocket(): Socket {
  if (!SOCKET_URL) throw new Error("Socket.IO server URL is not configured.");

  if (!socket) {
    const current = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      auth: (callback) => callback({ token: getAccessToken() }),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
    });

    socket = current;

    unsubscribeToken = onAccessTokenChange((token) => {
      if (!token) {
        disconnectSocket();
        return;
      }
      if (current.connected) current.emit("update_token", token);
    });

    current.on("token_expired", () => {
      void reconnectWithFreshToken(current);
    });

    current.on("connect_error", (error) => {
      if (error.message === "ACCESS_TOKEN_EXPIRED") {
        void reconnectWithFreshToken(current);
      }
    });

    current.on("session_invalid", () => {
      current.disconnect();
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  unsubscribeToken?.();
  unsubscribeToken = null;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
