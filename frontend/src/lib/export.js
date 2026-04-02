import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(data, columns, filename = "export") {
  const rows = data.map((row) =>
    columns.reduce((obj, col) => {
      obj[col.label] = col.format ? col.format(row[col.key], row) : row[col.key];
      return obj;
    }, {})
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${filename}.xlsx`);
}

export function exportToPDF(data, columns, filename = "export", title = "") {
  const doc = new jsPDF();

  if (title) {
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 27);
  }

  autoTable(doc, {
    startY: title ? 33 : 14,
    head: [columns.map((c) => c.label)],
    body: data.map((row) =>
      columns.map((col) => (col.format ? col.format(row[col.key], row) : row[col.key] ?? "-"))
    ),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}
