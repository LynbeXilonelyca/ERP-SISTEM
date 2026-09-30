"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Send, Users, FileText, Wallet } from "lucide-react";

export default function BillingSessionsPage() {
  const { users, sessions, invoices, payments, billing_sessions, setDB, notify, addAudit } = useData();
  const { user } = useAuth();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [sendConfirm, setSendConfirm] = useState(false);

  const salesUsers = useMemo(
    () => users.filter((u) => u.role === "SALES" && u.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  // Kelompokkan invoice yang bisa ditagih per sales
  const rows = useMemo(() => {
    return salesUsers
      .map((su) => {
        const invs = invoices.filter(
          (i) =>
            i.sales_id === su.id &&
            (i.invoice_status === "CONFIRMED" || i.invoice_status === "DELIVERED")
        );
        const total = invs.reduce((a, i) => a + i.total, 0);
        const paid = invs.reduce((a, i) => {
          const p = payments.filter((p) => p.invoice_id === i.id).reduce((x, pp) => x + (pp.amount || 0), 0);
          return a + p;
        }, 0);
        const outstanding = Math.max(0, total - paid);
        const sess = sessions.filter((s) => s.sales_id === su.id).sort((a, b) => b.start_date.localeCompare(a.start_date));
        const sessCodes = sess.slice(0, 2).map((s) => s.session_code).join(", ");
        return {
          sales_id: su.id,
          name: su.name,
          invoices: invs.length,
          total,
          paid,
          outstanding,
          session_code: sessCodes || "â€”",
          session_id: sess[0]?.id ?? "",
          deliverable: outstanding > 0,
        };
      })
      .filter((r) => r.deliverable && r.invoices > 0);
  }, [salesUsers, invoices, payments, sessions]);

  const selected = rows.filter((r) => checked[r.sales_id]);
  const selectedTotal = selected.reduce((a, r) => a + r.outstanding, 0);

  const toggle = (id: string, v: boolean) => setChecked((c) => ({ ...c, [id]: v }));

  const sendToSuperAdmin = () => {
    if (selected.length === 0) return;
    const now = new Date().toISOString();
    setDB((db) => {
      const newSessions = selected.map((r) => ({
        id: `bs${Date.now()}-${r.sales_id}`,
        session_id: r.session_id,
        session_code: r.session_code,
        sales_name: r.name,
        total_invoices: r.invoices,
        total_amount: r.total,
        paid_amount: r.paid,
        outstanding: r.outstanding,
        status: "PENDING" as const,
        created_at: now,
      }));
      return { ...db, billing_sessions: [...db.billing_sessions, ...newSessions] };
    });
    addAudit({
      user_name: user?.name ?? "Finance",
      user_role: user?.role ?? "FINANCE",
      action: "SUBMIT",
      module: "BILLING_SESSION",
      record_id: selected.map((r) => r.name).join(", "),
      old_value: "",
      new_value: "PENDING",
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: "Sesi Tagihan Dikirim",
      message: `${selected.length} sesi (${selected.map((r) => r.name).join(", ")}) dikirim ke Super Admin.`,
      type: "SUCCESS",
    });
    setChecked({});
    setSendConfirm(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sesi Tagihan"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "Sesi Tagihan" }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Sales Siap Tagih" value={String(rows.length)} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Total Outstanding" value={formatCurrency(rows.reduce((a, r) => a + r.outstanding, 0))} icon={<Wallet className="w-4 h-4" />} />
        <StatCard title="Sesi Terpilih" value={String(selected.length)} icon={<FileText className="w-4 h-4" />} accent={selected.length > 0} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-border flex items-center justify-between">
          <div>
            <p className="section-title">Daftar Sesi Tagihan per Sales</p>
            <p className="text-xs text-brand-gray-light mt-0.5">Centang lalu kirim ke Super Admin untuk persetujuan.</p>
          </div>
          {selected.length > 0 && (
            <Button icon={<Send className="w-4 h-4" />} onClick={() => setSendConfirm(true)}>
              Kirim ke Super Admin
            </Button>
          )}
        </div>

        <div className="divide-y divide-brand-gray-border">
          <div className="px-4 py-2.5 flex items-center gap-3 text-[11px] font-bold uppercase text-brand-gray-mid bg-brand-bg">
            <span className="w-5" />
            <span className="flex-1">Sales</span>
            <span className="w-16 text-right">Invoice</span>
            <span className="w-28 text-right">Total</span>
            <span className="w-28 text-right">Outstanding</span>
          </div>
          {rows.map((r) => (
            <label key={r.sales_id} className="px-4 py-3 flex items-center gap-3 hover:bg-brand-bg transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={!!checked[r.sales_id]}
                onChange={(e) => toggle(r.sales_id, e.target.checked)}
                className="w-4 h-4 accent-brand-yellow"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-black">{r.name}</p>
                <p className="text-[10px] text-brand-gray-light">{r.invoices} invoice Â· {r.session_code || "Belum ada sesi"}</p>
              </div>
              <span className="w-16 text-right text-xs font-semibold text-brand-gray-mid">{r.invoices}</span>
              <span className="w-28 text-right text-xs font-bold text-brand-black">{formatCurrency(r.total)}</span>
              <span className="w-28 text-right text-xs font-bold text-red-500">{formatCurrency(r.outstanding)}</span>
            </label>
          ))}
          {rows.length === 0 && (
            <p className="p-8 text-sm text-brand-gray-light text-center">
              Tidak ada invoice outstanding untuk ditagih saat ini.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={sendConfirm}
        onClose={() => setSendConfirm(false)}
        title="Kirim ke Super Admin"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendConfirm(false)}>Batal</Button>
            <Button onClick={sendToSuperAdmin} icon={<Send className="w-4 h-4" />}>Ya, Kirim</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p>Kirim <strong>{selected.length} sesi tagihan</strong> ke Super Admin untuk disetujui?</p>
          <div className="bg-brand-bg rounded-xl p-3 text-xs space-y-1">
            {selected.map((r) => (
              <div key={r.sales_id} className="flex justify-between">
                <span>{r.name}</span>
                <span className="font-semibold">{formatCurrency(r.outstanding)}</span>
              </div>
            ))}
            <div className="border-t border-brand-gray-border pt-1 flex justify-between font-bold text-brand-black">
              <span>Total Outstanding</span>
              <span>{formatCurrency(selectedTotal)}</span>
            </div>
          </div>
          <p className="text-[10px] text-brand-gray-light">
            Setelah Super Admin menyetujui, komisi sesi akan dihitung otomatis.
          </p>
        </div>
      </Modal>
    </div>
  );
}
