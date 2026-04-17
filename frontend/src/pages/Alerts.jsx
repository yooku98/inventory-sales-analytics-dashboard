import { useEffect, useState } from "react";
import { getLowStock, getExpiring } from "../lib/api";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { daysUntilExpiry, expiryStatus, EXPIRY_STYLES } from "../lib/pharmacy";

export default function Alerts() {
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("expiry");

  useEffect(() => {
    Promise.all([getLowStock(), getExpiring(90)])
      .then(([ls, ex]) => {
        setLowStock(ls);
        setExpiring(ex);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Sort expiring by FEFO (earliest expiry first)
  const expiringSorted = [...expiring].sort((a, b) => {
    const da = daysUntilExpiry(a.expiry_date);
    const db = daysUntilExpiry(b.expiry_date);
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  const expired = expiringSorted.filter((p) => expiryStatus(p.expiry_date) === "expired");
  const critical = expiringSorted.filter((p) => expiryStatus(p.expiry_date) === "critical");
  const warning = expiringSorted.filter((p) => expiryStatus(p.expiry_date) === "warning");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} className="text-yellow-600" />
        <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-medium text-red-700 uppercase">Expired</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{expired.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs font-medium text-orange-700 uppercase">&lt; 30 days</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{critical.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-700 uppercase">&lt; 90 days</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{warning.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs font-medium text-yellow-700 uppercase">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{lowStock.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab("expiry")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "expiry" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          <Clock size={16} /> Expiry ({expiringSorted.length})
        </button>
        <button onClick={() => setTab("stock")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "stock" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>
          <Package size={16} /> Low Stock ({lowStock.length})
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tab === "expiry" ? (
        expiringSorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-green-600 text-lg font-medium">No items expiring soon</p>
            <p className="text-gray-400 mt-1">Nothing expires within the next 90 days.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Sorted by FEFO (First Expired First Out)</p>
            <div className="grid gap-3">
              {expiringSorted.map((p) => {
                const status = expiryStatus(p.expiry_date);
                const style = EXPIRY_STYLES[status];
                const days = daysUntilExpiry(p.expiry_date);
                return (
                  <div key={p.id} className={`bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${style.border}`}>
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-3">
                        {p.category && <span>{p.category}</span>}
                        {p.batch_number && <span>Batch: {p.batch_number}</span>}
                        <span>Stock: {p.stock}</span>
                        {p.supplier && <span>{p.supplier}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Expires</p>
                        <p className="text-sm font-semibold text-gray-900">{String(p.expiry_date).split("T")[0]}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
                        {status === "expired" ? `EXPIRED ${Math.abs(days)}d AGO` : `${days}d LEFT`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        lowStock.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-green-600 text-lg font-medium">All products are well-stocked!</p>
            <p className="text-gray-400 mt-1">No products are below their reorder level.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lowStock.map((p) => (
              <div key={p.id} className={`bg-white rounded-xl border p-4 flex items-center justify-between ${p.stock === 0 ? "border-red-200 bg-red-50/50" : "border-yellow-200 bg-yellow-50/50"}`}>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {p.category && <span className="mr-3">{p.category}</span>}
                    {p.sku && <span>SKU: {p.sku}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Current Stock</p>
                      <p className={`text-xl font-bold ${p.stock === 0 ? "text-red-600" : "text-yellow-600"}`}>{p.stock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Reorder Level</p>
                      <p className="text-xl font-bold text-gray-400">{p.reorder_level}</p>
                    </div>
                  </div>
                  <p className={`text-xs font-medium mt-1 ${p.stock === 0 ? "text-red-600" : "text-yellow-600"}`}>
                    {p.stock === 0 ? "OUT OF STOCK" : `Need ${p.reorder_level - p.stock} more units`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
