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
  const [receiverId, setReceiverId] = useState("");
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef();
  const bottomRef = useRef();
  const user = JSON.parse(localStorage.getItem("user"));


  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);


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
      if (senderId === receiverId) setIsTyping(true);
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (senderId === receiverId) setIsTyping(false);
    });

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        return exists ? prev : [...prev, msg];
      });
    });

    return () => socket.disconnect();
  }, [receiverId]);

  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await API.get("/api/users");
        setUsers([{ ...user, username: "You (self)" }, ...data.filter((u) => u._id !== user._id)]);
      } catch (err) {}
    };
    fetchUsers();
  }, []);


  const loadMessages = async (id) => {
    setReceiverId(id);
    setSidebarOpen(false);

    try {
      const { data } = await API.get(`/api/messages/${id}?type=user`);
      setMessages(data);
    } catch (err) {}
  };


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const sendMessage = async (e) => {
    e.preventDefault();
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
    } catch {}
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !receiverId) return alert("Select a chat first.");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("receiverId", receiverId);

      const { data } = await API.post("/api/messages/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessages((prev) => [...prev, data]);

      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
      });
    } catch {}
  };

 
  const groupByDate = (msgs) =>
    msgs.reduce((acc, m) => {
      const d = dayjs(m.createdAt).format("YYYY-MM-DD");
      if (!acc[d]) acc[d] = [];
      acc[d].push(m);
      return acc;
    }, {});

  const groupedMessages = groupByDate(messages);

 
  const selectedUser = users.find((u) => u._id === receiverId);

  /* DP URL */
  const dpUrl =
    selectedUser?.profilePic?.startsWith("http")
      ? selectedUser.profilePic
      : selectedUser?.profilePic
      ? `${import.meta.env.VITE_API_BASE_URL}${selectedUser.profilePic}`
      : "https://res.cloudinary.com/duwaxhwtj/image/upload/v173000/default_dp.png";

  const isOnline = receiverId && onlineUsers.has(receiverId);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#0A3A47] to-[#012A36] text-white">

    
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#0b3f4a]/80 backdrop-blur-md">

        
        {receiverId ? (
          <button
            className="text-2xl font-bold"
            onClick={() => setReceiverId("")}
          >
            ←
          </button>
        ) : (
          <button
            className="text-2xl font-bold"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        )}

      
        {receiverId && (
          <img
            src={dpUrl}
            className="w-8 h-8 rounded-full object-cover border border-white/30"
          />
        )}

   
        <span className="font-semibold truncate max-w-[120px]">
          {receiverId ? selectedUser?.username : "Select a chat"}
        </span>

       
        {receiverId && (
          <span
            className={`w-3 h-3 rounded-full ml-auto ${
              isOnline ? "bg-green-400" : "bg-gray-400"
            }`}
          />
        )}
      </div>

     
      <aside
        className={`bg-white/5 backdrop-blur-xl border-r border-white/10 p-4 pt-20 md:pt-4 md:static z-30
        ${sidebarOpen ? "absolute top-0 left-0 w-full h-full" : "hidden md:block md:w-1/4"}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Chats</h2>
          <Link to="/" className="bg-red-500 px-3 py-1 rounded-md text-sm">
            Logout
          </Link>
        </div>

        <ul className="space-y-3">
          {users.map((u) => {
            const dp =
              u.profilePic?.startsWith("http")
                ? u.profilePic
                : u.profilePic
                ? `${import.meta.env.VITE_API_BASE_URL}${u.profilePic}`
                : "https://res.cloudinary.com/duwaxhwtj/image/upload/v173000/default_dp.png";

            const online = onlineUsers.has(u._id);

            return (
              <li
                key={u._id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/10 ${
                  receiverId === u._id ? "bg-white/20" : ""
                }`}
                onClick={() => loadMessages(u._id)}
              >
                <div className="relative">
                  <img src={dp} className="w-10 h-10 rounded-full" />
                  <span
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-1 ring-white ${
                      online ? "bg-green-400" : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <span className="font-medium truncate">{u.username}</span>
                  <div className="text-xs text-white/70">
                    {online ? "Online" : "Offline"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      
      <main className="flex-1 flex flex-col pt-16 md:pt-0">

       
        <div className="hidden md:flex justify-between items-center p-4 bg-white/10">
          <div className="flex items-center gap-3">
            {receiverId && <img src={dpUrl} className="w-8 h-8 rounded-full" />}
            <h2 className="text-xl font-semibold">
              {receiverId ? selectedUser?.username : "Select a chat"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                socketConnected ? "bg-green-400" : "bg-gray-400"
              }`}
            />
            {socketConnected ? "Online" : "Offline"}
          </div>
        </div>

     
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!receiverId && (
            <div className="text-center text-white/70 mt-20">
              Select a chat to begin
            </div>
          )}

          {receiverId &&
            Object.keys(groupedMessages).map((date) => (
              <div key={date}>
                <div className="text-center text-xs text-white/60 mb-2">
                  {dayjs(date).format("MMM D, YYYY")}
                </div>

                {groupedMessages[date].map((msg) => {
                  const mine = msg.sender === user._id;
                  const fileUrl = msg.fileUrl
                    ? msg.fileUrl.startsWith("http")
                      ? msg.fileUrl
                      : `${import.meta.env.VITE_API_BASE_URL}${msg.fileUrl}`
                    : null;

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`p-3 rounded-xl max-w-xs md:max-w-md ${
                          mine ? "bg-teal-700" : "bg-white/20"
                        }`}
                      >
                        {fileUrl ? (
                          msg.fileType?.startsWith("image/") ? (
                            <img
                              src={fileUrl}
                              className="rounded-lg max-w-[220px]"
                            />
                          ) : (
                            <a
                              href={fileUrl}
                              download
                              className="text-blue-300 underline"
                            >
                              Download file
                            </a>
                          )
                        ) : (
                          <div>{msg.content}</div>
                        )}

                        <div className="text-[10px] text-gray-300 text-right mt-1">
                          {dayjs(msg.createdAt).format("hh:mm A")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          <div ref={bottomRef}></div>
        </div>

       
        {receiverId && (
          <form
            onSubmit={sendMessage}
            className="p-4 flex items-center gap-3 bg-white/10"
          >
            <label className="cursor-pointer bg-white/20 p-2 rounded-lg text-xl">
              📎
              <input className="hidden" type="file" onChange={handleFileUpload} />
            </label>

            <button
              type="button"
              className="text-2xl"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😀
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-20 left-5">
                <EmojiPicker
                  theme="dark"
                  onEmojiClick={(emoji) =>
                    setNewMsg((prev) => prev + emoji.emoji)
                  }
                />
              </div>
            )}

            <input
              className="flex-1 p-3 rounded-xl bg-white/20 outline-none"
              placeholder="Type a message..."
              value={newMsg}
              onChange={(e) => {
                setNewMsg(e.target.value);
                socketRef.current.emit("typing", {
                  senderId: user._id,
                  receiverId,
                });
              }}
            />

            <button className="px-4 py-2 bg-teal-600 rounded-xl">
              Send
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default Chat;
