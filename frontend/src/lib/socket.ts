import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getAccessToken, onAccessTokenChange, refreshAccessToken } from "@/lib/api";

// The backend serves Socket.io on the same origin/port as the REST API —
// strip the "/api" suffix to get the base server URL.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;
let unsubscribeToken: (() => void) | null = null;

/** Gets a fresh token, then reconnects. Gives up (stays disconnected) if the session is gone. */
async function reconnectWithFreshToken(s: Socket) {
  const token = await refreshAccessToken();
  if (token && socket === s) s.connect();
}

/** Returns a shared socket authenticated with the in-memory access token. */
export function getSocket(): Socket {
  if (!socket) {
    const s = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      // Evaluated on every (re)connect, so it always sends the newest token.
      auth: (cb) => cb({ token: getAccessToken() }),
    });
    socket = s;

    // Hand each refreshed token to the live connection so it never expires mid-chat.
    unsubscribeToken = onAccessTokenChange((token) => {
      if (!token) return disconnectSocket(); // logged out or session lost
      if (s.connected) s.emit("update_token", token);
    });

    s.on("token_expired", () => void reconnectWithFreshToken(s));
    s.on("connect_error", (err) => {
      if (err.message === "ACCESS_TOKEN_EXPIRED") void reconnectWithFreshToken(s);
    });
    // session_invalid: the account was signed out or deactivated — stay disconnected.
  }
  return socket;
}

export function disconnectSocket() {
  unsubscribeToken?.();
  unsubscribeToken = null;
  socket?.disconnect();
  socket = null;
}
