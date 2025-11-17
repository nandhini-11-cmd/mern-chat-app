import express from "express";
import { createGroup, getGroups, getGroupMessages } from "../controllers/groupController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getGroups);
router.get("/:id/messages", protect, getGroupMessages);

export default router;
