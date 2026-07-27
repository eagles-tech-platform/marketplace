import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Search, Send, Paperclip, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { useChat } from "@/hooks/useChat";
import { uploadFile } from "@/lib/upload";

export default function CustomerChat() {
  const [searchParams] = useSearchParams();
  const withUserId = searchParams.get("with");
  const targetRoomId = searchParams.get("room");
  const {
    rooms,
    loadingRooms,
    selectedRoomId,
    otherParticipant,
    messages,
    loadingMessages,
    typingUserId,
    errorMessage,
    selectRoom,
    openWithUser,
    sendMessage,
    setTyping,
    currentUserId,
  } = useChat();

  const [messageInput, setMessageInput] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const handleAttach = async (file: File | undefined) => {
    if (!file) return;
    setAttaching(true);
    setAttachError(null);
    try {
      const url = await uploadFile(file);
      sendMessage("", url);
    } catch {
      setAttachError("Could not upload attachment.");
    } finally {
      setAttaching(false);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (withUserId) openWithUser(withUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withUserId]);

  useEffect(() => {
    if (targetRoomId && rooms.some((r) => r._id === targetRoomId)) selectRoom(targetRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRoomId, rooms]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    sendMessage(messageInput.trim());
    setMessageInput("");
    setTyping(false);
  };

  const handleTypingChange = (value: string) => {
    setMessageInput(value);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 1500);
  };

  const filteredRooms = rooms.filter((r) => {
    const other = r.participants.find((p) => p._id !== currentUserId);
    return !roomSearch || other?.name.toLowerCase().includes(roomSearch.toLowerCase());
  });

  return (
    <DashboardLayout role="customer" title="Chat">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
        <div className="grid lg:grid-cols-3 h-full">
          {/* Conversations List */}
          <div className="border-r border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search conversations..."
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-sm border-slate-200"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingRooms ? (
                <p className="text-sm text-slate-400 p-4">Loading conversations...</p>
              ) : filteredRooms.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  No conversations yet. Start one from a service page.
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const other = room.participants.find((p) => p._id !== currentUserId);
                  return (
                    <button
                      key={room._id}
                      onClick={() => selectRoom(room._id)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 ${
                        selectedRoomId === room._id ? "bg-teal-50 border-l-4 border-l-teal-500" : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <img src={other?.avatar || "/avatar-provider-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800 truncate">{other?.name || "User"}</p>
                          {room.lastMessageAt && (
                            <span className="text-xs text-slate-400 shrink-0">{new Date(room.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{room.lastMessage || "No messages yet"}</p>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center shrink-0">
                          {room.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 flex flex-col h-full">
            {!selectedRoomId ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a conversation to start chatting
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <img src={otherParticipant?.avatar || "/avatar-provider-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{otherParticipant?.name || "User"}</p>
                      <p className="text-xs text-slate-500">{typingUserId ? "Typing..." : "\u00A0"}</p>
                    </div>
                  </div>
                </div>

                {(errorMessage || attachError) && (
                  <div className="px-4 pt-3">
                    <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-xs text-red-600">{errorMessage || attachError}</div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMessages ? (
                    <p className="text-sm text-slate-400">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center pt-10">No messages yet — say hello.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender === currentUserId;
                      return (
                        <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isMe ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-br-md" : "bg-slate-100 text-slate-700 rounded-bl-md"
                          }`}>
                            {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                            {msg.attachmentUrl && (
                              /\.(jpe?g|png|webp|gif)$/i.test(msg.attachmentUrl) ? (
                                <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-1">
                                  <img src={msg.attachmentUrl} alt="Attachment" className="max-w-[200px] rounded-lg" />
                                </a>
                              ) : (
                                <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className={`text-xs underline block mt-1 ${isMe ? "text-white/90" : "text-teal-600"}`}>
                                  📎 Attachment
                                </a>
                              )
                            )}
                            <p className={`text-xs mt-1 ${isMe ? "text-white/70" : "text-slate-400"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      title="Attach a file"
                      onClick={() => attachInputRef.current?.click()}
                      disabled={attaching}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {attaching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <input
                      ref={attachInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleAttach(e.target.files?.[0])}
                    />
                    <Input
                      value={messageInput}
                      onChange={(e) => handleTypingChange(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 rounded-full border-slate-200 h-10"
                    />
                    <Button onClick={handleSend} size="sm" className="rounded-full bg-teal-500 hover:bg-teal-600 h-10 w-10 p-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
