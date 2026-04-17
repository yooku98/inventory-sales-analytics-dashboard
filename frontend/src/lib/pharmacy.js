// Pharmacy-specific constants and helpers

export const GHANA_SUPPLIERS = [
  "Entrance Pharmaceuticals",
  "Tobinco Pharmaceuticals",
  "Dannex Ayrton",
  "Ernest Chemists",
];

export const PHARMACY_CATEGORIES = [
  "Antibiotics",
  "Analgesics",
  "Antimalarials",
  "Antihypertensives",
  "Antidiabetics",
  "Vitamins & Supplements",
  "Cough & Cold",
  "Dermatology",
  "Ophthalmics",
  "Antacids",
  "Contraceptives",
  "First Aid",
  "Controlled Substances",
];

// Returns days until expiry. Negative = already expired.
export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.floor((exp - today) / (1000 * 60 * 60 * 24));
}

// Bucket: expired | critical (<30d) | warning (<90d) | ok (>=90d) | none
export function expiryStatus(expiryDate) {
  const d = daysUntilExpiry(expiryDate);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d < 30) return "critical";
  if (d < 90) return "warning";
  return "ok";
}

export const EXPIRY_STYLES = {
  expired: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", label: "EXPIRED" },
  critical: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "< 30 DAYS" },
  warning: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", label: "< 90 DAYS" },
  ok: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", label: "OK" },
  none: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: "NO DATE" },
};
