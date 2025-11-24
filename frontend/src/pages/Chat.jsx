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
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user"))
  );

  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [receiverId, setReceiverId] = useState("");
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

  // Profile modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const socketRef = useRef();
  const bottomRef = useRef();

  const defaultDp =
    "https://res.cloudinary.com/duwaxhwtj/image/upload/v173000/default_dp.png";

  const getDpFromUser = (u) => {
    if (!u || !u.profilePic) return defaultDp;
    return u.profilePic.startsWith("http")
      ? u.profilePic
      : `${import.meta.env.VITE_API_BASE_URL}${u.profilePic}`;
  };

  // Active chat user + title + dp
  const activeChatUser =
    receiverId && user
      ? receiverId === user._id
        ? user
        : users.find((u) => u._id === receiverId)
      : null;

  const titleText = receiverId
    ? receiverId === user?._id
      ? "You (self)"
      : activeChatUser?.username || "Chat"
    : "Select a chat";

  const activeDp = activeChatUser ? getDpFromUser(activeChatUser) : defaultDp;

  const currentUserBaseDp = getDpFromUser(user);
  const currentUserDp = profilePreview || currentUserBaseDp;

  /* ----------------------------------------------------
     Load Razorpay script once
  ---------------------------------------------------- */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  /* ----------------------------------------------------
     Socket.io setup
  ---------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

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

    socket.on("userOnline", (id) => {
      setOnlineUsers((prev) => new Set([...Array.from(prev), id]));
    });

    socket.on("userOffline", (id) => {
      setOnlineUsers((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    });

    socket.on("onlineUsers", (list = []) => {
      setOnlineUsers(new Set(list));
    });

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

    socket.on("disconnect", () => {
      setSocketConnected(false);
      socket.emit("userOffline", user._id);
    });

    return () => {
      socket.emit("userOffline", user._id);
      socket.disconnect();
    };
  }, [user, receiverId]);

  /* ----------------------------------------------------
     Load users
  ---------------------------------------------------- */
  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      try {
        const { data } = await API.get("/api/users");
        setUsers([
          { ...user, username: "You (self)" },
          ...data.filter((u) => u._id !== user._id),
        ]);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, [user]);

  /* ----------------------------------------------------
     Load messages for selected user
  ---------------------------------------------------- */
  const loadMessages = async (id) => {
    setReceiverId(id);
    setSidebarOpen(false);
    try {
      const { data } = await API.get(`/api/messages/${id}?type=user`);
      setMessages(data);
      setIsTyping(false);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const handleBackFromChat = () => {
    setReceiverId("");
    setMessages([]);
    setIsTyping(false);
  };

  /* ----------------------------------------------------
     Scroll to latest message
  ---------------------------------------------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ----------------------------------------------------
     Send message
  ---------------------------------------------------- */
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMsg.trim() || !receiverId) return;

    const payload = { receiverId, content: newMsg };
    try {
      const { data } = await API.post("/api/messages", payload);

      setMessages((prev) => [...prev, data]);

      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        content: newMsg,
      });

      setNewMsg("");
    } catch (err) {
      console.error("Send failed:", err);
      if (err.response?.status === 403) setShowModal(true);
      else alert("Failed to send message");
    }
  };

  /* ----------------------------------------------------
     File upload
  ---------------------------------------------------- */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !receiverId) {
      alert("Select a conversation first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiverId", receiverId);

    try {
      const { data } = await API.post("/api/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessages((prev) => [...prev, data]);

      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        content: data.content || "",
        fileUrl: data.fileUrl,
        fileType: data.fileType,
      });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Unsupported file! Try another.");
    }
  };

  /* ----------------------------------------------------
     Delete / forward
  ---------------------------------------------------- */
  const deleteForMe = async () => {
    if (!menuMessage) return;
    try {
      await API.put(`/api/messages/delete-for-me/${menuMessage._id}`);
      setMessages((prev) => prev.filter((m) => m._id !== menuMessage._id));
    } catch (err) {
      console.error("Delete for me failed", err);
    } finally {
      setShowMenu(false);
      setMenuMessage(null);
    }
  };

  const deleteForEveryone = async () => {
    if (!menuMessage) return;
    try {
      await API.put(`/api/messages/delete-everyone/${menuMessage._id}`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === menuMessage._id
            ? { ...m, content: "This message was deleted", fileUrl: "" }
            : m
        )
      );
    } catch (err) {
      console.error("Delete for everyone failed", err);
    } finally {
      setShowMenu(false);
      setMenuMessage(null);
    }
  };

  const startForward = (msg, e) => {
    e.stopPropagation();
    setForwarding(msg);
    setShowForwardPicker(true);
  };

  const forwardToUser = async (targetUserId) => {
    if (!forwarding || !targetUserId) return;
    try {
      const payload = {
        receiverId: targetUserId,
        content: forwarding.content || "",
      };
      if (forwarding.fileUrl) {
        payload.fileUrl = forwarding.fileUrl;
        payload.fileType = forwarding.fileType;
      }

      const { data } = await API.post("/api/messages", payload);

      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId: targetUserId,
        content: data.content || "",
        fileUrl: data.fileUrl,
        fileType: data.fileType,
      });

      setShowForwardPicker(false);
      setForwarding(null);

      if (targetUserId === receiverId) {
        setMessages((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Forward failed", err);
      alert("Forward failed");
    }
  };

  const openMenuAt = (e, msg) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const x = Math.max(12, Math.min(rect.left - 160, viewportWidth - 180));
    const y = rect.top + window.scrollY + 28;
    setMenuPos({ x, y });
    setMenuMessage(msg);
    setShowMenu(true);
  };

  useEffect(() => {
    const closeAll = () => {
      setShowMenu(false);
      setShowForwardPicker(false);
      setForwarding(null);
    };
    window.addEventListener("click", closeAll);
    return () => window.removeEventListener("click", closeAll);
  }, []);

  /* ----------------------------------------------------
     Typing indicator
  ---------------------------------------------------- */
  const emitTyping = () => {
    socketRef.current?.emit("typing", { senderId: user._id, receiverId });
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socketRef.current?.emit("stopTyping", { senderId: user._id, receiverId });
    }, 1000);
  };

  /* ----------------------------------------------------
     Upgrade to premium
  ---------------------------------------------------- */
  const handleUpgrade = async () => {
    try {
      const { data } = await API.post("/api/payment/create-order", {
        amount: 99,
        currency: "INR",
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "PesiGo Premium",
        description: "Unlock unlimited messaging",
        order_id: data.id,
        handler: async function (response) {
          try {
            const verify = await API.post("/api/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verify.data.success) {
              alert("Payment Successful! 🎉 You’re now Premium.");
              const updatedUser = { ...user, isPremium: true };
              setUser(updatedUser);
              localStorage.setItem("user", JSON.stringify(updatedUser));
              window.location.reload();
            } else {
              alert("Payment verification failed.");
            }
          } catch (err) {
            console.error("Verify error:", err);
            alert("Payment verification error");
          }
        },
        theme: { color: "#13747D" },
      };

      const razor = new window.Razorpay(options);
      razor.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Unable to start payment.");
    }
  };

  /* ----------------------------------------------------
     Date helpers
  ---------------------------------------------------- */
  const getDateLabel = (date) => {
    const d = dayjs(date);
    if (d.isToday()) return "Today";
    if (d.isYesterday()) return "Yesterday";
    return d.format("ddd, MMM D");
  };

  const groupByDate = (msgs) =>
    msgs.reduce((acc, msg) => {
      const day = dayjs(msg.createdAt).format("YYYY-MM-DD");
      if (!acc[day]) acc[day] = [];
      acc[day].push(msg);
      return acc;
    }, {});

  const groupedMessages = groupByDate(messages);

  /* ----------------------------------------------------
     Profile picture handlers
  ---------------------------------------------------- */
  const handleProfilePicSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleProfileSave = async () => {
    if (!profileFile) {
      alert("Please choose an image");
      return;
    }
    try {
      setSavingProfile(true);
      const formData = new FormData();
      formData.append("profilePic", profileFile);

      const { data } = await API.put("/api/users/update-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = { ...user, profilePic: data.profilePic };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setSavingProfile(false);
      setShowProfileModal(false);
      setProfileFile(null);
      setProfilePreview("");
    } catch (err) {
      console.error("Profile update failed", err);
      alert("Failed to update profile picture");
      setSavingProfile(false);
    }
  };

  /* ----------------------------------------------------
     Render
  ---------------------------------------------------- */
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-[#0A3A47] to-[#012A36] text-white">
      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-3 bg-[#0A3A47]/95">
        <div className="flex items-center gap-2 min-w-0">
          {receiverId ? (
            <button
              onClick={handleBackFromChat}
              className="bg-white/10 rounded-full px-3 py-1 text-lg"
            >
              ←
            </button>
          ) : (
            <button
              onClick={() => setSidebarOpen((s) => !s)}
              className="bg-white/10 rounded-full px-3 py-1 text-lg"
            >
              ☰
            </button>
          )}

          {receiverId && (
            <img
              src={activeDp}
              alt={activeChatUser?.username || "User"}
              className="w-8 h-8 rounded-full border border-white/30 object-cover"
            />
          )}

          <span className="font-semibold truncate max-w-[140px]">
            {titleText}
          </span>
        </div>

        <div className="flex items-center justify-end w-6">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              socketConnected ? "bg-green-400" : "bg-gray-400"
            }`}
          />
        </div>
      </div>

      {/* SIDEBAR */}
      <aside
        className={`bg-white/5 backdrop-blur-xl border-r border-white/10 p-4 md:static z-30 pt-16 md:pt-4
          ${
            sidebarOpen
              ? "absolute top-0 left-0 w-full h-full overflow-y-auto md:relative md:w-1/4 md:h-auto md:block"
              : "hidden md:block md:w-1/4 overflow-y-auto"
          }`}
      >
        <div className="flex justify-between items-center mb-6 gap-2">
          <h2 className="text-2xl font-bold tracking-tight truncate">
            Chats
          </h2>

          <div className="flex items-center gap-2">
            {/* Profile open button */}
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="hidden sm:flex items-center gap-2 bg-white/10 px-2 py-1 rounded-md text-xs"
            >
              <img
                src={currentUserDp}
                alt="Me"
                className="w-7 h-7 rounded-full border border-white/30 object-cover"
              />
              <span>Profile</span>
            </button>

            <Link
              to="/"
              className="bg-red-500 px-3 py-1 rounded-md text-white text-sm"
            >
              Logout
            </Link>
          </div>
        </div>

        <ul className="space-y-3">
          {users.map((u) => {
            const online = onlineUsers.has(u._id);
            const dp = getDpFromUser(u);

            return (
              <li
                key={u._id}
                onClick={() => loadMessages(u._id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition
                  ${
                    receiverId === u._id ? "bg-white/20 shadow-lg scale-[1.02]" : ""
                  }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={dp}
                    alt={u.username}
                    className="w-10 h-10 rounded-full border border-white/20 shadow-sm object-cover"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-1 ring-white ${
                      online ? "bg-green-400" : "bg-gray-400"
                    }`}
                    title={online ? "Online" : "Offline"}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{u.username}</span>
                    {u.isPremium && (
                      <span className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs">
                        ⭐
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/70">
                    {online ? "Online" : "Offline"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col pt-14 md:pt-0">
        {/* DESKTOP HEADER (hidden on mobile) */}
        <div className="hidden md:flex items-center justify-between gap-3 p-4 bg-white/10 backdrop-blur-md shadow-md md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {activeChatUser && (
              <img
                src={activeDp}
                alt={activeChatUser.username}
                className="w-8 h-8 rounded-full border border-white/30 object-cover"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate max-w-[420px]">
                {titleText}
              </h2>
              {isTyping && (
                <div className="text-xs text-yellow-300 animate-pulse mt-1">
                  Typing…
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-green-300 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? "bg-green-400 animate-ping" : "bg-gray-400"
              }`}
            />
            <span className="hidden md:inline">
              {socketConnected ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(groupedMessages).length === 0 && (
            <div className="text-center text-white/50 mt-10">
              No messages yet
            </div>
          )}

          {Object.keys(groupedMessages).map((date) => (
            <div key={date}>
              <div className="text-center text-xs text-gray-300 mb-3">
                {getDateLabel(date)}
              </div>

              {groupedMessages[date].map((m) => {
                const mine = m.sender === user._id;

                const msgFileUrl = m.fileUrl
                  ? m.fileUrl.startsWith("http")
                    ? m.fileUrl
                    : `${import.meta.env.VITE_API_BASE_URL}${m.fileUrl}`
                  : null;

                return (
                  <div
                    key={m._id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`group relative max-w-xs md:max-w-md p-3 rounded-xl shadow-md transition-all duration-150 ${
                        mine
                          ? "bg-[#13747D] text-white"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {/* Forward + Delete buttons */}
                      <div
                        className="absolute -top-2 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ transform: "translateY(-50%)" }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startForward(m, e);
                          }}
                          className="bg-white/10 p-1 rounded-md hover:bg-white/20"
                          title="Forward"
                        >
                          ↪️
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openMenuAt(e, m);
                          }}
                          className="bg-white/10 p-1 rounded-md hover:bg-white/20"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Message content */}
                      {m.content === "This message was deleted" ? (
                        <div className="italic text-gray-300">
                          {m.content}
                        </div>
                      ) : msgFileUrl ? (
                        m.fileType?.startsWith?.("image/") ? (
                          <img
                            src={msgFileUrl}
                            className="rounded-lg max-w-[220px] shadow-lg hover:scale-105 transition"
                            alt="sent file"
                          />
                        ) : (
                          <a
                            href={msgFileUrl}
                            download
                            className="text-blue-300 underline hover:text-blue-200"
                          >
                            📄 Download file
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

          <div ref={bottomRef} />
        </div>

        {/* INPUT BAR */}
        {receiverId && (
          <form
            onSubmit={sendMessage}
            className="p-4 flex items-center gap-3 bg-white/10 backdrop-blur-md shadow-inner md:px-6"
          >
            <label className="cursor-pointer bg-white/20 p-2 rounded-lg text-xl hover:bg-white/30 transition">
              📎
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((s) => !s)}
              className="text-2xl hover:scale-110 transition"
            >
              😀
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-20 left-5 z-[9999]">
                <EmojiPicker
                  theme="dark"
                  onEmojiClick={(emoji) => {
                    setNewMsg((prev) => prev + emoji.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}

            <input
              type="text"
              value={newMsg}
              onChange={(e) => {
                setNewMsg(e.target.value);
                emitTyping();
              }}
              placeholder="Type a message…"
              className="flex-1 p-3 rounded-xl bg-white/20 text-white placeholder-gray-300 outline-none"
            />

            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-600 transition px-4 py-2 rounded-xl text-white shadow-md"
            >
              Send
            </button>
          </form>
        )}

        {/* DELETE MENU */}
        {showMenu && menuMessage && (
          <div
            className="absolute bg-white text-black rounded-xl shadow-xl p-2 w-44 z-50"
            style={{ left: menuPos.x, top: menuPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={deleteForMe}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
            >
              Delete for me
            </button>

            {menuMessage.sender === user._id && (
              <button
                onClick={deleteForEveryone}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md"
              >
                Delete for everyone
              </button>
            )}
          </div>
        )}

        {/* FORWARD PICKER */}
        {showForwardPicker && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => {
              setShowForwardPicker(false);
              setForwarding(null);
            }}
          >
            <div
              className="bg-white text-black rounded-xl shadow-2xl p-4 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold mb-3">Forward message to</h3>

              <div className="max-h-56 overflow-auto space-y-2">
                {users
                  .filter((u) => u._id !== user._id)
                  .map((u) => (
                    <button
                      key={u._id}
                      onClick={() => forwardToUser(u._id)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100"
                    >
                      {u.username}{" "}
                      {onlineUsers.has(u._id) && (
                        <span className="text-xs text-green-600 ml-2">
                          ● online
                        </span>
                      )}
                    </button>
                  ))}
              </div>

              <div className="flex justify-end mt-3">
                <button
                  onClick={() => {
                    setShowForwardPicker(false);
                    setForwarding(null);
                  }}
                  className="px-3 py-1 bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MESSAGE LIMIT MODAL */}
      {showModal && (
        <div className="absolute inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white text-gray-800 p-6 rounded-2xl w-80">
            <h2 className="text-lg font-semibold text-indigo-600">
              🚫 Message Limit Reached
            </h2>
            <p className="text-sm mt-2">
              You’ve sent all free messages for today. Upgrade to Premium for
              unlimited chatting.
            </p>

            <div className="flex justify-center mt-4 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Later
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handleUpgrade();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Upgrade Now 💳
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white text-gray-900 rounded-2xl p-5 w-80 max-w-[90%]">
            <h2 className="text-lg font-semibold mb-3">Profile</h2>

            <div className="flex flex-col items-center gap-3">
              <img
                src={currentUserDp}
                alt="Profile"
                className="w-24 h-24 rounded-full border border-gray-300 object-cover shadow"
              />
              <p className="text-sm text-gray-700">
                {user?.username} <br />
                <span className="text-xs text-gray-500">{user?.email}</span>
              </p>

              <label className="mt-2 text-sm">
                <span className="block mb-1 text-gray-700">
                  Change profile picture
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicSelect}
                  className="w-full text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileFile(null);
                  setProfilePreview("");
                }}
                className="px-3 py-1 rounded-md bg-gray-200 text-sm"
              >
                Close
              </button>
              <button
                onClick={handleProfileSave}
                disabled={savingProfile || !profileFile}
                className={`px-3 py-1 rounded-md text-sm text-white ${
                  savingProfile || !profileFile
                    ? "bg-teal-300 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {savingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
