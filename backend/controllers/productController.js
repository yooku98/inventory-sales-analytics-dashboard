// backend/controllers/productController.js

// Temporary hard-coded list
const products = [
  { id: 1, name: "Laptop", stock: 12, price: 900 },
  { id: 2, name: "Mouse", stock: 50, price: 20 },
  { id: 3, name: "Keyboard", stock: 30, price: 45 },
];

// GET /api/products
exports.getAllProducts = (req, res) => {
  res.json(products);
};

// POST /api/products
exports.addProduct = (req, res) => {
  const { name, stock, price } = req.body;
  const newProduct = { id: products.length + 1, name, stock, price };
  products.push(newProduct);
  res.status(201).json(newProduct);
};


