import express from "express";
import multer from "multer";
import { upload, handleUpload } from "../controllers/uploadController.js";
const router = express.Router();


router.post("/", upload, handleUpload);

export default router;

