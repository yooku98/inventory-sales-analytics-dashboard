import { useEffect, useState, useCallback } from "react";
import { getSales, createSale, getProducts } from "../lib/api";
import { Plus, X, Filter, Search, FileDown, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToExcel, exportToPDF } from "../lib/export";

const LIMIT = 50;

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
    // Fetch all products for the dropdown (high limit, no search filter)
    getProducts({ limit: 1000 }).then(({ data }) => setProducts(data)).catch(console.error);
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
                <option value="Mobile Money (MTN)">Mobile Money (MTN)</option>
                <option value="Mobile Money (Telecel)">Mobile Money (Telecel)</option>
                <option value="Mobile Money (AT)">Mobile Money (AT)</option>
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
              Total: <strong>GH₵{(Number(form.quantity_sold) * Number(form.sale_price)).toFixed(2)}</strong>
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

function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>{from}–{to} of {total.toLocaleString()} sales</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft size={16} />
        </button>
        <span className="px-3">Page {page} of {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);

  const hasFilters = search || paymentFilter || productFilter || dateFrom || dateTo;

  const load = useCallback((overrides = {}) => {
    setLoading(true);
    const params = {
      page, limit: LIMIT, search, payment: paymentFilter,
      product: productFilter, dateFrom, dateTo, ...overrides,
    };
    getSales(params)
      .then(({ data, pagination: pg, total_revenue }) => {
        setSales(data);
        setPagination(pg);
        setTotalRevenue(total_revenue || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, paymentFilter, productFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setPaymentFilter("");
    setProductFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("date_desc");
    setPage(1);
  };

  // Client-side sort on current page only
  const sorted = [...sales].sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return (a.sale_date || "").localeCompare(b.sale_date || "");
      case "date_desc": return (b.sale_date || "").localeCompare(a.sale_date || "");
      case "total_asc": return (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
      case "total_desc": return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
      case "qty_desc": return (b.quantity_sold || 0) - (a.quantity_sold || 0);
      case "product": return (a.product_name || "").localeCompare(b.product_name || "");
      default: return 0;
    }
  });

  const salesColumns = [
    { key: "sale_date", label: "Date", format: (v) => v?.split("T")[0] || "" },
    { key: "product_name", label: "Product" },
    { key: "quantity_sold", label: "Qty" },
    { key: "sale_price", label: "Price (GH₵)", format: (v) => Number(v).toFixed(2) },
    { key: "total_amount", label: "Total (GH₵)", format: (v) => Number(v).toFixed(2) },
    { key: "customer_name", label: "Customer" },
    { key: "payment_method", label: "Payment" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportToExcel(sorted, salesColumns, "sales")}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 border border-emerald-200">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={() => exportToPDF(sorted, salesColumns, "sales", "Sales Report")}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 text-sm font-medium rounded-lg hover:bg-rose-100 border border-rose-200">
            <FileDown size={15} /> PDF
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Record Sale
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-blue-600 hover:underline">Clear all</button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative col-span-2 sm:col-span-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select value={paymentFilter} onChange={(e) => setFilter(setPaymentFilter)(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="transfer">Transfer</option>
            <option value="Mobile Money (MTN)">MoMo MTN</option>
            <option value="Mobile Money (Telecel)">MoMo Telecel</option>
            <option value="Mobile Money (AT)">MoMo AT</option>
            <option value="other">Other</option>
          </select>
          <input
            placeholder="Product name"
            value={productFilter}
            onChange={(e) => setFilter(setProductFilter)(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input type="date" value={dateFrom} onChange={(e) => setFilter(setDateFrom)(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="date" value={dateTo} onChange={(e) => setFilter(setDateTo)(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="total_desc">Highest Total</option>
            <option value="total_asc">Lowest Total</option>
            <option value="qty_desc">Most Quantity</option>
            <option value="product">Product A-Z</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-gray-500">
          <strong className="text-gray-900">{(pagination?.total || 0).toLocaleString()}</strong> total sales
          {hasFilters && " matching filters"}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">
          Revenue: <strong className="text-gray-900">GH₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          {hasFilters && " (filtered)"}
        </span>
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
                {sorted.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    {hasFilters ? "No sales match your filters" : "No sales recorded yet"}
                  </td></tr>
                ) : (
                  sorted.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-500">{s.sale_date?.split("T")[0]}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{s.product_name}</td>
                      <td className="px-6 py-3">{s.quantity_sold}</td>
                      <td className="px-6 py-3">GH₵{Number(s.sale_price).toFixed(2)}</td>
                      <td className="px-6 py-3 font-medium">GH₵{Number(s.total_amount).toFixed(2)}</td>
                      <td className="px-6 py-3 text-gray-500">{s.customer_name || "-"}</td>
                      <td className="px-6 py-3">
                        {s.payment_method && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{s.payment_method}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPage={(p) => setPage(p)} />
        </div>
      )}

      {showModal && <SaleModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
