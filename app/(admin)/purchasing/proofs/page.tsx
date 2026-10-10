"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { DeliveryProofBadge, InvoiceStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Camera, CheckCircle2, Eye, Inbox, XCircle } from "lucide-react";

type Filter = "PENDING" | "VERIFIED" | "REJECTED" | "ALL";

const safeDate = (d?: string) => (d ? formatDate(d) : "-");

export default function DeliveryProofsPage() {
  const { invoices, setDB, addAudit, notify } = useData();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [viewId, setViewId] = useState("");
  const [rejectId, setRejectId] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const withProof = useMemo(
    () =>
      invoices
        .filter((i) => !!i.delivery_proof_url)
        .sort((a, b) => (b.delivery_proof_at ?? "").localeCompare(a.delivery_proof_at ?? "")),
    [invoices]
  );

  const rows = useMemo(
    () => (filter === "ALL" ? withProof : withProof.filter((i) => i.delivery_proof_status === filter)),
    [withProof, filter]
  );

  const count = (s: Filter) =>
    s === "ALL" ? withProof.length : withProof.filter((i) => i.delivery_proof_status === s).length;

  const detail = invoices.find((i) => i.id === viewId);
  const rejectTarget = invoices.find((i) => i.id === rejectId);

  const verify = (id: string, approve: boolean, note?: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    setDB((db) => ({
      ...db,
      invoices: db.invoices.map((i) =>
        i.id === id
          ? {
              ...i,
              delivery_proof_status: approve ? ("VERIFIED" as const) : ("REJECTED" as const),
              delivery_proof_checked_by: user?.name ?? "Admin Pembelian",
              delivery_proof_checked_at: new Date().toISOString(),
              delivery_proof_note: note || i.delivery_proof_note,
            }
          : i
      ),
    }));
    addAudit({
      user_name: user?.name ?? "Admin Pembelian",
      user_role: user?.role ?? "PURCHASE_ADMIN",
      action: approve ? "VERIFY_PROOF" : "REJECT_PROOF",
      module: "INVOICE",
      record_id: inv.invoice_number,
      old_value: "PENDING",
      new_value: approve ? "VERIFIED" : "REJECTED",
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: approve ? "Bukti Terverifikasi" : "Bukti Ditolak",
      message: approve
        ? `Bukti ${inv.invoice_number} valid. Invoice bisa diselesaikan Finance.`
        : `Bukti ${inv.invoice_number} ditolak — ${inv.delivery_proof_by} diminta upload ulang.`,
      type: approve ? "SUCCESS" : "ERROR",
      target_role: approve ? "FINANCE" : "SHIPPING_ADMIN",
    });
    setViewId("");
    setRejectId("");
    setRejectNote("");
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "PENDING", label: "Menunggu Cek" },
    { key: "VERIFIED", label: "Terverifikasi" },
    { key: "REJECTED", label: "Ditolak" },
    { key: "ALL", label: "Semua" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cek Bukti Pengiriman"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Purchasing" }, { label: "Cek Bukti" }]}
      />

      <p className="text-xs text-brand-gray-mid">
        Foto bukti dikirim oleh Kepala Gudang / Admin Pengiriman saat pengiriman. Verifikasi di sini sebelum invoice
        diselesaikan oleh Finance.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Bukti" value={String(withProof.length)} icon={<Camera className="w-4 h-4" />} />
        <StatCard title="Menunggu Cek" value={String(count("PENDING"))} icon={<Inbox className="w-4 h-4" />} />
        <StatCard title="Terverifikasi" value={String(count("VERIFIED"))} icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard title="Ditolak" value={String(count("REJECTED"))} icon={<XCircle className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-brand-gray-border pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors",
              filter === t.key
                ? "border-brand-yellow text-brand-black bg-brand-yellow/10"
                : "border-transparent text-brand-gray-mid hover:text-brand-black hover:bg-brand-bg"
            )}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] text-brand-gray-light">{count(t.key)}</span>
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-brand-gray-border">
          {rows.map((inv) => (
            <div key={inv.id} className="p-4 flex flex-col lg:flex-row gap-4">
              <img
                src={inv.delivery_proof_url}
                alt={`Bukti ${inv.invoice_number}`}
                className="w-full lg:w-32 h-24 object-cover rounded-lg bg-brand-bg border border-brand-gray-border flex-shrink-0 cursor-pointer"
                onClick={() => setViewId(inv.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-brand-black">{inv.invoice_number}</p>
                  <InvoiceStatusBadge status={inv.invoice_status} />
                  <DeliveryProofBadge status={inv.delivery_proof_status} />
                </div>
                <p className="text-xs text-brand-gray-mid mt-0.5">
                  {inv.store_name} · {inv.sales_name} · {formatCurrency(inv.total)}
                </p>
                <p className="text-[10px] text-brand-gray-light mt-1">
                  Diunggah {inv.delivery_proof_by} · {safeDate(inv.delivery_proof_at)}
                  {inv.shipping_date ? ` · Tanggal kirim ${formatDate(inv.shipping_date)}` : ""}
                </p>
                {inv.delivery_proof_note && (
                  <p className="text-[10px] text-brand-gray-mid italic mt-1">Catatan: {inv.delivery_proof_note}</p>
                )}
                {inv.delivery_proof_status === "REJECTED" && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Ditolak oleh {inv.delivery_proof_checked_by} · {safeDate(inv.delivery_proof_checked_at)}
                  </p>
                )}
                {inv.delivery_proof_status === "VERIFIED" && (
                  <p className="text-[10px] text-green-600 mt-1">
                    Dicek {inv.delivery_proof_checked_by} · {safeDate(inv.delivery_proof_checked_at)}
                  </p>
                )}
              </div>
              <div className="flex items-start gap-2 flex-shrink-0">
                <Button variant="secondary" icon={<Eye className="w-4 h-4" />} onClick={() => setViewId(inv.id)}>
                  Lihat
                </Button>
                {inv.delivery_proof_status === "PENDING" && (
                  <>
                    <Button icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => verify(inv.id, true)}>
                      Verifikasi
                    </Button>
                    <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setRejectId(inv.id)}>
                      Tolak
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="p-8 text-sm text-brand-gray-light text-center">
              Belum ada bukti pengiriman pada filter ini.
            </p>
          )}
        </div>
      </div>

      {/* Preview bukti */}
      <Modal
        open={!!detail}
        onClose={() => setViewId("")}
        title={detail ? `Bukti ${detail.invoice_number}` : ""}
        size="lg"
        footer={
          detail && detail.delivery_proof_status === "PENDING" ? (
            <>
              <Button variant="danger" onClick={() => setRejectId(detail.id)}>Tolak Bukti</Button>
              <Button onClick={() => verify(detail.id, true)}>Verifikasi Bukti</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setViewId("")}>Tutup</Button>
          )
        }
      >
        {detail && (
          <div className="space-y-3">
            <img
              src={detail.delivery_proof_url}
              alt="Bukti pengiriman"
              className="w-full max-h-[60vh] object-contain rounded-xl bg-brand-bg border border-brand-gray-border"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-brand-gray-light">Customer</p>
                <p className="font-semibold text-brand-black">{detail.store_name}</p>
              </div>
              <div>
                <p className="text-brand-gray-light">Sales</p>
                <p className="font-semibold text-brand-black">{detail.sales_name}</p>
              </div>
              <div>
                <p className="text-brand-gray-light">Total</p>
                <p className="font-semibold text-brand-black">{formatCurrency(detail.total)}</p>
              </div>
              <div>
                <p className="text-brand-gray-light">Status Bukti</p>
                <DeliveryProofBadge status={detail.delivery_proof_status} />
              </div>
            </div>
            {detail.items.map((it) => (
              <div key={it.id} className="flex justify-between text-xs border-t border-brand-gray-border pt-1">
                <span className="text-brand-gray-mid">
                  {it.product_name} × {it.quantity}
                </span>
                <span className="font-semibold text-brand-black">{formatCurrency(it.selling_price * it.quantity)}</span>
              </div>
            ))}
            {detail.delivery_proof_note && (
              <p className="text-xs text-brand-gray-mid italic">Catatan: {detail.delivery_proof_note}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Tolak bukti */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectId("")}
        title="Tolak Bukti Pengiriman"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectId("")}>Batal</Button>
            <Button variant="danger" disabled={!rejectNote.trim()} onClick={() => verify(rejectId, false, rejectNote.trim())}>
              Tolak Bukti
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-brand-gray-mid">
            {rejectTarget?.invoice_number} ({rejectTarget?.store_name}) — foto bukti akan ditolak dan
            {rejectTarget?.delivery_proof_by} perlu mengupload ulang.
          </p>
          <Textarea
            label="Alasan Penolakan*"
            placeholder="Contoh: foto tidak jelas, bukti pengiriman tidak terlihat."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </Modal>
    </div>
  );
}
