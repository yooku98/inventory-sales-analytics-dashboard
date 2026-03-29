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

async function insertProducts(rows) {
  let inserted = 0;
  let failed = 0;
  const errors = [];

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
  return { inserted, failed, errors };
}

async function insertSales(rows, userId) {
  let inserted = 0;
  let failed = 0;
  const errors = [];

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
          userId,
        ],
      });
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
  return { inserted, failed, errors };
}

function detectType(columns) {
  if (columns.some((c) => ["name", "product_name", "price", "sku", "stock"].includes(c))) return "products";
  if (columns.some((c) => ["product_id", "quantity_sold", "sale_price", "quantity"].includes(c))) return "sales";
  return null;
}

export const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const buffer = req.file.buffer;
  const mimetype = req.file.mimetype;

  try {
    // Collect all datasets: [{name, rows}]
    const datasets = [];

    if (mimetype === "text/csv") {
      const parsed = Papa.parse(buffer.toString("utf8"), { header: true, skipEmptyLines: true });
      if (parsed.data.length > 0) {
        datasets.push({ name: "CSV", rows: parsed.data.map(normalizeHeaders) });
      }
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimetype === "application/vnd.ms-excel"
    ) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      // Process ALL sheets
      for (const sheetName of workbook.SheetNames) {
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (rawData.length > 0) {
          datasets.push({ name: sheetName, rows: rawData.map(normalizeHeaders) });
        }
      }
    } else {
      return res.status(400).json({ error: "Unsupported file type. Use CSV or Excel." });
    }

    if (datasets.length === 0) {
      return res.status(400).json({ error: "File contains no data rows" });
    }

    // Process each dataset
    const results = [];
    let totalInserted = 0;
    let totalFailed = 0;
    const allErrors = [];

    for (const dataset of datasets) {
      const columns = Object.keys(dataset.rows[0]);
      // Use sheet name as a hint, fall back to column detection
      const sheetHint = dataset.name.toLowerCase();
      let type = null;
      if (sheetHint.includes("product")) type = "products";
      else if (sheetHint.includes("sale")) type = "sales";
      else type = detectType(columns);

      if (!type) {
        results.push({ sheet: dataset.name, status: "skipped", reason: "Could not detect data type from columns", columns });
        continue;
      }

      let result;
      if (type === "products") {
        result = await insertProducts(dataset.rows);
      } else {
        result = await insertSales(dataset.rows, req.user?.id || null);
      }

      totalInserted += result.inserted;
      totalFailed += result.failed;
      allErrors.push(...result.errors);

      // Log upload history per sheet
      await db.execute({
        sql: `INSERT INTO upload_history (filename, file_type, rows_processed, rows_successful, rows_failed, error_log, uploaded_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `${req.file.originalname} [${dataset.name}]`,
          type,
          dataset.rows.length,
          result.inserted,
          result.failed,
          result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 50)) : null,
          req.user?.id || null,
        ],
      });

      results.push({
        sheet: dataset.name,
        type,
        rows: dataset.rows.length,
        inserted: result.inserted,
        failed: result.failed,
      });
    }

    res.json({
      message: `Processed ${datasets.length} sheet${datasets.length !== 1 ? "s" : ""}: ${totalInserted} rows imported`,
      sheets: results,
      inserted: totalInserted,
      failed: totalFailed,
      rows: datasets.reduce((sum, d) => sum + d.rows.length, 0),
      errors: allErrors.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Error processing file: " + err.message });
  }
};
