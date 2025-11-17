import express from "express";
import {
  sendMessage,
  getMessages,
  deleteForMe,
  deleteForEveryone,
  uploadFileMessage
} from "../controllers/messageController.js";

import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();


router.post("/", protect, sendMessage);
router.get("/:id", protect, getMessages);
router.put("/delete-for-me/:id", protect, deleteForMe);
router.put("/delete-everyone/:id", protect, deleteForEveryone);


router.post(
  "/upload",
  protect,                   
  upload.single("file"),    
  uploadFileMessage        
);

export default router;
