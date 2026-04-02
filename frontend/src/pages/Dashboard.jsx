import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, getSalesStats, getLowStock, getCategoryStats } from "../lib/api";
import { Package, DollarSign, AlertTriangle, TrendingUp, ChevronRight, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`font-bold text-gray-900 ${String(value).length > 12 ? "text-lg" : "text-2xl"}`}>{value}</p>
        </div>
        <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </div>
  );
}

function ChartCard({ title, navigateTo, navigate, children, expandedContent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all"
        onClick={() => setExpanded(true)}
      >
        <h3
          onClick={(e) => { e.stopPropagation(); navigate(navigateTo); }}
          className="text-lg font-semibold text-gray-900 mb-4 cursor-pointer hover:text-blue-600 transition-colors inline-flex items-center gap-2"
        >
          {title} <ChevronRight size={18} />
        </h3>
        {children}
      </div>

      {/* Expanded overlay */}
      {expanded && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setExpanded(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <button onClick={() => setExpanded(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {expandedContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [salesStats, setSalesStats] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getProducts(), getSalesStats(), getLowStock(), getCategoryStats()])
      .then(([p, ss, ls, cs]) => {
        setProducts(p);
        setSalesStats(ss);
        setLowStock(ls);
        setCategoryStats(cs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard...</div>;
  }

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
  const totalRevenue = salesStats.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0);

  const revenueData = [...salesStats].reverse().map((s) => ({
    date: s.date,
    revenue: Number(s.revenue) || 0,
    sales: Number(s.total_sales) || 0,
  }));

  const pieData = categoryStats
    .filter((c) => c.category)
    .map((c) => ({
      name: c.category,
      value: Number(c.total_products),
      stock: Number(c.total_stock) || 0,
      avg_price: Number(c.avg_price) || 0,
    }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Products" value={products.length} color="bg-blue-600" onClick={() => navigate("/products")} />
        <StatCard icon={TrendingUp} label="Total Stock" value={totalStock.toLocaleString()} color="bg-green-600" onClick={() => navigate("/products")} />
        <StatCard icon={DollarSign} label="Inventory Value" value={`GH₵${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="bg-purple-600" onClick={() => navigate("/sales")} />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={lowStock.length} color="bg-red-600" onClick={() => navigate("/alerts")} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <ChartCard title="Revenue Trend" navigateTo="/sales" navigate={navigate}
          children={
            revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `GH₵${Number(value).toFixed(2)}`} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-16">No sales data yet</p>
          }
          expandedContent={
            revenueData.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-700">GH₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Avg Daily Revenue</p>
                    <p className="text-2xl font-bold text-green-700">GH₵{revenueData.length > 0 ? (totalRevenue / revenueData.length).toFixed(2) : "0"}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Best Day</p>
                    <p className="text-2xl font-bold text-purple-700">GH₵{Math.max(...revenueData.map(d => d.revenue)).toFixed(2)}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `GH₵${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue (GH₵)" />
                    <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="# Sales" />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : <p className="text-gray-400 text-center py-16">No sales data yet</p>
          }
        />

        {/* Category distribution */}
        <ChartCard title="Products by Category" navigateTo="/products" navigate={navigate}
          children={
            pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-16">No category data yet</p>
          }
          expandedContent={
            pieData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={140} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Category Breakdown</h4>
                  {pieData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                      <div className="text-right text-sm">
                        <span className="text-gray-600">{c.value} products</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-600">{c.stock} stock</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-600">avg GH₵{c.avg_price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-gray-400 text-center py-16">No category data yet</p>
          }
        />

        {/* Daily sales count */}
        <ChartCard title="Daily Sales Count" navigateTo="/sales" navigate={navigate}
          children={
            revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-center py-16">No sales data yet</p>
          }
          expandedContent={
            revenueData.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <p className="text-2xl font-bold text-green-700">{revenueData.reduce((s, d) => s + d.sales, 0)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Avg Daily Sales</p>
                    <p className="text-2xl font-bold text-blue-700">{(revenueData.reduce((s, d) => s + d.sales, 0) / revenueData.length).toFixed(1)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Peak Day</p>
                    <p className="text-2xl font-bold text-purple-700">{Math.max(...revenueData.map(d => d.sales))}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales Count" />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue (GH₵)" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : <p className="text-gray-400 text-center py-16">No sales data yet</p>
          }
        />

        {/* Low stock table */}
        <ChartCard title="Low Stock Alerts" navigateTo="/alerts" navigate={navigate}
          children={
            lowStock.length > 0 ? (
              <div className="overflow-auto max-h-[300px]">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 border-b">
                    <tr>
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium">Stock</th>
                      <th className="pb-2 font-medium">Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.slice(0, 8).map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-2 font-medium text-gray-900">{p.name}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stock === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">{p.reorder_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lowStock.length > 8 && <p className="text-xs text-gray-400 mt-2 text-center">+{lowStock.length - 8} more — click to expand</p>}
              </div>
            ) : <p className="text-green-600 text-center py-16">All products are well-stocked!</p>
          }
          expandedContent={
            lowStock.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-700">{lowStock.filter(p => p.stock === 0).length}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-700">{lowStock.filter(p => p.stock > 0).length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Total Alerts</p>
                    <p className="text-2xl font-bold text-gray-700">{lowStock.length}</p>
                  </div>
                </div>
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b sticky top-0 bg-white">
                      <tr>
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium">Category</th>
                        <th className="pb-2 font-medium">Stock</th>
                        <th className="pb-2 font-medium">Reorder Level</th>
                        <th className="pb-2 font-medium">Shortage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="py-2.5 font-medium text-gray-900">{p.name}</td>
                          <td className="py-2.5 text-gray-500">{p.category || "-"}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stock === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="py-2.5 text-gray-500">{p.reorder_level}</td>
                          <td className="py-2.5 font-medium text-red-600">{p.reorder_level - p.stock} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p className="text-green-600 text-center py-16">All products are well-stocked!</p>
          }
        />
      </div>
    </div>
  );
}
