import { useEffect, useState, useMemo } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../lib/api";
import { Plus, Pencil, Trash2, X, FileDown, FileSpreadsheet, Shield } from "lucide-react";
import { exportToExcel, exportToPDF } from "../lib/export";
import { GHANA_SUPPLIERS, PHARMACY_CATEGORIES, expiryStatus, EXPIRY_STYLES, daysUntilExpiry } from "../lib/pharmacy";

const emptyForm = {
  name: "", sku: "", category: "", description: "",
  price: "", stock: "", reorder_level: "10", supplier: "",
  expiry_date: "", batch_number: "", lot_number: "", is_controlled: false,
};

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    if (!product) return emptyForm;
    return {
      ...emptyForm,
      ...product,
      expiry_date: product.expiry_date ? String(product.expiry_date).split("T")[0] : "",
      is_controlled: !!product.is_controlled,
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!product?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        reorder_level: parseInt(form.reorder_level) || 10,
        expiry_date: form.expiry_date || null,
        is_controlled: !!form.is_controlled,
      };
      if (isEdit) await updateProduct(product.id, data);
      else await createProduct(data);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input list="category-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              <datalist id="category-list">
                {PHARMACY_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (GH₵) *</label>
              <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <input list="supplier-list" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              <datalist id="supplier-list">
                {GHANA_SUPPLIERS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch No.</label>
              <input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot No.</label>
              <input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_controlled} onChange={(e) => setForm({ ...form, is_controlled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Shield size={14} className="text-rose-600" /> Controlled substance
                </span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const load = () => {
    setLoading(true);
    getProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.batch_number?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const productColumns = [
    { key: "name", label: "Drug Name" },
    { key: "sku", label: "SKU" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price (GH₵)", format: (v) => Number(v).toFixed(2) },
    { key: "stock", label: "Stock" },
    { key: "batch_number", label: "Batch" },
    { key: "expiry_date", label: "Expiry", format: (v) => v ? String(v).split("T")[0] : "-" },
    { key: "supplier", label: "Supplier" },
    { key: "is_controlled", label: "Controlled", format: (v) => v ? "Yes" : "No" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Products</h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search name, SKU, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button onClick={() => exportToExcel(filtered, productColumns, "products")}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 border border-emerald-200">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => exportToPDF(filtered, productColumns, "products", "Products Report")}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-100 border border-rose-200">
            <FileDown size={15} /> PDF
          </button>
          <button onClick={() => setModal("add")} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !categoryFilter ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All ({products.length})
        </button>
        {categories.map((cat) => {
          const count = products.filter(p => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Category summary */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(categoryFilter ? categories.filter(c => c === categoryFilter) : categories).map((cat) => {
            const catProducts = products.filter(p => p.category === cat);
            const totalStock = catProducts.reduce((s, p) => s + (p.stock || 0), 0);
            const totalValue = catProducts.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
            return (
              <div key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${categoryFilter === cat ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-200"}`}>
                <p className="text-sm font-medium text-gray-900">{cat}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Products</span><span className="font-medium text-gray-900">{catProducts.length}</span></div>
                  <div className="flex justify-between"><span>Total Stock</span><span className="font-medium text-gray-900">{totalStock.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Value</span><span className="font-medium text-gray-900">GH₵{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-6 py-3 font-medium">Drug Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Stock</th>
                  <th className="px-6 py-3 font-medium">Batch</th>
                  <th className="px-6 py-3 font-medium">Expiry</th>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-400">No products found</td></tr>
                ) : (
                  filtered.map((p) => {
                    const exp = expiryStatus(p.expiry_date);
                    const expStyle = EXPIRY_STYLES[exp];
                    const days = daysUntilExpiry(p.expiry_date);
                    return (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {p.is_controlled ? <Shield size={14} className="text-rose-600" title="Controlled substance" /> : null}
                          </div>
                          {p.sku && <div className="text-xs text-gray-400">{p.sku}</div>}
                        </td>
                        <td className="px-6 py-3">
                          {p.category && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{p.category}</span>}
                        </td>
                        <td className="px-6 py-3">GH₵{Number(p.price).toFixed(2)}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.stock <= (p.reorder_level || 10) ? (p.stock === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700") : "bg-green-100 text-green-700"
                          }`}>{p.stock}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-500">{p.batch_number || "-"}</td>
                        <td className="px-6 py-3">
                          {p.expiry_date ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-gray-700 text-xs">{String(p.expiry_date).split("T")[0]}</span>
                              {exp !== "ok" && exp !== "none" && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${expStyle.bg} ${expStyle.text}`}>
                                  {exp === "expired" ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-3 text-gray-500">{p.supplier || "-"}</td>
                        <td className="px-6 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setModal(p)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={16} /></button>
                            <button onClick={() => handleDelete(p.id, p.name)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ProductModal
          product={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
