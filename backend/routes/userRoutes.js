import express from "express";
import { registerUser, loginUser, updateProfilePic } from "../controllers/userController.js";
import upload from "../middleware/uploadMiddleware.js";
import protect from "../middleware/authMiddleware.js";
import { getAllUsers } from "../controllers/userController.js";
import multer from "multer";

const router = express.Router();


router.post("/register", (req, res, next) => {
  upload.single("profilePic")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      
      return res.status(400).json({ message: err.message });
    } else if (err) {
      
      return res.status(500).json({ message: err.message });
    }
    next();
  });
}, registerUser);


router.post("/login", loginUser);
router.get("/", getAllUsers);


router.put("/update-pic", protect, upload.single("profilePic"), updateProfilePic);

export default router;
