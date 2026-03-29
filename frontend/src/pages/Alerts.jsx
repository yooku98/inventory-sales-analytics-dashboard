import { useEffect, useState } from "react";
import { getLowStock } from "../lib/api";
import { AlertTriangle } from "lucide-react";

export default function Alerts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLowStock().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} className="text-yellow-600" />
        <h2 className="text-2xl font-bold text-gray-900">Low Stock Alerts</h2>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-green-600 text-lg font-medium">All products are well-stocked!</p>
          <p className="text-gray-400 mt-1">No products are below their reorder level.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">{products.length} product{products.length !== 1 ? "s" : ""} below reorder level</p>
          <div className="grid gap-4">
            {products.map((p) => (
              <div key={p.id} className={`bg-white rounded-xl border p-5 flex items-center justify-between ${p.stock === 0 ? "border-red-200 bg-red-50/50" : "border-yellow-200 bg-yellow-50/50"}`}>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {p.category && <span className="mr-3">Category: {p.category}</span>}
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
        </div>
      )}
    </div>
  );
}
