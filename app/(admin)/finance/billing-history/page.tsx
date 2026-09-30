"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { ClipboardCheck, History, CheckCircle2, XCircle, BadgeDollarSign } from "lucide-react";

const statusVariant: Record<string, "warning" | "info" | "success" | "danger" | "gray"> = {
  PENDING: "warning",
  REVIEWED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

export default function BillingHistoryPage() {
  const { invoices, sessions, billing_sessions, commissions, products, settings, setDB, notify, addAudit, recalcSessionTotals } = useData();
  const { user, hasRole } = useAuth();
  const [filter, setFilter] = useState("");
  const [approveId, setApproveId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      billing_sessions
        .filter((b) => !filter || b.status === filter)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [billing_sessions, filter]
  );

  const isSuper = hasRole("SUPER_ADMIN");
  const isFinance = hasRole("FINANCE");

  const counts = useMemo(() => {
    return {
      total: billing_sessions.length,
      pending: billing_sessions.filter((b) => b.status === "PENDING" || b.status === "REVIEWED").length,
      approved: billing_sessions.filter((b) => b.status === "APPROVED").length,
      rejected: billing_sessions.filter((b) => b.status === "REJECTED").length,
    };
  }, [billing_sessions]);

  const target = approveId ? billing_sessions.find((b) => b.id === approveId) ?? null : null;

  // Hitung komisi untuk sesi tagihan (gross profit + rate per merek dari pengaturan)
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

  const confirmApprove = () => {
    if (!target) return;
    const now = new Date().toISOString();
    const session = sessions.find((s) => s.id === target.session_id);
    const sessionInvoices = invoices.filter(
      (i) => i.session_id === target.session_id && (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED")
    );

    // Bangun transaksi komisi per invoice
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
        b.id === target.id
          ? {
              ...b,
              status: "APPROVED" as const,
              total_commission: newCommissions.reduce((a, c) => a + c.total_commission, 0),
              approved_at: now,
            }
          : b
      ),
      commissions: [...db.commissions, ...newCommissions],
      sessions: db.sessions.map((s) =>
        s.id === target.session_id ? { ...s, status: "DONE" as const } : s
      ),
    }));
    recalcSessionTotals(target.session_id);
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: "APPROVE",
      module: "BILLING_SESSION",
      record_id: target.session_code || target.session_id,
      old_value: "REVIEWED",
      new_value: "APPROVED",
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: "Sesi Tagihan Disetujui",
      message: `Komisi ${formatCurrency(newCommissions.reduce((a, c) => a + c.total_commission, 0))} untuk ${target.sales_name} dihitung otomatis.`,
      type: "SUCCESS",
    });
    setApproveId(null);
  };

  const markReviewed = (id: string) => {
    setDB((db) => ({
      ...db,
      billing_sessions: db.billing_sessions.map((b) => (b.id === id ? { ...b, status: "REVIEWED" as const } : b)),
    }));
    notify({ title: "Sesi Ditandai Review", message: "Menunggu persetujuan Super Admin.", type: "INFO", target_role: "SUPER_ADMIN" });
  };

  const rejectSession = (id: string) => {
    setDB((db) => ({
      ...db,
      billing_sessions: db.billing_sessions.map((b) => (b.id === id ? { ...b, status: "REJECTED" as const } : b)),
    }));
    notify({ title: "Sesi Tagihan Ditolak", message: "Sesi ditolak, komisi tidak dihitung.", type: "ERROR" });
  };

  const commissionFor = (id: string) => commissions.filter((c) => c.session_id === id).reduce((a, c) => a + c.total_commission, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="History Sesi Penagihan"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "History Penagihan" }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sesi" value={String(counts.total)} icon={<History className="w-4 h-4" />} />
        <StatCard title="Menunggu" value={String(counts.pending)} icon={<ClipboardCheck className="w-4 h-4" />} />
        <StatCard title="Disetujui" value={String(counts.approved)} icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard title="Ditolak" value={String(counts.rejected)} icon={<XCircle className="w-4 h-4" />} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-border flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Semua Status"
            className="w-44"
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "REVIEWED", label: "Reviewed" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />
          <span className="text-xs text-brand-gray-light ml-auto">{rows.length} sesi</span>
        </div>

        <div className="divide-y divide-brand-gray-border">
          {rows.map((b) => (
            <div key={b.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-brand-black">{b.sales_name}</p>
                  <Badge variant={statusVariant[b.status] ?? "gray"}>{b.status}</Badge>
                </div>
                <p className="text-[10px] text-brand-gray-light mt-0.5">
                  {b.session_code || "â€”"} Â· {b.total_invoices} invoice Â· {formatDate(b.created_at)}
                  {b.approved_at ? ` Â· setuju ${formatDate(b.approved_at)}` : ""}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-5 text-right">
                <div>
                  <p className="text-[10px] text-brand-gray-light uppercase">Total</p>
                  <p className="text-sm font-bold text-brand-black">{formatCurrency(b.total_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-brand-gray-light uppercase">Outstanding</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency(b.outstanding)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-brand-gray-light uppercase">Komisi</p>
                  <p className="text-sm font-bold text-green-600">
                    {b.status === "APPROVED" ? formatCurrency(b.total_commission ?? commissionFor(b.session_id)) : "â€”"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 justify-end">
                {isFinance && b.status === "PENDING" && (
                  <Button size="sm" variant="secondary" onClick={() => markReviewed(b.id)}>Review</Button>
                )}
                {isSuper && b.status === "REVIEWED" && (
                  <Button size="sm" icon={<ClipboardCheck className="w-3.5 h-3.5" />} onClick={() => setApproveId(b.id)}>
                    Approve & Hitung Komisi
                  </Button>
                )}
                {isSuper && (b.status === "PENDING" || b.status === "REVIEWED") && (
                  <Button size="sm" variant="danger" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => rejectSession(b.id)}>
                    Tolak
                  </Button>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="p-8 text-sm text-brand-gray-light text-center">
              Belum ada sesi penagihan. Buat dari halaman Sesi Tagihan.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={!!approveId}
        onClose={() => setApproveId(null)}
        title="Setujui & Hitung Komisi"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveId(null)}>Batal</Button>
            <Button onClick={confirmApprove} icon={<BadgeDollarSign className="w-4 h-4" />}>Ya, Setujui</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p>
            Setujui sesi tagihan <strong>{target?.sales_name}</strong>? Komisi akan dihitung otomatis dari gross profit
            invoice pada sesi tersebut (utama {settings.main_commission_rate}%, merek sendiri {settings.own_brand_commission_rate}%, merek luar {settings.other_brand_commission_rate}%) dan sesi penjualan ditandai selesai.
          </p>
          {target && (
            <div className="bg-brand-bg rounded-xl p-3 text-xs">
              <div className="flex justify-between">
                <span>Outstanding</span>
                <span className="font-bold">{formatCurrency(target.outstanding)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Invoice</span>
                <span className="font-bold">{target.total_invoices}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
