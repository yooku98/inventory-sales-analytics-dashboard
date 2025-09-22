// backend/controllers/uploadController.js
import multer from "multer";
import Papa from "papaparse";
import XLSX from "xlsx";

// Set up multer to handle file uploads
const storage = multer.memoryStorage();
export const upload = multer({ storage }).single("file");

// Handle uploaded file
export const handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const buffer = req.file.buffer;
  const mimetype = req.file.mimetype;

  let data = [];

  try {
    if (mimetype === "text/csv") {
      const parsed = Papa.parse(buffer.toString("utf8"), { header: true });
      data = parsed.data;
    } else if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimetype === "application/vnd.ms-excel"
    ) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return res.status(400).json({ message: "Unsupported file type" });
    }

    res.json({ message: "File processed successfully", rows: data.length, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error parsing file" });
  }
};
