const API_BASE = "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = res.status;
    throw error;
  }
  return data;
}

// Auth
export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const register = (username, email, password) =>
  request("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) });

export const getMe = () => request("/auth/me");

// Products
export const getProducts = () => request("/products");
export const getProduct = (id) => request(`/products/${id}`);
export const createProduct = (data) =>
  request("/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id, data) =>
  request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id) =>
  request(`/products/${id}`, { method: "DELETE" });
export const getLowStock = () => request("/products/alerts/low-stock");
export const getCategoryStats = () => request("/products/stats/by-category");

// Sales
export const getSales = () => request("/sales");
export const createSale = (data) =>
  request("/sales", { method: "POST", body: JSON.stringify(data) });
export const getSalesStats = () => request("/sales/stats");

// Upload
export const uploadFile = (file) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => res.json());
};
