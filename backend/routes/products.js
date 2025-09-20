import express from "express";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticate, getProducts);
router.post("/", authenticate, authorize("owner"), addProduct);
router.put("/:id", authenticate, authorize("owner"), updateProduct);
router.delete("/:id", authenticate, authorize("owner"), deleteProduct);

export default router;

