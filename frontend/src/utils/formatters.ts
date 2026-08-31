/**
 * Format numbers into Indian currency representation (e.g. ₹4.8L, ₹1.2 Cr, or ₹24,000).
 */
export function formatINR(val: number, compact: boolean = true): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0";
  
  if (compact) {
    if (val >= 10000000) {
      const cr = val / 10000000;
      return `₹${cr.toFixed(cr >= 10 ? 1 : 2)} Cr`;
    }
    if (val >= 100000) {
      const lakh = val / 100000;
      return `₹${lakh.toFixed(lakh >= 10 ? 1 : 2)} L`;
    }
    if (val >= 1000) {
      const k = val / 1000;
      return `₹${k.toFixed(1)}k`;
    }
  }

  // Full Indian comma separation
  const parts = val.toFixed(2).split(".");
  let intPart = parts[0];
  const decPart = parts[1];
  
  let lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  
  return `₹${formattedInt}${decPart !== "00" ? "." + decPart : ""}`;
}

export function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return isoStr;
  }
}

export function formatHours(hr: number): string {
  if (hr < 1) return `${Math.round(hr * 60)} mins`;
  const hours = Math.floor(hr);
  const mins = Math.round((hr - hours) * 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hrs`;
}
