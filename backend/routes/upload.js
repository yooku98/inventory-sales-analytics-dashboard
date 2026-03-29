import express from "express";
import { upload, handleUpload } from "../controllers/uploadController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticateToken, upload, handleUpload);

export default router;
