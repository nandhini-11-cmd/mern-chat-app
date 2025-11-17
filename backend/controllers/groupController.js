import Group from "../models/Group.js";
import Message from "../models/Message.js";


export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;

    const group = await Group.create({
      name,
      admin: req.user._id,
      members: [req.user._id, ...members],
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: "Failed to create group", error: error.message });
  }
};


export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate("members", "username profilePic");
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch groups", error: error.message });
  }
};


export const getGroupMessages = async (req, res) => {
  try {
    const messages = await Message.find({ groupId: req.params.id })
      .populate("sender", "username profilePic")
      .sort("createdAt");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch group messages", error: error.message });
  }
};
