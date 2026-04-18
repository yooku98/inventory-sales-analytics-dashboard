// backend/controllers/uploadController.js
import multer from "multer";
import Papa from "papaparse";
import XLSX from "xlsx";
import db from "../db/turso.js";

const storage = multer.memoryStorage();
export const upload = multer({ storage }).single("file");

// Normalize column headers: lowercase, trim, strip punctuation, replace spaces with underscores
function normalizeHeaders(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const clean = key
      .trim()
      .toLowerCase()
      .replace(/[()[\]{}.,;:!?/\\]/g, "")  // strip punctuation
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    normalized[clean] = typeof value === "string" ? value.trim() : value;
  }
  return normalized;
}

// Pick the first defined value among several possible column aliases
function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return undefined;
}

function parseExpiry(raw) {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Excel serial date
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d.toISOString().split("T")[0];
  }
  const d = new Date(raw);
  return isNaN(d) ? null : d.toISOString().split("T")[0];
}

function parseControlled(raw) {
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw === "number") return raw ? 1 : 0;
  const s = String(raw).trim().toLowerCase();
  return ["yes", "y", "true", "1", "controlled"].includes(s) ? 1 : 0;
}

async function insertProducts(rows) {
  let inserted = 0;
  let failed = 0;
  const errors = [];

  for (const row of rows) {
    try {
      const name = pick(row, "name", "product_name", "product", "drug_name", "item_name");
      const priceRaw = pick(row,
        "price", "selling_price", "selling_price_ghs", "selling_price_gh", "unit_price",
        "sell_price", "retail_price", "cost_price", "cost_price_ghs", "cost_price_gh"
      );
      const price = parseFloat(priceRaw);
      if (!name || isNaN(price)) {
        failed++;
        errors.push(`Row skipped: missing name or invalid price`);
        continue;
      }
      const sku = pick(row, "sku", "product_id", "item_code", "code");
      const stock = parseInt(pick(row, "stock", "current_stock", "stock_on_hand", "quantity", "qty", "on_hand")) || 0;
      const reorder = parseInt(pick(row, "reorder_level", "reorder", "min_stock", "minimum_stock")) || 10;
      const supplier = pick(row, "supplier", "vendor", "distributor") || null;
      const expiry = parseExpiry(pick(row, "expiry_date", "expiry", "expires", "exp_date", "exp", "expiration_date"));
      const batch = pick(row, "batch_number", "batch", "batch_no") || null;
      const lot = pick(row, "lot_number", "lot", "lot_no") || null;
      const controlled = parseControlled(pick(row, "is_controlled", "controlled", "controlled_substance", "is_controlled_substance"));

      await db.execute({
        sql: `INSERT INTO products
                (name, sku, category, description, price, stock, reorder_level, supplier,
                 expiry_date, batch_number, lot_number, is_controlled)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          name,
          sku || null,
          row.category || null,
          pick(row, "description", "notes", "storage_condition") || null,
          price,
          stock,
          reorder,
          supplier,
          expiry,
          batch,
          lot,
          controlled,
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

  // Pre-fetch products for name-based lookups
  const productsResult = await db.execute("SELECT id, name FROM products");
  const productsByName = {};
  for (const p of productsResult.rows) {
    productsByName[p.name.toLowerCase()] = p.id;
  }

  for (const row of rows) {
    try {
      // Resolve product_id: try direct ID first, then match by name
      let product_id = parseInt(row.product_id) || null;
      const productName = row.product || row.product_name || row.name;
      if (!product_id && productName) {
        product_id = productsByName[productName.toLowerCase()] || null;
      }

      const quantity = parseInt(row.quantity_sold || row.quantity || row.qty);
      const price = parseFloat(row.sale_price || row.price);
      const total = parseFloat(row.total || row.total_amount) || quantity * price;

      if (!product_id || !quantity || isNaN(price)) {
        failed++;
        errors.push(`Row skipped: could not resolve product${productName ? ` "${productName}"` : ""}, quantity, or price`);
        continue;
      }

      // Parse date — handle formats like "11 Mar 2026" or "2026-03-11"
      let saleDate = row.sale_date || row.date || null;
      if (saleDate && typeof saleDate === "string") {
        const parsed = new Date(saleDate);
        saleDate = isNaN(parsed) ? new Date().toISOString().split("T")[0] : parsed.toISOString().split("T")[0];
      }
      if (!saleDate) saleDate = new Date().toISOString().split("T")[0];

      await db.execute({
        sql: `INSERT INTO sales (product_id, quantity_sold, sale_price, total_amount, sale_date, customer_name, payment_method, notes, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          product_id, quantity, price, total, saleDate,
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
  const hasNameCol = columns.some((c) =>
    ["name", "product_name", "product", "drug_name", "item_name"].includes(c)
  );
  const hasPriceCol = columns.some((c) =>
    ["price", "selling_price", "selling_price_ghs", "selling_price_gh", "unit_price",
     "sell_price", "retail_price", "cost_price", "cost_price_ghs", "cost_price_gh"].includes(c)
  );
  const hasPharmaCol = columns.some((c) =>
    ["expiry_date", "expiry", "batch_number", "batch", "supplier",
     "controlled_substance", "is_controlled", "current_stock", "stock"].includes(c)
  );
  if (hasNameCol && (hasPriceCol || hasPharmaCol)) return "products";

  if (columns.some((c) =>
    ["product_id", "quantity_sold", "sale_price", "quantity", "qty", "product",
     "customer", "customer_name", "payment"].includes(c)
  )) return "sales";
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
