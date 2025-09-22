// backend/controllers/productController.js
import db from "../db/knex.js";
const products = [
  { id: 1, name: "Laptop", stock: 12, price: 900 },
  { id: 2, name: "Mouse", stock: 50, price: 20 },
  { id: 3, name: "Keyboard", stock: 30, price: 45 },
];

export const getAllProducts = (req, res) => {
  res.json(products);
};

export const addProduct = (req, res) => {
  const { name, stock, price } = req.body;
  const newProduct = { id: products.length + 1, name, stock, price };
  products.push(newProduct);
  res.status(201).json(newProduct);
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await db("products").where({ id: req.params.id }).first();
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
};


export const updateProduct = async (req, res, next) => {
  try {
    const { name, stock, price } = req.body;
    const [product] = await db("products")
      .where({ id: req.params.id })
      .update({ name, stock, price })
      .returning("*");
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const deleted = await db("products")
      .where({ id: req.params.id })
      .del();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

