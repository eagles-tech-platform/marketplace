import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi, ApiError, type ChatRoomItem, type ChatMessageItem } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/hooks/useAuth";

export function useChat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedRoomIdRef = useRef<string | null>(null);
  selectedRoomIdRef.current = selectedRoomId;

  // Load conversation list once on mount
  useEffect(() => {
    chatApi
      .rooms()
      .then((res) => {
        setRooms(res.rooms);
        if (res.rooms.length > 0 && !selectedRoomIdRef.current) {
          selectRoom(res.rooms[0]._id);
        }
      })
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load conversations."))
      .finally(() => setLoadingRooms(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket listeners — set up once, always reference the LATEST selected room via ref
  useEffect(() => {
    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessageItem) => {
      if (msg.chatRoom === selectedRoomIdRef.current) {
        setMessages((prev) => [...prev, msg]);
      }
      setRooms((prev) =>
        prev.map((r) =>
          r._id === msg.chatRoom
            ? {
                ...r,
                lastMessage: msg.content || (msg.attachmentUrl ? "📎 Attachment" : ""),
                lastMessageAt: msg.createdAt,
                unreadCount:
                  msg.sender === user?.id || msg.chatRoom === selectedRoomIdRef.current
                    ? r.unreadCount
                    : r.unreadCount + 1,
              }
            : r
        )
      );
    };

    const handleTyping = ({ roomId, userId, isTyping }: { roomId: string; userId: string; isTyping: boolean }) => {
      if (roomId !== selectedRoomIdRef.current) return;
      setTypingUserId(isTyping ? userId : null);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("typing", handleTyping);
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("typing", handleTyping);
    };
  }, [user?.id]);

  const selectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
    setTypingUserId(null);
    getSocket().emit("join_room", roomId);
    setLoadingMessages(true);
    chatApi
      .messages(roomId)
      .then((res) => setMessages(res.messages))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load messages."))
      .finally(() => setLoadingMessages(false));
    setRooms((prev) => prev.map((r) => (r._id === roomId ? { ...r, unreadCount: 0 } : r)));
  }, []);

  /** Used when arriving from "Chat with Provider" on a service page — starts or resumes a DM. */
  const openWithUser = useCallback(
    async (otherUserId: string) => {
      try {
        const res = await chatApi.getOrCreateRoom(otherUserId);
        setRooms((prev) => (prev.some((r) => r._id === res.room._id) ? prev : [res.room, ...prev]));
        selectRoom(res.room._id);
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : "Could not start conversation.");
      }
    },
    [selectRoom]
  );

  const sendMessage = useCallback(
    (content: string, attachmentUrl?: string) => {
      if (!selectedRoomId || (!content.trim() && !attachmentUrl)) return;
      getSocket().emit(
        "send_message",
        { roomId: selectedRoomId, content, attachmentUrl },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok) setErrorMessage(ack?.error || "Could not send message.");
        }
      );
    },
    [selectedRoomId]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!selectedRoomId) return;
      getSocket().emit("typing", { roomId: selectedRoomId, isTyping });
    },
    [selectedRoomId]
  );

  const selectedRoom = rooms.find((r) => r._id === selectedRoomId) || null;
  const otherParticipant = selectedRoom?.participants.find((p) => p._id !== user?.id) || null;

  return {
    rooms,
    loadingRooms,
    selectedRoomId,
    selectedRoom,
    otherParticipant,
    messages,
    loadingMessages,
    typingUserId,
    errorMessage,
    selectRoom,
    openWithUser,
    sendMessage,
    setTyping,
    currentUserId: user?.id,
  };
}
