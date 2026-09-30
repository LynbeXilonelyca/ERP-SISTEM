"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import {
  Package,
  Users,
  FileText,
  ShoppingCart,
  Truck,
  ClipboardList,
  Search as SearchIcon,
} from "lucide-react";

export default function SearchPage() {
  const { products, customers, invoices, purchases, suppliers, orders } = useData();
  const [q, setQ] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [section, setSection] = useState<"all" | "product" | "customer" | "invoice" | "purchase" | "supplier" | "order">("all");

  const needle = q.trim().toLowerCase();
  const inRange = (date?: string) => {
    if (!date) return true;
    const d = date.slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };
  const matchText = (...vals: (string | undefined)[]) =>
    !needle || vals.some((v) => (v ?? "").toLowerCase().includes(needle));

  const productResults = useMemo(
    () =>
      products.filter((p) => matchText(p.name, p.sku, p.brand_name, p.category_name) && inRange(p.created_at)),
    [products, needle, fromDate, toDate]
  );
  const customerResults = useMemo(
    () =>
      customers.filter((c) => matchText(c.store_name, c.owner_name, c.customer_code, c.city, c.sales_name) && inRange(c.created_at)),
    [customers, needle, fromDate, toDate]
  );
  const invoiceResults = useMemo(
    () =>
      invoices.filter(
        (i) =>
          matchText(i.invoice_number, i.customer_name, i.store_name, i.sales_name, ...i.items.map((it) => it.product_name)) &&
          inRange(i.created_at)
      ),
    [invoices, needle, fromDate, toDate]
  );
  const purchaseResults = useMemo(
    () =>
      purchases.filter(
        (p) =>
          matchText(p.purchase_code, p.supplier_name, p.requested_by_name, p.for_sales_name) &&
          inRange(p.created_at) &&
          (!supplierFilter || p.supplier_id === supplierFilter)
      ),
    [purchases, needle, supplierFilter, fromDate, toDate]
  );
  const supplierResults = useMemo(
    () => suppliers.filter((s) => matchText(s.name, s.supplier_code, s.contact_person, s.phone) && inRange(s.created_at)),
    [suppliers, needle, fromDate, toDate]
  );
  const orderResults = useMemo(
    () =>
      orders.filter(
        (o) =>
          matchText(o.order_code, o.supplier_name, o.sales_name, ...o.items.map((it) => it.product_name)) &&
          inRange(o.created_at) &&
          (!supplierFilter || o.supplier_id === supplierFilter)
      ),
    [orders, needle, supplierFilter, fromDate, toDate]
  );

  const groups = [
    { key: "product" as const, label: "Produk", count: productResults.length, icon: <Package className="w-4 h-4" /> },
    { key: "customer" as const, label: "Customer", count: customerResults.length, icon: <Users className="w-4 h-4" /> },
    { key: "invoice" as const, label: "Invoice", count: invoiceResults.length, icon: <FileText className="w-4 h-4" /> },
    { key: "purchase" as const, label: "Purchase", count: purchaseResults.length, icon: <ShoppingCart className="w-4 h-4" /> },
    { key: "supplier" as const, label: "Supplier", count: supplierResults.length, icon: <Truck className="w-4 h-4" /> },
    { key: "order" as const, label: "Order", count: orderResults.length, icon: <ClipboardList className="w-4 h-4" /> },
  ];

  const visible = (key: (typeof groups)[number]["key"]) => section === "all" || section === key;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pencarian Global"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Search" }]}
      />

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <SearchInput value={q} onChange={setQ} placeholder="Ketik nama / kode / SKU untuk mencari..." />
          </div>
          <Select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Semua Supplier"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="Dari" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="Sampai" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSection("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
              section === "all" ? "bg-brand-black text-white" : "bg-brand-bg text-brand-gray-mid hover:bg-brand-yellow/20"
            )}
          >
            <SearchIcon className="w-3 h-3" /> Semua
          </button>
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => setSection(g.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
                section === g.key ? "bg-brand-black text-white" : "bg-brand-bg text-brand-gray-mid hover:bg-brand-yellow/20"
              )}
            >
              {g.icon} {g.label}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", section === g.key ? "bg-white/20" : "bg-white border border-brand-gray-border")}>
                {g.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!q && <p className="text-sm text-brand-gray-light text-center py-8">Ketik kata kunci untuk mulai mencari.</p>}

      {q && visible("product") && (
        <ResultSection title="Produk" icon={<Package className="w-4 h-4" />} count={productResults.length}>
          {productResults.map((p) => (
            <Row key={p.id} title={p.name} sub={p.sku + " Â· " + p.brand_name} right={
              <div className="text-right">
                <p className="text-sm font-bold text-brand-black">{formatCurrency(p.prices[0]?.price ?? 0)}</p>
                <p className="text-[10px] text-brand-gray-light">{p.category_name}</p>
              </div>
            } />
          ))}
        </ResultSection>
      )}

      {q && visible("customer") && (
        <ResultSection title="Customer" icon={<Users className="w-4 h-4" />} count={customerResults.length}>
          {customerResults.map((c) => (
            <Row key={c.id} title={c.store_name} sub={c.owner_name + " Â· " + c.city + " Â· PIC " + c.sales_name} right={
              <div className="text-right">
                <p className="text-sm font-bold text-brand-black">{formatCurrency(c.outstanding)}</p>
                <p className="text-[10px] text-brand-gray-light">Outstanding</p>
              </div>
            } />
          ))}
        </ResultSection>
      )}

      {q && visible("invoice") && (
        <ResultSection title="Invoice" icon={<FileText className="w-4 h-4" />} count={invoiceResults.length}>
          {invoiceResults.map((i) => (
            <Row key={i.id} title={i.invoice_number} sub={i.store_name + " Â· " + i.sales_name + " Â· " + formatDate(i.created_at)} right={<div className="text-right"><Badge variant={i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED" ? "success" : "default"}>{i.invoice_status.replace(/_/g, " ")}</Badge><p className="text-xs font-bold text-brand-black mt-1">{formatCurrency(i.total)}</p></div>} />
          ))}
        </ResultSection>
      )}

      {q && visible("purchase") && (
        <ResultSection title="Purchase" icon={<ShoppingCart className="w-4 h-4" />} count={purchaseResults.length}>
          {purchaseResults.map((p) => (
            <Row key={p.id} title={p.purchase_code} sub={"Supplier: " + p.supplier_name + (p.for_sales_name ? " Â· Untuk: " + p.for_sales_name : "") + " Â· " + formatDate(p.created_at)} right={<div className="text-right"><p className="text-xs font-bold text-brand-black">{formatCurrency(p.total_amount)}</p><p className="text-[10px] text-brand-gray-light uppercase">{p.status}</p></div>} />
          ))}
        </ResultSection>
      )}

      {q && visible("supplier") && (
        <ResultSection title="Supplier" icon={<Truck className="w-4 h-4" />} count={supplierResults.length}>
          {supplierResults.map((s) => (
            <Row key={s.id} title={s.name} sub={s.supplier_code + " Â· " + s.contact_person + " Â· " + s.phone} right={<Badge variant={s.status === "ACTIVE" ? "success" : "gray"}>{s.status}</Badge>} />
          ))}
        </ResultSection>
      )}

      {q && visible("order") && (
        <ResultSection title="Order" icon={<ClipboardList className="w-4 h-4" />} count={orderResults.length}>
          {orderResults.map((o) => (
            <Row key={o.id} title={o.order_code} sub={"Supplier: " + o.supplier_name + " Â· Sales: " + o.sales_name + " Â· " + formatDate(o.created_at)} right={<div className="text-right"><p className="text-xs font-bold text-brand-black">{formatCurrency(o.total_amount)}</p><p className="text-[10px] text-brand-gray-light uppercase">{o.status.replace(/_/g, " ")}</p></div>} />
          ))}
        </ResultSection>
      )}

      {q &&
        groups.every((g) => g.count === 0) && (
          <p className="text-sm text-brand-gray-light text-center py-8">Tidak ada hasil untuk "{q}".</p>
        )}
    </div>
  );
}

function ResultSection({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-brand-gray-border flex items-center gap-2">
        <span className="p-2 rounded-xl bg-brand-yellow/20 text-brand-yellow-dark">{icon}</span>
        <p className="section-title">{title}</p>
        <span className="ml-auto text-xs text-brand-gray-light">{count} hasil</span>
      </div>
      <div className="divide-y divide-brand-gray-border">{children}</div>
    </div>
  );
}

function Row({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-black truncate">{title}</p>
        <p className="text-[10px] text-brand-gray-light truncate">{sub}</p>
      </div>
      {right}
    </div>
  );
}
