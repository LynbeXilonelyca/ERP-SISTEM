"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText,
  ShoppingCart,
  Tag,
  CalendarClock,
  Receipt,
  Check,
  X,
  Eye,
} from "lucide-react";

type Tab = "invoice" | "purchase" | "price" | "session" | "billing";

type Decision =
  | { type: "INVOICE"; approve: boolean; id: string }
  | { type: "PURCHASE"; approve: boolean; id: string }
  | { type: "PRICE"; approve: boolean; id: string }
  | { type: "SESSION"; approve: boolean; id: string }
  | { type: "BILLING"; approve: boolean; id: string };

export default function ApprovalsPage() {
  const {
    purchases,
    sessions,
    invoices,
    billing_sessions,
    price_change_requests,
    orders,
    products,
    settings,
    setDB,
    addAudit,
    notify,
    recalcInventory,
    recalcSessionTotals,
  } = useData();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("invoice");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState<{ type: "INVOICE" | "PURCHASE"; id: string } | null>(null);

  const pendingInvoices = useMemo(
    () => invoices.filter((i) => i.invoice_status === "PENDING_SUPER").sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [invoices]
  );
  const pendingPurchases = useMemo(() => purchases.filter((p) => p.status === "SUBMITTED"), [purchases]);
  const pendingPrice = useMemo(() => price_change_requests.filter((r) => r.status === "PENDING"), [price_change_requests]);
  const pendingSessions = useMemo(() => sessions.filter((s) => s.status === "PENDING_REVIEW"), [sessions]);
  const pendingBilling = useMemo(
    () => billing_sessions.filter((b) => b.status === "PENDING" || b.status === "REVIEWED"),
    [billing_sessions]
  );

  const counts = {
    invoice: pendingInvoices.length,
    purchase: pendingPurchases.length,
    price: pendingPrice.length,
    session: pendingSessions.length,
    billing: pendingBilling.length,
  };
  const totalPending = counts.invoice + counts.purchase + counts.price + counts.session + counts.billing;

  const computeCommissionForInvoice = (inv: (typeof invoices)[number]) => {
    let gross = 0;
    let ownGross = 0;
    let otherGross = 0;
    inv.items.forEach((it) => {
      const cost = it.cost_at_transaction ?? 0;
      const profit = (it.selling_price - cost) * it.quantity;
      const product = products.find((p) => p.id === it.product_id);
      if (product?.is_own_brand) ownGross += profit;
      else otherGross += profit;
      gross += profit;
    });
    const main = settings.main_commission_rate;
    const ownRate = settings.own_brand_commission_rate;
    const otherRate = settings.other_brand_commission_rate;
    const mainCommission = Math.max(0, gross) * (main / 100);
    const ownCommission = Math.max(0, ownGross) * (ownRate / 100);
    const subCommission = Math.max(0, otherGross) * (otherRate / 100);
    return {
      gross_profit: Math.max(0, gross),
      main_commission_rate: main,
      main_commission: mainCommission,
      own_brand_rate: ownRate,
      own_brand_commission: ownCommission,
      sub_commission_rate: otherRate,
      sub_commission: subCommission,
      total_commission: mainCommission + ownCommission + subCommission,
    };
  };

  const confirm = () => {
    if (!decision) return;
    const now = new Date().toISOString();
    const approve = decision.approve;
    const who = user?.name ?? "Super Admin";
    const role = user?.role ?? "SUPER_ADMIN";

    if (decision.type === "INVOICE") {
      const inv = invoices.find((i) => i.id === decision.id);
      if (!inv) return;
      if (inv.source === "ORDER") {
        // Invoice dari jalur order/Finance â€” approve â†’ CONFIRMED, tolak â†’ kembali ke finance
        setDB((db) => ({
          ...db,
          invoices: db.invoices.map((i) =>
            i.id === inv.id
              ? {
                  ...i,
                  invoice_status: approve ? "CONFIRMED" : "CANCELLED",
                  payment_status: approve ? "PAID" : i.payment_status,
                  updated_at: now,
                }
              : i
          ),
          orders: db.orders.map((o) =>
            o.id === inv.order_id
              ? { ...o, status: approve ? ("COMPLETED" as const) : ("APPROVED_BY_SALES" as const), completed_at: approve ? now : undefined }
              : o
          ),
        }));
        addAudit({ user_name: who, user_role: role, action: approve ? "APPROVE" : "REJECT", module: "INVOICE", record_id: inv.invoice_number, old_value: "PENDING_SUPER", new_value: approve ? "CONFIRMED" : "CANCELLED", ip_address: "local", device: "Web" });
        notify(
          approve
            ? { title: "Invoice Order Disetujui", message: `${inv.invoice_number} dikonfirmasi & tercatat di history.`, type: "SUCCESS", target_role: "FINANCE" }
            : { title: "Invoice Order Ditolak", message: `${inv.invoice_number} dibatalkan â€” order kembali ke Finance untuk diperbaiki.`, type: "ERROR", target_role: "FINANCE" }
        );
        return;
      }
      setDB((db) => ({
        ...db,
        invoices: db.invoices.map((i) =>
          i.id === inv.id
            ? { ...i, invoice_status: approve ? "PENDING_SHIPPING" : "CANCELLED", updated_at: now }
            : i
        ),
      }));
      addAudit({ user_name: who, user_role: role, action: approve ? "APPROVE" : "REJECT", module: "INVOICE", record_id: inv.invoice_number, old_value: "PENDING_SUPER", new_value: approve ? "PENDING_SHIPPING" : "CANCELLED", ip_address: "local", device: "Web" });
      notify(
        approve
          ? { title: "Invoice Disetujui", message: `${inv.invoice_number} diteruskan ke Admin Pengiriman.`, type: "SUCCESS", target_role: "SHIPPING_ADMIN" }
          : { title: "Invoice Ditolak", message: `${inv.invoice_number} dibatalkan.`, type: "ERROR" }
      );
    } else if (decision.type === "PURCHASE") {
      const pr = purchases.find((p) => p.id === decision.id);
      if (!pr) return;
      setDB((db) => ({
        ...db,
        purchases: db.purchases.map((p) =>
          p.id === pr.id
            ? { ...p, status: approve ? "APPROVED" : "REJECTED", approved_by: user?.id ?? "u1", approved_by_name: user?.name, approved_at: now }
            : p
        ),
      }));
      if (approve) {
        pr.items.forEach((item) => {
          setDB((db) => ({
            ...db,
            inventory: db.inventory.map((inv) =>
              inv.product_id === item.product_id
                ? { ...inv, physical_stock: inv.physical_stock + item.quantity }
                : inv
            ),
            movements: [
              ...db.movements,
              {
                id: `m${Date.now()}-${item.product_id}`,
                product_id: item.product_id,
                product_name: item.product_name,
                sku: item.sku,
                movement_type: "PURCHASE" as const,
                quantity: item.quantity,
                before_stock: 0,
                after_stock: 0,
                reference_type: "PURCHASE",
                reference_id: pr.purchase_code,
                created_by: who,
                created_at: now,
              },
            ],
          }));
          recalcInventory(item.product_id);
        });
        if (pr.for_sales_id) {
          const forSalesId = pr.for_sales_id;
          const forSalesName = pr.for_sales_name ?? "";
          setDB((db) => ({
            ...db,
            orders: [
              ...db.orders,
              {
                id: `ord${Date.now()}`,
                order_code: `ORD-2026-${String(db.orders.length + 1).padStart(3, "0")}`,
                purchase_id: pr.id,
                purchase_code: pr.purchase_code,
                supplier_id: pr.supplier_id,
                supplier_name: pr.supplier_name,
                sales_id: forSalesId,
                sales_name: forSalesName,
                items: pr.items,
                total_amount: pr.total_amount,
                status: "AWAITING_SALES" as const,
                created_at: now,
              },
            ],
          }));
          notify({
            title: "Ada Orderan Masuk",
            message: `Order ${pr.purchase_code} dari supplier ${pr.supplier_name} menunggu cek ketersediaan barang oleh ${forSalesName}.`,
            type: "SUCCESS",
            target_role: "SALES",
          });
        }
      }
      addAudit({ user_name: who, user_role: role, action: approve ? "APPROVE" : "REJECT", module: "PURCHASE", record_id: pr.purchase_code, old_value: "SUBMITTED", new_value: approve ? "APPROVED" : "REJECTED", ip_address: "local", device: "Web" });
      notify({ title: approve ? "Purchase Disetujui" : "Purchase Ditolak", message: `${pr.purchase_code} ${approve ? "disetujui â€” stok bertambah" : "ditolak â€” stok tidak berubah"}`, type: approve ? "SUCCESS" : "ERROR", target_role: "PURCHASE_ADMIN" });
    } else if (decision.type === "PRICE") {
      const req = price_change_requests.find((r) => r.id === decision.id);
      if (!req) return;
      setDB((db) => ({
        ...db,
        price_change_requests: db.price_change_requests.map((r) =>
          r.id === req.id
            ? { ...r, status: approve ? "APPROVED" : "REJECTED", decided_at: now, notes: reason || r.notes }
            : r
        ),
        products: approve
          ? db.products.map((p) =>
              p.id === req.product_id
                ? {
                    ...p,
                    prices: p.prices.map((x) =>
                      x.payment_term_id === req.payment_term_id
                        ? { ...x, price: req.new_price, effective_from: now }
                        : x
                    ),
                  }
                : p
            )
          : db.products,
      }));
      addAudit({ user_name: who, user_role: role, action: approve ? "APPROVE" : "REJECT", module: "PRICE", record_id: req.sku, old_value: String(req.old_price), new_value: String(req.new_price), ip_address: "local", device: "Web" });
      notify({ title: approve ? "Perubahan Harga Disetujui" : "Perubahan Harga Ditolak", message: `${req.product_name} (${req.payment_term_label}): ${formatCurrency(req.old_price)} â†’ ${formatCurrency(req.new_price)}`, type: approve ? "SUCCESS" : "ERROR", target_role: req.requested_by_role });
    } else if (decision.type === "SESSION") {
      const s = sessions.find((x) => x.id === decision.id);
      if (!s) return;
      setDB((db) => ({
        ...db,
        sessions: db.sessions.map((x) => (x.id === s.id ? { ...x, status: approve ? "DONE" : "CANCELLED" } : x)),
      }));
      addAudit({ user_name: who, user_role: role, action: approve ? "APPROVE" : "REJECT", module: "SESSION", record_id: s.session_code, old_value: "PENDING_REVIEW", new_value: approve ? "DONE" : "CANCELLED", ip_address: "local", device: "Web" });
      notify({ title: approve ? "Sesi Disetujui" : "Sesi Ditolak", message: `${s.session_code} ${approve ? "dikunci & komisi final" : "dibatalkan"}`, type: approve ? "SUCCESS" : "ERROR" });
    } else {
      const t = billing_sessions.find((b) => b.id === decision.id);
      if (!t) return;
      if (approve) {
        const session = sessions.find((s) => s.id === t.session_id);
        const sessionInvoices = invoices.filter(
          (i) => i.session_id === t.session_id && (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED")
        );
        const newCommissions = sessionInvoices.map((inv) => {
          const c = computeCommissionForInvoice(inv);
          return {
            id: `cm${Date.now()}-${inv.id}`,
            session_id: inv.session_id,
            sales_id: inv.sales_id,
            sales_name: inv.sales_name,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            gross_profit: c.gross_profit,
            main_commission_rate: c.main_commission_rate,
            main_commission: c.main_commission,
            own_brand_rate: c.own_brand_rate,
            own_brand_commission: c.own_brand_commission,
            sub_commission_rate: c.sub_commission_rate,
            sub_commission: c.sub_commission,
            total_commission: c.total_commission,
            status: "APPROVED" as const,
            created_at: now,
          };
        });
        setDB((db) => ({
          ...db,
          billing_sessions: db.billing_sessions.map((b) =>
            b.id === t.id
              ? {
                  ...b,
                  status: "APPROVED" as const,
                  total_commission: newCommissions.reduce((a, c) => a + c.total_commission, 0),
                  approved_at: now,
                }
              : b
          ),
          commissions: [...db.commissions, ...newCommissions],
          sessions: db.sessions.map((s) => (s.id === t.session_id ? { ...s, status: "DONE" as const } : s)),
        }));
        recalcSessionTotals(t.session_id);
        addAudit({ user_name: who, user_role: role, action: "APPROVE", module: "BILLING_SESSION", record_id: session?.session_code ?? t.session_id, old_value: "REVIEWED", new_value: "APPROVED", ip_address: "local", device: "Web" });
        notify({ title: "Sesi Tagihan Disetujui", message: `Komisi ${formatCurrency(newCommissions.reduce((a, c) => a + c.total_commission, 0))} untuk ${t.sales_name} dihitung otomatis.`, type: "SUCCESS" });
      } else {
        setDB((db) => ({
          ...db,
          billing_sessions: db.billing_sessions.map((b) => (b.id === t.id ? { ...b, status: "REJECTED" as const } : b)),
        }));
        notify({ title: "Sesi Tagihan Ditolak", message: "Sesi ditolak, komisi tidak dihitung.", type: "ERROR" });
      }
    }

    setDecision(null);
    setReason("");
  };

  const anyApproval = (id: string, approve: boolean) => {
    if (tab === "price") setDecision({ type: "PRICE", approve, id });
    else if (tab === "purchase") setDecision({ type: "PURCHASE", approve, id });
    else if (tab === "session") setDecision({ type: "SESSION", approve, id });
    else if (tab === "billing") setDecision({ type: "BILLING", approve, id });
    else setDecision({ type: "INVOICE", approve, id });
  };

  const decisionMessage = (() => {
    if (!decision) return "";
    const noun = decision.type === "PURCHASE" ? "purchase (stok akan bertambah jika disetujui)" : decision.type === "PRICE" ? "perubahan harga" : decision.type === "SESSION" ? "sesi penjualan" : decision.type === "BILLING" ? "sesi tagihan (komisi dihitung otomatis)" : "invoice penjualan";
    return `${decision.approve ? "Anda akan menyetujui" : "Anda akan menolak"} ${noun}.${decision.type === "PRICE" ? " Ada catatan untuk ditambahkan?" : " Lanjutkan?"}`;
  })();

  const invoiceDetail = detail?.type === "INVOICE" ? invoices.find((i) => i.id === detail.id) ?? null : null;
  const purchaseDetail = detail?.type === "PURCHASE" ? purchases.find((p) => p.id === detail.id) ?? null : null;

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "invoice", label: "Invoice", count: counts.invoice, icon: <FileText className="w-4 h-4" /> },
    { key: "purchase", label: "Stok / Purchase", count: counts.purchase, icon: <ShoppingCart className="w-4 h-4" /> },
    { key: "price", label: "Perubahan Harga", count: counts.price, icon: <Tag className="w-4 h-4" /> },
    { key: "session", label: "Sesi Penjualan", count: counts.session, icon: <CalendarClock className="w-4 h-4" /> },
    { key: "billing", label: "Sesi Tagihan", count: counts.billing, icon: <Receipt className="w-4 h-4" /> },
  ];

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-3 p-4 hover:bg-brand-bg transition-colors">{children}</div>
  );

  const Actions = ({ id }: { id: string }) => (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" variant="secondary" icon={<X className="w-3.5 h-3.5" />} onClick={() => anyApproval(id, false)}>
        Tolak
      </Button>
      <Button size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => anyApproval(id, true)}>
        Approve
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Approvals" }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="card py-3 text-left transition-transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-brand-yellow/20 text-brand-yellow-dark">{t.icon}</span>
              <Badge variant={t.count > 0 ? "danger" : "default"}>{t.count}</Badge>
            </div>
            <p className="text-2xl font-bold text-brand-black mt-2">{t.count}</p>
            <p className="text-xs text-brand-gray-mid mt-0.5">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <p className="text-xs font-bold text-brand-black">
            Menunggu Persetujuan - {totalPending} item
          </p>
        </div>

        <div className="divide-y divide-brand-gray-border">
          {tab === "invoice" &&
            (pendingInvoices.length === 0 ? (
              <EmptyState />
            ) : (
              pendingInvoices.map((inv) => (
                <Row key={inv.id}>
                  <span className="p-2 rounded-xl bg-blue-100 text-blue-600">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-black">
                      {inv.invoice_number}
                      {inv.source === "ORDER" && (
                        <span className="ml-2 text-[9px] font-bold uppercase bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md">Jalur Order</span>
                      )}
                    </p>
                    <p className="text-[10px] text-brand-gray-mid">
                      {inv.store_name} Â· {inv.sales_name} Â· {formatCurrency(inv.total)}
                    </p>
                    {inv.change_note && (
                      <p className="text-[10px] text-orange-600 mt-0.5">Ubah: {inv.change_note}</p>
                    )}
                  </div>
                  <button
                    className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-gray-mid hover:text-brand-black transition-colors shrink-0"
                    title="Detail"
                    onClick={() => setDetail({ type: "INVOICE", id: inv.id })}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <Actions id={inv.id} />
                </Row>
              ))
            ))}

          {tab === "purchase" &&
            (pendingPurchases.length === 0 ? (
              <EmptyState />
            ) : (
              pendingPurchases.map((p) => (
                <Row key={p.id}>
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                    <ShoppingCart className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-black">{p.purchase_code}</p>
                    <p className="text-[10px] text-brand-gray-mid">
                      {p.requested_by_name} Â· {p.items.length} item Â· {formatCurrency(p.total_amount)}
                    </p>
                    <p className="text-[10px] text-brand-gray-light">
                      Supplier: {p.supplier_name || "â€”"}
                      {p.for_sales_name ? ` Â· Untuk: ${p.for_sales_name}` : ""}
                    </p>
                  </div>
                  <button
                    className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-gray-mid hover:text-blue-600 transition-colors shrink-0"
                    title="Lihat bukti & detail"
                    onClick={() => setDetail({ type: "PURCHASE", id: p.id })}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <Actions id={p.id} />
                </Row>
              ))
            ))}

          {tab === "price" &&
            (pendingPrice.length === 0 ? (
              <EmptyState />
            ) : (
              pendingPrice.map((r) => (
                <Row key={r.id}>
                  <span className="p-2 rounded-xl bg-purple-100 text-purple-600">
                    <Tag className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-black">
                      {r.product_name} â€” {r.sku}
                    </p>
                    <p className="text-[10px] text-brand-gray-mid">
                      {r.payment_term_label}: {formatCurrency(r.old_price)} â†’{" "}
                      <span className="font-bold text-brand-yellow-dark">{formatCurrency(r.new_price)}</span> Â· diajukan {r.requested_by_name}
                    </p>
                  </div>
                  <Actions id={r.id} />
                </Row>
              ))
            ))}

          {tab === "session" &&
            (pendingSessions.length === 0 ? (
              <EmptyState />
            ) : (
              pendingSessions.map((s) => (
                <Row key={s.id}>
                  <span className="p-2 rounded-xl bg-green-100 text-green-600">
                    <CalendarClock className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-black">{s.session_code}</p>
                    <p className="text-[10px] text-brand-gray-mid">
                      {s.sales_name} Â· {s.total_invoices} invoice Â· {formatCurrency(s.total_revenue)}
                    </p>
                  </div>
                  <Actions id={s.id} />
                </Row>
              ))
            ))}

          {tab === "billing" &&
            (pendingBilling.length === 0 ? (
              <EmptyState />
            ) : (
              pendingBilling.map((b) => (
                <Row key={b.id}>
                  <span className="p-2 rounded-xl bg-amber-100 text-amber-600">
                    <Receipt className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-black">{b.session_code || b.session_id}</p>
                    <p className="text-[10px] text-brand-gray-mid">
                      {b.sales_name} Â· status {b.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Actions id={b.id} />
                </Row>
              ))
            ))}
        </div>
      </div>

      {/* Detail invoice / purchase */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.type === "INVOICE" ? `Detail â€” ${invoiceDetail?.invoice_number}` : detail?.type === "PURCHASE" ? `Detail â€” ${purchaseDetail?.purchase_code}` : "Detail"}
        size="md"
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button>}
      >
        {invoiceDetail && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Customer" value={invoiceDetail.store_name} />
            <DetailRow label="Sales" value={invoiceDetail.sales_name} />
            <DetailRow label="Term Pembayaran" value={invoiceDetail.payment_term_label} />
            <div className="space-y-1.5">
              {invoiceDetail.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-brand-gray-dark">
                    {it.product_name} Ã— {it.quantity}
                  </span>
                  <span className="font-bold">{formatCurrency(it.selling_price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-brand-gray-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoiceDetail.total)}</span>
            </div>
            {invoiceDetail.change_note && (
              <div className="bg-orange-50 rounded-xl p-3 text-xs">
                <p className="font-bold text-orange-600 mb-1">Catatan Perubahan (dari Sales Admin)</p>
                <p className="text-brand-gray-mid">{invoiceDetail.change_note}</p>
              </div>
            )}
          </div>
        )}
        {purchaseDetail && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Diajukan" value={purchaseDetail.requested_by_name} />
            <DetailRow label="Supplier" value={purchaseDetail.supplier_name} />
            <DetailRow label="Ditujukan Untuk Sales" value={purchaseDetail.for_sales_name} />
            <DetailRow label="Tanggal" value={formatDate(purchaseDetail.created_at)} />
            {purchaseDetail.notes && <DetailRow label="Catatan" value={purchaseDetail.notes} />}
            <div className="space-y-1.5">
              {purchaseDetail.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-brand-gray-dark">
                    {it.product_name} Ã— {it.quantity} @ {formatCurrency(it.cost_price)}
                  </span>
                  <span className="font-bold">{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-brand-gray-border pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(purchaseDetail.total_amount)}</span>
            </div>
            {purchaseDetail.invoice_url && (
              <div>
                <p className="text-xs font-bold text-brand-gray-mid uppercase mb-2">Bukti Foto Invoice</p>
                <img src={purchaseDetail.invoice_url} alt="bukti" className="max-h-48 rounded-xl border border-brand-gray-border" />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision?.approve ? "Approve" : "Reject"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecision(null)}>Batal</Button>
            <Button variant={decision?.approve ? "primary" : "danger"} onClick={confirm}>
              {decision?.approve ? "Ya, Approve" : "Ya, Tolak"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-gray-dark">{decisionMessage}</p>
          {decision?.type === "PRICE" && (
            <Textarea label="Catatan keputusan (opsional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan keputusan" />
          )}
        </div>
      </Modal>
    </div>
  );
}

function EmptyState() {
  return <div className="py-12 text-center text-brand-gray-light text-sm">Tidak ada approval yang menunggu.</div>;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-brand-gray-mid">{label}</span>
      <span className="font-bold text-brand-black">{value}</span>
    </div>
  );
}
