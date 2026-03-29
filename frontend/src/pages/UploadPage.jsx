import { useState } from "react";
import { uploadFile } from "../lib/api";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await uploadFile(file);
      if (data.error || data.message === "Error parsing file") {
        setError(data.message || data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Upload Data</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <Upload size={40} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-2">Upload a CSV or Excel file</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => { setFile(e.target.files[0]); setResult(null); setError(""); }}
              className="block mx-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-600">
                <FileSpreadsheet size={16} />
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Processing..." : "Upload & Process"}
          </button>
        </form>

        {error && (
          <div className="mt-6 flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-lg">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-green-700 mb-4">
              <Check size={18} />
              <span className="font-medium">{result.message} — {result.rows} rows processed</span>
            </div>
            {result.data && result.data.length > 0 && (
              <div className="overflow-x-auto border rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {Object.keys(result.data[0]).map((key) => (
                        <th key={key} className="px-4 py-2 text-left font-medium text-gray-600">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-4 py-2 text-gray-700">{String(val ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 50 && (
                  <p className="p-3 text-center text-gray-400 text-sm">Showing first 50 of {result.data.length} rows</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
