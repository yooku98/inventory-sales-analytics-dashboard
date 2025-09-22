import express from "express";
import { getAllProducts, getProductById, addProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAllProducts);
router.get("/:id", authMiddleware, getProductById);
router.post("/", authMiddleware, addProduct);
router.put("/:id", authMiddleware, updateProduct);
router.delete("/:id", authMiddleware, deleteProduct);

export default router;


