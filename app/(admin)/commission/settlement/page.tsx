"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import type { CommissionStatus } from "@/types";

type Adj = {
  id: string;
  sales_name: string;
  invoice_number: string;
  amount: number;
  reason: string;
  created_at: string;
};

let adjSeq = 0;

export default function CommissionSettlementPage() {
  const { commissions, sessions } = useData();
  const { user, hasRole } = useAuth();
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustments, setAdjustments] = useState<Adj[]>([]);
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Record<string, CommissionStatus>>({});
  const [approveAll, setApproveAll] = useState(false);

  const calcCommission = (c: (typeof commissions)[0]) =>
    c.main_commission + c.own_brand_commission + c.sub_commission;

  const totalPending = commissions.reduce((a, c) => a + calcCommission(c), 0);

  const addAdjustment = () => {
    const c = commissions.find((x) => x.id === selected);
    const amt = Number(amount);
    if (!c || !amt) return;
    adjSeq += 1;
    setAdjustments((prev) => [
      {
        id: `adj${adjSeq}`,
        sales_name: c.sales_name,
        invoice_number: c.invoice_number,
        amount: amt,
        reason,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setShowAdjust(false);
    setAmount("");
    setReason("");
  };

  const markPaid = (id: string) => setStatus((s) => ({ ...s, [id]: "PAID" }));

  const approveAllFn = () => {
    const ids = commissions.map((c) => c.id);
    setStatus((s) => {
      const next = { ...s };
      ids.forEach((id) => (next[id] = "APPROVED"));
      return next;
    });
    setApproveAll(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commission Settlement"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Commission" }, { label: "Settlement" }]}
        actions={
          hasRole("FINANCE") || hasRole("SUPER_ADMIN") ? (
            <>
              <Button variant="secondary" onClick={() => setShowAdjust(true)}>Tambah Adjustment</Button>
              <Button onClick={() => setApproveAll(true)}>Approve Semua</Button>
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Komisi Belum Final</p>
        </div>
        <div className="card py-3 bg-brand-yellow/10">
          <p className="text-2xl font-bold text-brand-black">{adjustments.reduce((a, x) => a + x.amount, 0) > 0 ? `Rp ${(adjustments.reduce((a, x) => a + x.amount, 0)).toLocaleString("id-ID")}` : "Rp 0"}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Adjustment</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-border">
          <p className="text-xs font-bold text-brand-black mb-1">Daftar Komisi</p>
          <p className="text-[10px] text-brand-gray-light">Klik Approve untuk mengesahkan, Pay untuk menandai dibayar.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-brand-gray-border">
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Sales</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Invoice</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Komisi</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Status</th>
                <th className="table-head text-left py-3 px-4 bg-brand-bg">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => {
                const st = status[c.id] ?? c.status;
                const total = calcCommission(c);
                return (
                  <tr key={c.id} className="border-b border-brand-gray-border last:border-0">
                    <td className="py-3 px-4 text-xs font-semibold text-brand-black">{c.sales_name}</td>
                    <td className="py-3 px-4 text-xs text-brand-gray-dark">{c.invoice_number}</td>
                    <td className="py-3 px-4 text-xs font-bold text-green-600">{formatCurrency(total)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${st === "PAID" ? "bg-green-100 text-green-700" : st === "APPROVED" ? "bg-brand-yellow text-brand-black" : "bg-orange-100 text-orange-700"}`}>{st}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {st !== "APPROVED" && st !== "PAID" && (
                          <Button size="sm" variant="secondary" onClick={() => setStatus((s) => ({ ...s, [c.id]: "APPROVED" }))}>Approve</Button>
                        )}
                        {st === "APPROVED" && (
                          <Button size="sm" onClick={() => markPaid(c.id)}>Pay</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {commissions.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-brand-gray-light text-sm">Belum ada komisi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustments */}
      {adjustments.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-brand-gray-border">
            <p className="text-xs font-bold text-brand-black">Commission Adjustments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-brand-gray-border">
                  <th className="table-head text-left py-3 px-4 bg-brand-bg">Invoice</th>
                  <th className="table-head text-left py-3 px-4 bg-brand-bg">Sales</th>
                  <th className="table-head text-left py-3 px-4 bg-brand-bg">Jumlah</th>
                  <th className="table-head text-left py-3 px-4 bg-brand-bg">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id} className="border-b border-brand-gray-border last:border-0">
                    <td className="py-3 px-4 text-xs font-semibold text-brand-black">{a.invoice_number}</td>
                    <td className="py-3 px-4 text-xs text-brand-gray-dark">{a.sales_name}</td>
                    <td className="py-3 px-4 text-xs font-bold text-red-500">- {formatCurrency(a.amount)}</td>
                    <td className="py-3 px-4 text-xs text-brand-gray-mid">{a.reason || "â€”"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Adjustment Modal */}
      <Modal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        title="Tambah Commission Adjustment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdjust(false)}>Batal</Button>
            <Button onClick={addAdjustment}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-bg rounded-xl text-xs text-brand-gray-dark">
            Adjustment mengurangi komisi (mis. karena retur). Komisi lama tetap tercatat, tidak dihapus.
          </div>
          <Select
            label="Invoice / Komisi"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            options={commissions.map((c) => ({ value: c.id, label: `${c.invoice_number} â€” ${c.sales_name}` }))}
            placeholder="Pilih komisi"
          />
          <Select
            label="Jenis Adjustment"
            options={[
              { value: "return", label: "Retur" },
              { value: "other", label: "Lainnya" },
            ]}
          />
          <div>
            <label className="form-label">Jumlah (Rp)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input" placeholder="0" />
          </div>
          <Textarea label="Alasan" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan adjustment" />
        </div>
      </Modal>

      <ConfirmDialog
        open={approveAll}
        onClose={() => setApproveAll(false)}
        onConfirm={approveAllFn}
        title="Approve Semua Komisi"
        message="Semua komisi akan ditandai APPROVED. Lanjutkan?"
        confirmLabel="Ya, Approve"
        variant="primary"
      />
    </div>
  );
}
