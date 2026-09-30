import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Invoice, AppSettings } from "@/types";

export const MIN_MARGIN_PCT = 8;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

// ─── Margin & peringatan harga ───────────────────────────────────
export type MarginLevel = "danger" | "warning" | "ok";

// sellingPrice lebih tinggi dari harga modal bisa jadi penjualan rugi.
export function marginInfo(sellingPrice: number, costPrice: number): { marginPct: number; level: MarginLevel; message: string } {
  if (costPrice <= 0) return { marginPct: 0, level: "ok", message: "Tanpa data modal" };
  const profit = sellingPrice - costPrice;
  const marginPct = (profit / costPrice) * 100;
  if (profit <= 0) {
    return { marginPct, level: "danger", message: "Harga jual sama/lebih rendah dari modal — rugi!" };
  }
  if (marginPct < 8) {
    return { marginPct, level: "warning", message: `Margin hanya ${marginPct.toFixed(1)}% (< 8%) — terlalu tipis.` };
  }
  return { marginPct, level: "ok", message: `Margin ${marginPct.toFixed(1)}%` };
}

// ─── Cut Off (pelanggan melewati tenggat pembayaran) ────────────
// Pelanggan kena cut off jika masih punya piutang CONFIRMED/DELIVERED
// yang sudah melewati cut_off_days sejak pembuatan invoice.
export function isCustomerCutOff(customerId: string, invoices: Invoice[], settings: AppSettings): boolean {
  if (!settings.cut_off_enabled) return false;
  const now = Date.now();
  const cutoffMs = settings.cut_off_days * 24 * 60 * 60 * 1000;
  return invoices.some(
    (i) =>
      i.customer_id === customerId &&
      (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED") &&
      i.payment_status !== "PAID" &&
      now - new Date(i.created_at).getTime() > cutoffMs
  );
}

export function daysUntil(target: string): number {
  return daysBetween(new Date().toISOString(), target);
}
export function formatRelative(date: string): string {
  const diff = daysBetween(date, new Date().toISOString());
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  if (diff < 7) return `${diff} hari lalu`;
  return formatDate(date);
}
