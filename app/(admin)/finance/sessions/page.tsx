"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge, SessionStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Eye, ClipboardCheck } from "lucide-react";

type BillingStatus = "REVIEWED" | "APPROVED";

export default function BillingSessionsPage() {
  const { sessions, invoices, payments, commissions, setDB, addAudit, notify, recalcSessionTotals } = useData();
  const { user, hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [reviewed, setReviewed] = useState<Record<string, BillingStatus>>({});
  const [detail, setDetail] = useState<string | null>(null);
  const [approveFor, setApproveFor] = useState<string | null>(null);

  const filtered = sessions.filter(
    (s) => !search || s.session_code.toLowerCase().includes(search.toLowerCase()) || s.sales_name.toLowerCase().includes(search.toLowerCase())
  );

  // totals per session
  const sessionDetail = (sessionId: string) => {
    const invs = invoices.filter((i) => i.session_id === sessionId && i.invoice_status !== "CANCELLED");
    const total = invs.reduce((a, i) => a + i.total, 0);
    let paid = 0;
    invs.forEach((inv) => {
      paid += payments.filter((p) => p.invoice_id === inv.id).reduce((a, p) => a + p.amount, 0);
    });
    const commission = commissions.filter((c) => c.session_id === sessionId).reduce((a, c) => a + c.total_commission, 0);
    return { invoices: invs, total, paid, outstanding: Math.max(0, total - paid), commission };
  };

  const columns = [
    {
      key: "session_code",
      label: "Session",
      render: (_: unknown, row: (typeof filtered)[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.session_code}</p>
          <p className="text-[10px] text-brand-gray-light">{row.sales_name}</p>
        </div>
      ),
    },
    {
      key: "total_invoices",
      label: "Invoice",
      render: (v: unknown) => <span className="text-sm font-bold text-brand-black">{String(v)}</span>,
    },
    {
      key: "total_revenue",
      label: "Total",
      render: (v: unknown) => <span className="text-xs font-bold text-brand-black">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "total_commission",
      label: "Komisi",
      render: (v: unknown) => <span className="text-xs font-semibold text-green-600">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (_: unknown, row: (typeof filtered)[0]) =>
        reviewed[row.id] ? (
          <Badge variant={reviewed[row.id] === "APPROVED" ? "success" : "warning"}>
            {reviewed[row.id]}
          </Badge>
        ) : (
          <SessionStatusBadge status={row.status} />
        ),
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: (typeof filtered)[0]) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setDetail(row.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-brand-gray-mid hover:text-blue-600 transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {hasRole("FINANCE") && !reviewed[row.id] && (
            <Button size="sm" onClick={() => {
              setReviewed((r) => ({ ...r, [row.id]: "REVIEWED" }));
              addAudit({ user_name: user?.name ?? "System", user_role: user?.role ?? "SUPER_ADMIN", action: "APPROVE", module: "BILLING", record_id: row.session_code, old_value: "PENDING", new_value: "REVIEWED", ip_address: "local", device: "Web" });
            }}>Review</Button>
          )}
          {hasRole("SUPER_ADMIN") && reviewed[row.id] === "REVIEWED" && (
            <Button size="sm" onClick={() => setApproveFor(row.id)} icon={<ClipboardCheck className="w-3.5 h-3.5" />}>Approve</Button>
          )}
        </div>
      ),
    },
  ];

  const detailSession = detail ? sessions.find((s) => s.id === detail) : null;
  const detailData = detail ? sessionDetail(detail) : null;

  const confirmApprove = () => {
    const s = sessions.find((x) => x.id === approveFor);
    if (!s) return;
    setReviewed((r) => ({ ...r, [s.id]: "APPROVED" }));
    setDB((db) => ({
      ...db,
      sessions: db.sessions.map((x) => (x.id === s.id ? { ...x, status: "DONE" } : x)),
    }));
    addAudit({ user_name: user?.name ?? "System", user_role: user?.role ?? "SUPER_ADMIN", action: "APPROVE", module: "SESSION", record_id: s.session_code, old_value: "REVIEWED", new_value: "DONE", ip_address: "local", device: "Web" });
    notify({ title: "Session Disetujui", message: `${s.session_code} selesai, komisi final.`, type: "SUCCESS" });
    setApproveFor(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing Sessions"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "Sessions" }]}
      />
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari session / sales..." className="w-64" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} session</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Detail ${detailSession?.session_code ?? ""}`}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button>}
      >
        {detailSession && detailData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-xs text-brand-gray-mid">Total</p>
                <p className="text-lg font-bold text-brand-black">{formatCurrency(detailData.total)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <p className="text-xs text-green-700">Terbayar</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(detailData.paid)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-red-600">Outstanding</p>
                <p className="text-lg font-bold text-red-500">{formatCurrency(detailData.outstanding)}</p>
              </div>
              <div className="p-3 bg-brand-yellow/20 rounded-xl">
                <p className="text-xs text-brand-black">Komisi</p>
                <p className="text-lg font-bold text-brand-black">{formatCurrency(detailData.commission)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-brand-gray-border">
                    <th className="table-head text-left py-2 px-3">Invoice</th>
                    <th className="table-head text-left py-2 px-3">Customer</th>
                    <th className="table-head text-left py-2 px-3">Total</th>
                    <th className="table-head text-left py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.invoices.map((inv) => {
                    const ipaid = payments.filter((p) => p.invoice_id === inv.id).reduce((a, p) => a + p.amount, 0);
                    return (
                      <tr key={inv.id} className="border-b border-brand-gray-border last:border-0">
                        <td className="py-2 px-3 text-xs font-semibold text-brand-black">{inv.invoice_number}</td>
                        <td className="py-2 px-3 text-xs text-brand-gray-dark">{inv.store_name}</td>
                        <td className="py-2 px-3 text-xs font-bold">{formatCurrency(inv.total)}</td>
                        <td className="py-2 px-3">
                          <Badge variant={ipaid >= inv.total ? "success" : ipaid > 0 ? "warning" : "danger"}>
                            {ipaid >= inv.total ? "LUNAS" : ipaid > 0 ? "PARTIAL" : "BELUM"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!approveFor}
        onClose={() => setApproveFor(null)}
        onConfirm={confirmApprove}
        title="Approve Settlement"
        message="Session ditandai DONE dan komisi menjadi FINALIZED. Lanjutkan?"
        confirmLabel="Ya, Approve"
        variant="primary"
      />
    </div>
  );
}
