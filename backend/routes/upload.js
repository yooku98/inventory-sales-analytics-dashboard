import express from "express";
import multer from "multer";
import { processUpload } from "../controllers/uploadController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), processUpload);

export default router;

