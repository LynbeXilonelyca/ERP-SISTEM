"use client";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// Status → warna background blok untuk seluruh baris. Teks status tetap ditampilkan.
const statusRowColor: Record<string, string> = {
  DRAFT: "bg-gray-50",
  SUBMITTED: "bg-blue-50",
  APPROVED: "bg-green-50",
  REJECTED: "bg-red-50",
  PENDING: "bg-yellow-50",
  PENDING_REVIEW: "bg-yellow-50",
  ACTIVE: "bg-green-50",
  INACTIVE: "bg-gray-50",
  DONE: "bg-blue-50",
  CANCELLED: "bg-red-50",
  RETURNED: "bg-red-50",
  CALCULATED: "bg-blue-50",
  ADJUSTED: "bg-purple-50",
  PAID: "bg-green-50",
  UNPAID: "bg-red-50",
  PARTIAL: "bg-yellow-50",
  OVERDUE: "bg-red-50",
  CONFIRMED: "bg-blue-50",
  PRINTED: "bg-yellow-50",
  READY_TO_SHIP: "bg-yellow-50",
  SENDING: "bg-yellow-50",
  DELIVERED: "bg-green-50",
};

// Deteksi nilai status dari sebuah baris (kolom apa pun yang key/namanya mengandung "status").
function rowStatus(row: Record<string, unknown>): string {
  const key = Object.keys(row).find(
    (k) => k.toLowerCase().includes("status")
  );
  if (!key) return "";
  const v = row[key];
  return typeof v === "string" ? v.toUpperCase() : "";
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column[];
  data: T[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: keyof T;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  loading = false,
  emptyMessage = "No data found.",
  rowKey,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-brand-gray-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "table-head text-left py-3 px-4 bg-brand-bg",
                  col.sortable && "cursor-pointer select-none hover:text-brand-black",
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable &&
                    (sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-40" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-brand-gray-light text-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-brand-gray-light text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={rowKey ? String(row[rowKey]) : idx}
                className={cn(
                  "border-b border-brand-gray-border transition-colors duration-100",
                  statusRowColor[rowStatus(row)] ?? "hover:bg-brand-bg"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("table-cell", col.className)}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  perPage,
  onPageChange,
}: PaginationProps) {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    )
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between pt-4 px-4">
      <p className="text-xs text-brand-gray-mid">
        Showing <span className="font-semibold text-brand-black">{start}–{end}</span> of{" "}
        <span className="font-semibold text-brand-black">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          className="px-2.5 py-1.5 text-xs rounded-lg border border-brand-gray-border hover:bg-brand-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={i} className="px-2 text-xs text-brand-gray-light">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                "w-8 h-8 text-xs rounded-lg transition-colors",
                currentPage === p
                  ? "bg-brand-yellow text-brand-black font-bold"
                  : "border border-brand-gray-border hover:bg-brand-bg"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          className="px-2.5 py-1.5 text-xs rounded-lg border border-brand-gray-border hover:bg-brand-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
