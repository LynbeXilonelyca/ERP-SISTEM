"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { ClipboardCheck, History as HistoryIcon, CheckCircle2, XCircle, Printer, AlertCircle } from "lucide-react";

const statusVariant: Record<string, "warning" | "info" | "success" | "danger" | "gray"> = {
  SUBMITTED: "warning",
  REVIEWED: "info",
  APPROVED: "success",
  CANCELLED: "danger",
};

export default function BillingHistoryPage() {
  const { invoices, sessions, commissions, products, settings, payments, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const [filter, setFilter] = useState("");
  const [salesFilter, setSalesFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [approveId, setApproveId] = useState<string | null>(null);

  const isSuper = hasRole("SUPER_ADMIN");
  const isFinance = hasRole("FINANCE");

  const rows = useMemo(
    () =>
      sessions
        .filter((s) => s.status !== "ACTIVE")
        .filter((s) => !filter || s.status === filter)
        .filter((s) => !salesFilter || s.sales_name === salesFilter)
        .filter((s) => !monthFilter || s.period === monthFilter)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [sessions, filter, salesFilter, monthFilter]
  );

  const salesNames = useMemo(() => Array.from(new Set(sessions.map((s) => s.sales_name))), [sessions]);
  const periods = useMemo(() => Array.from(new Set(sessions.map((s) => s.period))).sort(), [sessions]);

  const counts = useMemo(() => {
    const relevant = sessions.filter((s) => s.status !== "ACTIVE");
    return {
      total: relevant.length,
      submitted: relevant.filter((s) => s.status === "SUBMITTED").length,
      reviewed: relevant.filter((s) => s.status === "REVIEWED").length,
      approved: relevant.filter((s) => s.status === "APPROVED").length,
    };
  }, [sessions]);

  const target = approveId ? sessions.find((s) => s.id === approveId) ?? null : null;

  // --- Helper komisi per invoice ---
  const paidFor = (invId: string) =>
    payments.filter((p) => p.invoice_id === invId).reduce((a, p) => a + (p.amount || 0), 0);

  const invoiceCommission = (inv: (typeof invoices)[number]) => {
    let ownGross = 0;
    let otherGross = 0;
    inv.items.forEach((it) => {
      const cost = it.cost_at_transaction ?? 0;
      const profit = (it.selling_price - cost) * it.quantity;
      const product = products.find((p) => p.id === it.product_id);
      if (product?.is_own_brand) ownGross += profit;
      else otherGross += profit;
    });
    const total = inv.total || 1;
    const paid = Math.min(total, paidFor(inv.id));
    const ratio = paid / total;
    const isLate = inv.due_date && paid < total && new Date(inv.due_date).getTime() < Date.now();
    // Telat bayar: komisi invoice ini distop sampai lunas
    const allow = isLate ? 0 : 1;
    const ownRate = settings.own_brand_commission_rate;
    const otherRate = settings.other_brand_commission_rate;
    const ownCommission = Math.max(0, ownGross) * (ownRate / 100) * ratio * allow;
    const otherCommission = Math.max(0, otherGross) * (otherRate / 100) * ratio * allow;
    return {
      collected_amount: paid,
      gross_profit: Math.max(0, ownGross + otherGross),
      own_brand_rate: ownRate,
      own_brand_commission: ownCommission,
      other_brand_rate: otherRate,
      other_brand_commission: otherCommission,
      total_commission: ownCommission + otherCommission,
      is_late: !!isLate,
    };
  };

  const confirmApprove = () => {
    if (!target) return;
    const now = new Date().toISOString();
    const sessionInvoices = invoices.filter(
      (i) => i.session_id === target.id && (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED")
    );
    const salesInvoices = invoices.filter((i) => i.session_id === target.id && i.invoice_status !== "CANCELLED");
    const totalRevenue = salesInvoices.reduce((a, i) => a + i.total, 0);
    const totalCollected = salesInvoices.reduce((a, i) => a + paidFor(i.id), 0);
    const pct = totalRevenue > 0 ? totalCollected / totalRevenue : 0;
    const hasLate = sessionInvoices.some((inv) => {
      const paid = paidFor(inv.id);
      return inv.due_date && paid < inv.total && new Date(inv.due_date).getTime() < Date.now();
    });

    let sessionCommission = 0;
    let bonus = 0;
    let newCommissions: (typeof commissions)[number][] = [];

    // Threshold 98% baru cair
    if (pct >= settings.commission_threshold_pct / 100) {
      newCommissions = sessionInvoices.map((inv) => {
        const c = invoiceCommission(inv);
        sessionCommission += c.total_commission;
        return {
          id: `cm${Date.now()}-${inv.id}`,
          session_id: target.id,
          sales_id: target.sales_id,
          sales_name: target.sales_name,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          gross_profit: c.gross_profit,
          own_brand_rate: c.own_brand_rate,
          own_brand_commission: c.own_brand_commission,
          other_brand_rate: c.other_brand_rate,
          other_brand_commission: c.other_brand_commission,
          total_commission: c.total_commission,
          collected_amount: c.collected_amount,
          status: "APPROVED" as const,
          created_at: now,
        };
      });
      // Bonus 1jt untuk capaian 100% & tidak ada yang telat
      if (settings.bonus_enabled && pct >= 1 && !hasLate) {
        bonus = settings.bonus_amount;
        sessionCommission += bonus;
      }
    }

    setDB((db) => ({
      ...db,
      sessions: db.sessions.map((s) =>
        s.id === target.id
          ? {
              ...s,
              status: "APPROVED" as const,
              total_collected: totalCollected,
              total_commission: sessionCommission,
              bonus_amount: bonus,
              approved_at: now,
            }
          : s
      ),
      commissions: sessionCommission > 0 ? [...db.commissions, ...newCommissions] : db.commissions,
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "APPROVE",
      module: "SESSION",
      record_id: target.session_code,
      old_value: "REVIEWED",
      new_value: "APPROVED",
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: "Session Disetujui",
      message:
        pct < settings.commission_threshold_pct / 100
          ? `Penagihan ${Math.round(pct * 100)}% belum mencapai threshold ${settings.commission_threshold_pct}% — komisi belum cair.`
          : `Komisi ${formatCurrency(sessionCommission)} untuk ${target.sales_name} tercatat${bonus > 0 ? ` (termasuk bonus ${formatCurrency(bonus)})` : ""}.`,
      type: pct < settings.commission_threshold_pct / 100 ? "WARNING" : "SUCCESS",
    });
    setApproveId(null);
  };

  const markReviewed = (id: string) => {
    setDB((db) => ({
      ...db,
      sessions: db.sessions.map((s) => (s.id === id ? { ...s, status: "REVIEWED" as const, reviewed_at: new Date().toISOString() } : s)),
    }));
    notify({ title: "Session Di-Review", message: "Menunggu approval Super Admin.", type: "INFO", target_role: "SUPER_ADMIN" });
  };

  const rejectSession = (id: string) => {
    setDB((db) => ({
      ...db,
      sessions: db.sessions.map((s) => (s.id === id ? { ...s, status: "CANCELLED" as const } : s)),
    }));
    notify({ title: "Session Ditolak", message: "Session dibatalkan, komisi tidak dihitung.", type: "ERROR" });
  };

  const commissionFor = (id: string) => commissions.filter((c) => c.session_id === id).reduce((a, c) => a + c.total_commission, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approval Session"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "Approval Session" }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Session" value={String(counts.total)} icon={<HistoryIcon className="w-4 h-4" />} />
        <StatCard title="Menunggu Finance" value={String(counts.submitted)} icon={<ClipboardCheck className="w-4 h-4" />} />
        <StatCard title="Review Finance" value={String(counts.reviewed)} icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard title="Disetujui" value={String(counts.approved)} icon={<XCircle className="w-4 h-4" />} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-border flex flex-wrap items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Semua Status"
            className="w-44"
            options={[
              { value: "SUBMITTED", label: "Submitted" },
              { value: "REVIEWED", label: "Reviewed" },
              { value: "APPROVED", label: "Approved" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
          <Select
            value={salesFilter}
            onChange={(e) => setSalesFilter(e.target.value)}
            placeholder="Semua Sales"
            className="w-44"
            options={salesNames.map((n) => ({ value: n, label: n }))}
          />
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            placeholder="Semua Bulan"
            className="w-40"
            options={periods.map((p) => ({ value: p, label: p }))}
          />
          <span className="text-xs text-brand-gray-light ml-auto">{rows.length} session</span>
        </div>

        <div className="divide-y divide-brand-gray-border">
          {rows.map((b) => {
            const lateCount = invoices.some((inv) => {
              if (inv.session_id !== b.id) return false;
              const paid = paidFor(inv.id);
              return inv.due_date && paid < inv.total && new Date(inv.due_date).getTime() < Date.now();
            })
              ? 1
              : 0;
            return (
              <div key={b.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-brand-black">{b.sales_name}</p>
                    <Badge variant={statusVariant[b.status] ?? "gray"}>{b.status}</Badge>
                    {lateCount > 0 && (
                      <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-0.5" /> Telat Bayar</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-brand-gray-light mt-0.5">
                    {b.session_code} · Periode {b.period} · {b.total_invoices} invoice · {formatDate(b.created_at)}
                    {b.approved_at ? ` · setuju ${formatDate(b.approved_at)}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-5 text-right">
                  <div>
                    <p className="text-[10px] text-brand-gray-light uppercase">Total</p>
                    <p className="text-sm font-bold text-brand-black">{formatCurrency(b.total_revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-gray-light uppercase">Ditagih</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(b.total_collected)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-gray-light uppercase">Komisi</p>
                    <p className="text-sm font-bold text-green-600">
                      {b.status === "APPROVED" ? formatCurrency(b.total_commission) : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  {isFinance && b.status === "SUBMITTED" && (
                    <Button size="sm" variant="secondary" onClick={() => markReviewed(b.id)}>Review</Button>
                  )}
                  {isSuper && b.status === "REVIEWED" && (
                    <Button size="sm" icon={<ClipboardCheck className="w-3.5 h-3.5" />} onClick={() => setApproveId(b.id)}>
                      Approve
                    </Button>
                  )}
                  {isSuper && (b.status === "SUBMITTED" || b.status === "REVIEWED") && (
                    <Button size="sm" variant="danger" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => rejectSession(b.id)}>
                      Tolak
                    </Button>
                  )}
                  {b.status === "APPROVED" && (
                    <Button size="sm" variant="secondary" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
                      Print
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="p-8 text-sm text-brand-gray-light text-center">
              Belum ada session yang diajukan. Sales mengirim session dari menu History.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={!!approveId}
        onClose={() => setApproveId(null)}
        title="Setujui Session"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveId(null)}>Batal</Button>
            <Button onClick={confirmApprove} icon={<ClipboardCheck className="w-4 h-4" />}>Ya, Setujui</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p>
            Setujui session <strong>{target?.sales_name}</strong> ({target?.period})? Komisi dihitung dari penagihan yang
            sudah dibayar (Merek Sendiri {settings.own_brand_commission_rate}%, Merek Lain {settings.other_brand_commission_rate}%).
          </p>
          <div className="bg-brand-bg rounded-xl p-3 text-xs">
            <div className="flex justify-between">
              <span>Threshold cair</span>
              <span className="font-bold">{settings.commission_threshold_pct}%</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Invoice</span>
              <span className="font-bold">{target?.total_invoices}</span>
            </div>
            {settings.bonus_enabled && (
              <div className="flex justify-between mt-1">
                <span>Bonus capaian 100%</span>
                <span className="font-bold text-brand-yellow-dark">{formatCurrency(settings.bonus_amount)}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-brand-gray-light">
            Invoice yang telat dibayar otomatis tidak dikomisi sampai lunas. Komisi hanya cair jika penagihan &ge;{" "}
            {settings.commission_threshold_pct}% dari total.
          </p>
        </div>
      </Modal>
    </div>
  );
}