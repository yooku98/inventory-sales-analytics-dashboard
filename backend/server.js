const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors({
  origin: "http://localhost:5173"  // allow frontend to connect
}));

app.use(express.json());
// Example API route
app.get("/api/products", (req, res) => {
  res.json([
    { id: 1, name: "Laptop", stock: 12, price: 900 },
    { id: 2, name: "Mouse", stock: 50, price: 20 },
    { id: 3, name: "Keyboard", stock: 30, price: 45 },
  ]);
});

// ✅ Only one PORT declaration
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});





