/** FULL UPDATED CHAT.JSX — MOBILE HEADER FIXED **/

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import API from "../utils/axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import EmojiPicker from "emoji-picker-react";
import { Link } from "react-router-dom";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

let typingTimeout;

const Chat = () => {
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [receiverId, setReceiverId] = useState(""); // <--- Controls mobile behavior
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [menuMessage, setMenuMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [forwarding, setForwarding] = useState(null);
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef();
  const bottomRef = useRef();
  const user = JSON.parse(localStorage.getItem("user"));

  /* RAZORPAY SCRIPT */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  /* SOCKET SETUP */
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_BASE_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("userOnline", user._id);
      socket.emit("getOnlineUsers");
    });

    socket.emit("joinUser", user._id);

    socket.on("onlineUsers", (list = []) => setOnlineUsers(new Set(list)));

    socket.on("userOnline", (id) =>
      setOnlineUsers((prev) => new Set([...prev, id]))
    );

    socket.on("userOffline", (id) =>
      setOnlineUsers((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      })
    );

    socket.on("typing", ({ senderId }) => {
      if (senderId !== user._id && senderId === receiverId) setIsTyping(true);
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (senderId !== user._id && senderId === receiverId) setIsTyping(false);
    });

    socket.on("limitReached", () => setShowModal(true));

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        return exists ? prev : [...prev, msg];
      });
    });

    socket.on("disconnect", () => setSocketConnected(false));

    return () => socket.disconnect();
  }, [receiverId]);

  /* FETCH USERS */
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await API.get("/api/users");
        setUsers([{ ...user, username: "You (self)" }, ...data.filter((u) => u._id !== user._id)]);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  /* LOAD MESSAGES */
  const loadMessages = async (id) => {
    setReceiverId(id);
    setSidebarOpen(false);

    try {
      const { data } = await API.get(`/api/messages/${id}?type=user`);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages");
    }
  };

  /* AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* SEND MESSAGE */
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMsg.trim() || !receiverId) return;

    try {
      const { data } = await API.post("/api/messages", {
        receiverId,
        content: newMsg,
      });

      setMessages((prev) => [...prev, data]);
      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        content: newMsg,
      });
      setNewMsg("");
    } catch {
      alert("Message failed");
    }
  };

  /* FILE UPLOAD */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !receiverId) return alert("Select a chat first.");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("receiverId", receiverId);

      const { data } = await API.post("/api/messages/upload", form);

      setMessages((prev) => [...prev, data]);
      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
      });
    } catch {
      alert("Invalid file!");
    }
  };

  /* MOBILE HEADER LOGIC */
  const mobileTitle = receiverId
    ? users.find((u) => u._id === receiverId)?.username || "Chat"
    : "Select a chat";

  const isOnline = receiverId && onlineUsers.has(receiverId);

  /* GROUP MESSAGES */
  const groupByDate = (msgs) =>
    msgs.reduce((acc, msg) => {
      const d = dayjs(msg.createdAt).format("YYYY-MM-DD");
      if (!acc[d]) acc[d] = [];
      acc[d].push(msg);
      return acc;
    }, {});

  const groupedMessages = groupByDate(messages);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#0A3A47] to-[#012A36] text-white">

      {/* 📱 MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0b3f4a]/80 backdrop-blur-md">

        {/* LEFT BUTTON */}
        {receiverId ? (
          <button
            onClick={() => setReceiverId("")}
            className="text-2xl font-bold"
          >
            ←
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="text-2xl font-bold"
          >
            ☰
          </button>
        )}

        {/* CENTER TITLE */}
        <span className="font-semibold truncate max-w-[140px] text-center mx-auto">
          {mobileTitle}
        </span>

        {/* RIGHT ONLINE DOT */}
        {receiverId ? (
          <span
            className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-400" : "bg-gray-400"}`}
          />
        ) : (
          <span className="w-3 h-3 opacity-0" /> // placeholder for alignment
        )}
      </div>

      {/* SIDEBAR */}
      <aside
        className={`bg-white/5 backdrop-blur-xl border-r border-white/10 p-4 pt-20 md:pt-4 md:static z-30
          ${sidebarOpen ? "absolute top-0 left-0 w-full h-full" : "hidden md:block md:w-1/4"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Chats</h2>
          <Link to="/" className="bg-red-500 px-3 py-1 text-white rounded-md text-sm">Logout</Link>
        </div>

        <ul className="space-y-3">
          {users.map((u) => {
            const dp = u.profilePic?.startsWith("http")
              ? u.profilePic
              : `${import.meta.env.VITE_API_BASE_URL}${u.profilePic}`;

            const online = onlineUsers.has(u._id);

            return (
              <li
                key={u._id}
                onClick={() => loadMessages(u._id)}
                className={`flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-white/10
                  ${receiverId === u._id ? "bg-white/20" : ""}`}
              >
                <div className="relative">
                  <img
                    src={dp || "https://res.cloudinary.com/duwaxhwtj/image/upload/v173000/default_dp.png"}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-1 ring-white ${
                      online ? "bg-green-400" : "bg-gray-400"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{u.username}</span>
                    {u.isPremium && <span>⭐</span>}
                  </div>
                  <span className="text-xs text-white/70">
                    {online ? "Online" : "Offline"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col pt-16 md:pt-0">

        {/* HEADER (DESKTOP ONLY) */}
        <div className="hidden md:flex justify-between items-center p-4 bg-white/10">
          <h2 className="text-xl font-semibold">
            {receiverId
              ? users.find((u) => u._id === receiverId)?.username
              : "Select a chat"}
          </h2>

          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full 
              ${socketConnected ? "bg-green-400" : "bg-gray-400"}`} />
            {socketConnected ? "Online" : "Offline"}
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!receiverId && (
            <div className="text-center text-white/50 mt-10">
              Select a chat to start messaging
            </div>
          )}

          {receiverId &&
            Object.keys(groupedMessages).map((d) => (
              <div key={d}>
                <div className="text-center text-xs text-white/60 mb-3">
                  {dayjs(d).isToday()
                    ? "Today"
                    : dayjs(d).isYesterday()
                    ? "Yesterday"
                    : dayjs(d).format("MMM D")}
                </div>

                {groupedMessages[d].map((m) => {
                  const mine = m.sender === user._id;

                  return (
                    <div
                      key={m._id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`p-3 rounded-xl max-w-xs md:max-w-md ${
                        mine ? "bg-[#13747D]" : "bg-white/20"
                      }`}>
                        {m.fileUrl ? (
                          m.fileType?.startsWith("image/") ? (
                            <img
                              src={
                                m.fileUrl.startsWith("http")
                                  ? m.fileUrl
                                  : `${import.meta.env.VITE_API_BASE_URL}${m.fileUrl}`
                              }
                              className="rounded-lg max-w-[220px]"
                            />
                          ) : (
                            <a
                              href={
                                m.fileUrl.startsWith("http")
                                  ? m.fileUrl
                                  : `${import.meta.env.VITE_API_BASE_URL}${m.fileUrl}`
                              }
                              download
                              className="underline text-blue-300"
                            >
                              Download file
                            </a>
                          )
                        ) : (
                          <div>{m.content}</div>
                        )}

                        <div className="text-[10px] text-gray-300 text-right mt-1">
                          {dayjs(m.createdAt).format("hh:mm A")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          <div ref={bottomRef}></div>
        </div>

        {/* INPUT */}
        {receiverId && (
          <form
            onSubmit={sendMessage}
            className="flex items-center gap-3 p-4 bg-white/10"
          >
            <label className="cursor-pointer bg-white/20 p-2 rounded-lg text-xl">
              📎
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((s) => !s)}
              className="text-2xl"
            >
              😀
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-20 left-5">
                <EmojiPicker
                  theme="dark"
                  onEmojiClick={(e) => setNewMsg((p) => p + e.emoji)}
                />
              </div>
            )}

            <input
              value={newMsg}
              onChange={(e) => {
                setNewMsg(e.target.value);
                socketRef.current.emit("typing", {
                  senderId: user._id,
                  receiverId,
                });
              }}
              className="flex-1 p-3 rounded-xl bg-white/20 outline-none"
              placeholder="Type a message..."
            />

            <button className="bg-teal-500 px-4 py-2 rounded-xl">
              Send
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default Chat;
