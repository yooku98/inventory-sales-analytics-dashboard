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
      if (data.error) {
        setError(data.error);
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
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Check size={18} />
              <span className="font-medium">{result.message}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-gray-500">Total Rows</p>
                <p className="text-xl font-bold text-gray-900">{result.rows}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-gray-500">Inserted</p>
                <p className="text-xl font-bold text-green-700">{result.inserted}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-gray-500">Failed</p>
                <p className="text-xl font-bold text-red-700">{result.failed}</p>
              </div>
            </div>
            {result.sheets && result.sheets.length > 1 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">Per sheet:</p>
                {result.sheets.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm">
                    <span className="font-medium text-gray-900">{s.sheet}</span>
                    {s.status === "skipped" ? (
                      <span className="text-gray-400">Skipped — {s.reason}</span>
                    ) : (
                      <span className="text-gray-600">
                        {s.type} — {s.inserted} inserted{s.failed > 0 ? `, ${s.failed} failed` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium mb-1">Errors:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
