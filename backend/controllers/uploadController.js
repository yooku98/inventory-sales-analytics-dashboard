// backend/controllers/uploadController.js
import multer from "multer";
import Papa from "papaparse";
import XLSX from "xlsx";
import db from "../db/turso.js";

const storage = multer.memoryStorage();
export const upload = multer({ storage }).single("file");

// Normalize column headers: lowercase, trim, replace spaces with underscores
function normalizeHeaders(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const clean = key.trim().toLowerCase().replace(/\s+/g, "_");
    normalized[clean] = typeof value === "string" ? value.trim() : value;
  }
  return normalized;
}

export const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const buffer = req.file.buffer;
  const mimetype = req.file.mimetype;
  let rawData = [];

  try {
    if (mimetype === "text/csv") {
      const parsed = Papa.parse(buffer.toString("utf8"), { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimetype === "application/vnd.ms-excel"
    ) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({ error: "Unsupported file type. Use CSV or Excel." });
    }

    if (rawData.length === 0) {
      return res.status(400).json({ error: "File contains no data rows" });
    }

    // Normalize all rows
    const rows = rawData.map(normalizeHeaders);

    // Detect data type from columns
    const columns = Object.keys(rows[0]);
    const isProducts = columns.some((c) => ["name", "product_name", "price", "sku", "stock"].includes(c));
    const isSales = columns.some((c) => ["product_id", "quantity_sold", "sale_price", "quantity"].includes(c));

    let inserted = 0;
    let failed = 0;
    const errors = [];

    if (isProducts) {
      for (const row of rows) {
        try {
          const name = row.name || row.product_name;
          const price = parseFloat(row.price);
          if (!name || isNaN(price)) {
            failed++;
            errors.push(`Row skipped: missing name or invalid price`);
            continue;
          }
          await db.execute({
            sql: `INSERT INTO products (name, sku, category, description, price, stock, reorder_level, supplier)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              name,
              row.sku || null,
              row.category || null,
              row.description || null,
              price,
              parseInt(row.stock) || 0,
              parseInt(row.reorder_level || row.reorder) || 10,
              row.supplier || null,
            ],
          });
          inserted++;
        } catch (err) {
          failed++;
          errors.push(err.message);
        }
      }
    } else if (isSales) {
      for (const row of rows) {
        try {
          const product_id = parseInt(row.product_id);
          const quantity = parseInt(row.quantity_sold || row.quantity);
          const price = parseFloat(row.sale_price || row.price);
          if (!product_id || !quantity || isNaN(price)) {
            failed++;
            errors.push(`Row skipped: missing product_id, quantity, or price`);
            continue;
          }
          await db.execute({
            sql: `INSERT INTO sales (product_id, quantity_sold, sale_price, total_amount, sale_date, customer_name, payment_method, notes, created_by)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              product_id, quantity, price,
              quantity * price,
              row.sale_date || row.date || new Date().toISOString().split("T")[0],
              row.customer_name || row.customer || null,
              row.payment_method || row.payment || null,
              row.notes || null,
              req.user?.id || null,
            ],
          });
          // Decrement stock
          await db.execute({
            sql: "UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
            args: [quantity, product_id],
          });
          inserted++;
        } catch (err) {
          failed++;
          errors.push(err.message);
        }
      }
    } else {
      return res.status(400).json({
        error: "Could not detect data type. Ensure columns include product fields (name, price) or sales fields (product_id, quantity_sold, sale_price).",
        columns,
      });
    }

    // Log upload history
    await db.execute({
      sql: `INSERT INTO upload_history (filename, file_type, rows_processed, rows_successful, rows_failed, error_log, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        req.file.originalname,
        isProducts ? "products" : "sales",
        rows.length,
        inserted,
        failed,
        errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null,
        req.user?.id || null,
      ],
    });

    res.json({
      message: `Imported ${inserted} ${isProducts ? "products" : "sales"} successfully`,
      type: isProducts ? "products" : "sales",
      rows: rows.length,
      inserted,
      failed,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Error processing file: " + err.message });
  }
};
