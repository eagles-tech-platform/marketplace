import { useCallback, useEffect, useRef, useState } from "react";
import {
chatApi,
  ApiError,
  type ChatRoomItem,
  type ChatMessageItem,
} from "@/lib/api";
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

  // Keep references synchronized with the latest rendered state.
  const selectedRoomIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | undefined>(user?.id);

  const messageRequestRef = useRef(0);
  const roomsRequestRef = useRef(0);

  selectedRoomIdRef.current = selectedRoomId;
  currentUserIdRef.current = user?.id;

  /**
   * Insert or update a conversation without creating duplicates.
   * Most recently active conversations appear first.
   */
  const upsertRoom = useCallback((room: ChatRoomItem) => {
    setRooms((prev) => {
      const exists = prev.some((item) => item._id === room._id);

      const updated = exists
        ? prev.map((item) =>
            item._id === room._id ? { ...item, ...room } : item
          )
        : [room, ...prev];

      return updated.sort((a, b) => {
        const dateA = a.lastMessageAt
          ? new Date(a.lastMessageAt).getTime()
          : 0;

        const dateB = b.lastMessageAt
          ? new Date(b.lastMessageAt).getTime()
          : 0;

        return dateB - dateA;
      });
    });
  }, []);

  /**
   * Update the conversation preview after a message arrives.
   */
  const updateRoomPreview = useCallback(
    (msg: ChatMessageItem) => {
      setRooms((prev) => {
        const exists = prev.some((room) => room._id === msg.chatRoom);

        if (!exists) return prev;

        return prev
          .map((room) => {
            if (room._id !== msg.chatRoom) return room;

            const isOwnMessage = msg.sender === currentUserIdRef.current;
            const isActiveRoom =
              msg.chatRoom === selectedRoomIdRef.current;

            return {
              ...room,
              lastMessage:
                msg.content || (msg.attachmentUrl ? "📎 Attachment" : ""),
              lastMessageAt: msg.createdAt,
              unreadCount:
                isOwnMessage || isActiveRoom
                  ? room.unreadCount
                  : room.unreadCount + 1,
            };
          })
          .sort((a, b) => {
            const dateA = a.lastMessageAt
              ? new Date(a.lastMessageAt).getTime()
              : 0;

            const dateB = b.lastMessageAt
              ? new Date(b.lastMessageAt).getTime()
              : 0;

            return dateB - dateA;
          });
      });
    },
    []
  );

  /**
   * Load conversations.
   */
  const loadRooms = useCallback(async () => {
    const requestId = ++roomsRequestRef.current;

    setLoadingRooms(true);
    setErrorMessage(null);

    try {
      const res = await chatApi.rooms();

      if (requestId !== roomsRequestRef.current) return;

      setRooms(res.rooms);

      if (
        res.rooms.length > 0 &&
        !selectedRoomIdRef.current
      ) {
        selectRoom(res.rooms[0]._id);
      }
    } catch (err) {
      if (requestId !== roomsRequestRef.current) return;

      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "Could not load conversations."
      );
    } finally {
      if (requestId === roomsRequestRef.current) {
        setLoadingRooms(false);
      }
    }
  }, []);

  /**
   * Select a conversation and load its messages.
   */
  const selectRoom = useCallback((roomId: string) => {
    if (!roomId) return;

    const socket = getSocket();
    const previousRoomId = selectedRoomIdRef.current;

    // Ignore repeated selection of the active conversation.
    if (previousRoomId === roomId) return;

    // Invalidate previous message requests.
    messageRequestRef.current += 1;
    const requestId = messageRequestRef.current;

    // Leave the previous Socket.IO room.
    if (previousRoomId) {
      socket.emit("leave_room", previousRoomId);
    }

    // Update active conversation immediately.
    selectedRoomIdRef.current = roomId;
    setSelectedRoomId(roomId);

    setMessages([]);
    setTypingUserId(null);
    setErrorMessage(null);
    setLoadingMessages(true);

    // Join the new Socket.IO room.
    if (socket.connected) {
      socket.emit("join_room", roomId);
    }

    // Reset local unread count.
    setRooms((prev) =>
      prev.map((room) =>
        room._id === roomId
          ? { ...room, unreadCount: 0 }
          : room
      )
    );

    // Fetch conversation messages.
    chatApi
      .messages(roomId)
      .then((res) => {
        // Ignore stale responses from previously selected rooms.
        if (
          requestId !== messageRequestRef.current ||
          selectedRoomIdRef.current !== roomId
        ) {
          return;
        }

        setMessages(res.messages);
      })
      .catch((err) => {
        if (
          requestId !== messageRequestRef.current ||
          selectedRoomIdRef.current !== roomId
        ) {
          return;
        }

        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : "Could not load messages."
        );
      })
      .finally(() => {
        if (requestId === messageRequestRef.current) {
          setLoadingMessages(false);
        }
      });
  }, []);

  /**
   * Load conversations when the hook mounts.
   */
  useEffect(() => {
    void loadRooms();

    return () => {
      roomsRequestRef.current += 1;
      messageRequestRef.current += 1;
    };
  }, [loadRooms]);

  /**
   * Socket.IO listeners.
   *
   * These listeners are registered once and use refs to access
   * the latest selected room and authenticated user.
   */
  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessageItem) => {
      if (!msg?._id || !msg.chatRoom) return;

      // Update the conversation preview and unread count.
      updateRoomPreview(msg);

      // Only append messages belonging to the active conversation.
      if (msg.chatRoom !== selectedRoomIdRef.current) return;

      setMessages((prev) => {
        // Prevent duplicate socket messages.
        if (prev.some((item) => item._id === msg._id)) {
          return prev;
        }

        return [...prev, msg];
      });
    };

    const handleTyping = (payload: {
      roomId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (payload.roomId !== selectedRoomIdRef.current) return;

      // Ignore typing events from the current user.
      if (payload.userId === currentUserIdRef.current) return;

      setTypingUserId(
        payload.isTyping ? payload.userId : null
      );
    };

    /**
     * Rejoin the active conversation after reconnection.
     */
    const handleConnect = () => {
      const activeRoomId = selectedRoomIdRef.current;

      if (activeRoomId) {
        socket.emit("join_room", activeRoomId);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("new_message", handleNewMessage);
    socket.on("typing", handleTyping);

    // Handle sockets that connected before listener registration.
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("new_message", handleNewMessage);
      socket.off("typing", handleTyping);
    };
  }, [user?.id, updateRoomPreview]);

  /**
   * Start a new conversation or resume an existing one.
   */
  const openWithUser = useCallback(
    async (otherUserId: string) => {
      if (!otherUserId) {
        setErrorMessage("Invalid user selected.");
        return;
      }

      if (otherUserId === user?.id) {
        setErrorMessage("You cannot start a conversation with yourself.");
        return;
      }

      setErrorMessage(null);

      try {
        const res = await chatApi.getOrCreateRoom(otherUserId);

        upsertRoom(res.room);

        selectRoom(res.room._id);
      } catch (err) {
        setErrorMessage(
          err instanceof ApiError
            ? err.message
            : "Could not start conversation."
        );
      }
    },
    [user?.id, upsertRoom, selectRoom]
  );

  /**
   * Send a message to the active conversation.
   */
  const sendMessage = useCallback(
    (content: string, attachmentUrl?: string) => {
      if (!selectedRoomId) {
        setErrorMessage("Select a conversation first.");
        return;
      }

      if (!content.trim() && !attachmentUrl) return;

      const socket = getSocket();

      if (!socket.connected) {
        setErrorMessage(
          "Chat is reconnecting. Please try again."
        );
        return;
      }

      setErrorMessage(null);

      socket.timeout(10000).emit(
        "send_message",
        {
          roomId: selectedRoomId,
          content: content.trim(),
          attachmentUrl,
        },
        (
          timeoutError: Error | null,
          ack: {
            ok: boolean;
            error?: string;
          }
        ) => {
          if (timeoutError) {
            setErrorMessage(
              "Message send timed out. Check your connection and retry."
            );
            return;
          }

          if (!ack?.ok) {
            setErrorMessage(
              ack?.error || "Could not send message."
            );
          }
        }
      );
    },
    [selectedRoomId]
  );

  /**
   * Notify other participants that the current user is typing.
   */
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!selectedRoomId) return;

      const socket = getSocket();

      if (!socket.connected) return;

      socket.emit("typing", {
        roomId: selectedRoomId,
        isTyping,
      });
    },
    [selectedRoomId]
  );

  /**
   * Derived conversation information.
   */
  const selectedRoom =
    rooms.find((room) => room._id === selectedRoomId) || null;

  const otherParticipant =
    selectedRoom?.participants.find(
      (participant) => participant._id !== user?.id
    ) || null;

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

    loadRooms,

    currentUserId: user?.id,
  };
}
