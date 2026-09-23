export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Entertainment"
  | "Education"
  | "Bills"
  | "Healthcare"
  | "Subscriptions"
  | "Travel"
  | "Personal"
  | "Other";

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Education",
  "Bills",
  "Healthcare",
  "Subscriptions",
  "Travel",
  "Personal",
  "Other",
];

export const PAYMENT_METHODS = ["UPI", "Cash", "Card", "Net Banking", "Wallet"] as const;

export const CATEGORY_META: Record<Category, { emoji: string; tint: string; chart: string }> = {
  Food: { emoji: "🍜", tint: "tint-food", chart: "var(--chart-1)" },
  Transport: { emoji: "🚕", tint: "tint-transport", chart: "var(--chart-4)" },
  Shopping: { emoji: "🛍️", tint: "tint-shopping", chart: "var(--chart-3)" },
  Entertainment: { emoji: "🎬", tint: "tint-entertainment", chart: "var(--chart-7)" },
  Education: { emoji: "📚", tint: "tint-education", chart: "var(--chart-6)" },
  Bills: { emoji: "💡", tint: "tint-bills", chart: "var(--chart-5)" },
  Healthcare: { emoji: "🩺", tint: "tint-healthcare", chart: "var(--chart-1)" },
  Subscriptions: { emoji: "🔁", tint: "tint-subscriptions", chart: "var(--chart-3)" },
  Travel: { emoji: "✈️", tint: "tint-travel", chart: "var(--chart-6)" },
  Personal: { emoji: "🧴", tint: "tint-personal", chart: "var(--chart-2)" },
  Other: { emoji: "🧾", tint: "tint-other", chart: "var(--chart-2)" },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[(category as Category) in CATEGORY_META ? (category as Category) : "Other"];
}

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  merchant: string | null;
  date: string;
  payment_method: string;
  description: string | null;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function money(value: number) {
  return inr.format(Math.round(value));
}

export function monthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: iso(start), end: iso(end), year, month: month + 1, daysInMonth: end.getDate() };
}

export function iso(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function prettyDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Simple keyword rules that guess a category from the merchant / note text. */
const RULES: Array<[Category, string[]]> = [
  [
    "Food",
    ["swiggy", "zomato", "restaurant", "cafe", "coffee", "pizza", "dominos", "mcdonald", "hotel", "canteen", "mess", "bakery", "juice", "tea", "dinner", "lunch", "breakfast", "grocery", "bigbasket", "blinkit", "zepto", "instamart"],
  ],
  ["Transport", ["uber", "ola", "rapido", "metro", "bus", "train", "irctc", "petrol", "diesel", "fuel", "auto", "cab", "parking", "toll"]],
  ["Shopping", ["amazon", "flipkart", "myntra", "ajio", "meesho", "mall", "store", "nike", "decathlon", "shop", "clothes", "shoes"]],
  ["Entertainment", ["movie", "pvr", "inox", "cinema", "game", "steam", "bookmyshow", "concert", "bowling"]],
  ["Education", ["course", "udemy", "coursera", "book", "college", "tuition", "exam", "fee", "stationery", "school"]],
  ["Bills", ["electricity", "water bill", "gas", "recharge", "airtel", "jio", "vi ", "broadband", "wifi", "rent", "maintenance", "bill"]],
  ["Healthcare", ["pharmacy", "apollo", "medical", "doctor", "hospital", "clinic", "medicine", "lab", "dental"]],
  ["Subscriptions", ["netflix", "spotify", "prime", "hotstar", "youtube", "subscription", "icloud", "chatgpt", "figma", "notion"]],
  ["Travel", ["flight", "indigo", "air india", "makemytrip", "goibibo", "oyo", "airbnb", "trip", "travel", "booking.com"]],
  ["Personal", ["salon", "haircut", "gym", "spa", "cosmetics", "nykaa", "laundry"]],
];

export function guessCategory(text: string): { category: Category; matched: boolean } {
  const haystack = text.toLowerCase();
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => haystack.includes(k))) return { category, matched: true };
  }
  return { category: "Other", matched: false };
}

/** Keyword guess with a confidence score: exact merchant word matches score higher than loose note matches. */
export function guessWithConfidence(merchant: string, notes: string): { category: Category; confidence: number } | null {
  const m = merchant.toLowerCase().trim();
  const n = notes.toLowerCase();
  for (const [category, keywords] of RULES) {
    for (const k of keywords) {
      const key = k.trim();
      if (m && new RegExp(`(^|[^a-z])${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(m)) {
        return { category, confidence: key.length >= 5 ? 97 : 92 };
      }
    }
  }
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => m.includes(k.trim()))) return { category, confidence: 85 };
    if (keywords.some((k) => n.includes(k))) return { category, confidence: 78 };
  }
  return null;
}
