import User from "../models/User.js";
import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, groupId } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    if (!receiverId || !content) {
      return res
        .status(400)
        .json({ message: "receiverId and content are required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

 
    const today = new Date().toDateString();
    const lastMsgDate = user.lastMessageDate || "";

    
    if (today !== lastMsgDate) {
      user.messageLimit = 10; 
      user.lastMessageDate = today; 
      await user.save();
    }

    
    if (!user.isPremium && user.messageLimit <= 0) {
      return res.status(403).json({
        message:
          "Daily chat limit reached. Upgrade to Premium to continue chatting.",
      });
    }

    
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId || null,
      groupId: groupId || null,
      content,
    });

    
    if (!user.isPremium) {
      user.messageLimit -= 1;
      await user.save();
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("💥 Send message error:", error);
    res
      .status(500)
      .json({ message: "Failed to send message", error: error.message });
  }
};


export const getMessages = async (req, res) => {
  try {
    const targetId = req.params.id;
    const { type } = req.query; 

    let messages;
    if (type === "group") {
      messages = await Message.find({ groupId: targetId }).sort("createdAt");
    } else {
      messages = await Message.find({
        $or: [
          { sender: req.user._id, receiver: targetId },
          { sender: targetId, receiver: req.user._id },
        ],
      }).sort("createdAt");
    }

    res.json(messages);
  } catch (error) {
    console.error("💥 getMessages error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch messages", error: error.message });
  }
};

export const deleteForMe = async (req, res) => {
  const messageId = req.params.id;

  await Message.findByIdAndUpdate(messageId, {
    $addToSet: { deletedFor: req.user._id }
  });

  res.json({ success: true });
};
export const deleteForEveryone = async (req, res) => {
  const messageId = req.params.id;
  const msg = await Message.findById(messageId);

  if (!msg) return res.status(404).json({ message: "Message not found" });


  if (msg.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not allowed" });
  }

  msg.deletedForEveryone = true;
  msg.content = "This message was deleted";
  await msg.save();

  res.json({ success: true });
};

export const uploadFileMessage = async (req, res) => {
  try {

    console.log("📌 Controller reached");
    console.log("📌 File:", req.file);
    console.log("📌 Body:", req.body);
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });

    const filePath = `/uploads/${req.file.filename}`;

    const message = await Message.create({
      sender: req.user._id,
      receiver: req.body.receiverId,
      content: "",
      fileUrl: filePath,
      fileType: req.file.mimetype,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "File upload failed", error: err });
  }
};

