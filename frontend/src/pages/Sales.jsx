import { useEffect, useState } from "react";
import { getSales, createSale, getProducts } from "../lib/api";
import { Plus, X } from "lucide-react";

function SaleModal({ onClose, onSave }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: "", quantity_sold: "", sale_price: "",
    sale_date: new Date().toISOString().split("T")[0],
    customer_name: "", payment_method: "cash", notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
  }, []);

  const selectedProduct = products.find((p) => p.id === Number(form.product_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createSale({
        ...form,
        product_id: Number(form.product_id),
        quantity_sold: Number(form.quantity_sold),
        sale_price: parseFloat(form.sale_price),
      });
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Record Sale</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
            <select required value={form.product_id} onChange={(e) => {
              const p = products.find((p) => p.id === Number(e.target.value));
              setForm({ ...form, product_id: e.target.value, sale_price: p ? String(p.price) : "" });
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input type="number" required min={1} max={selectedProduct?.stock || 99999}
                value={form.quantity_sold} onChange={(e) => setForm({ ...form, quantity_sold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price *</label>
              <input type="number" step="0.01" required value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {form.quantity_sold && form.sale_price && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              Total: <strong>${(Number(form.quantity_sold) * Number(form.sale_price)).toFixed(2)}</strong>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving..." : "Record Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    getSales().then(setSales).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Qty</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No sales recorded yet</td></tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-500">{s.sale_date?.split("T")[0]}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{s.product_name}</td>
                      <td className="px-6 py-3">{s.quantity_sold}</td>
                      <td className="px-6 py-3">${Number(s.sale_price).toFixed(2)}</td>
                      <td className="px-6 py-3 font-medium">${Number(s.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-3 text-gray-500">{s.customer_name || "-"}</td>
                      <td className="px-6 py-3">
                        {s.payment_method && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">{s.payment_method}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <SaleModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
