"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table } from "@/components/ui/Table";
import { PurchaseStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { CheckCircle, XCircle } from "lucide-react";

export default function PurchaseApprovalsPage() {
  const { purchases, products, setDB, addAudit, notify, recalcInventory } = useData();
  const { user } = useAuth();
  const [confirm, setConfirm] = useState<{ id: string; approve: boolean } | null>(null);

  const pending = purchases.filter((p) => p.status === "SUBMITTED");

  const run = () => {
    if (!confirm) return;
    const pr = purchases.find((p) => p.id === confirm.id);
    if (!pr) return;
    setDB((db) => ({
      ...db,
      purchases: db.purchases.map((p) =>
        p.id === confirm.id
          ? { ...p, status: confirm.approve ? "APPROVED" : "REJECTED", approved_by: user?.id ?? "u1", approved_by_name: user?.name, approved_at: new Date().toISOString() }
          : p
      ),
    }));
    if (confirm.approve) {
      // Increase physical stock for each item, add stock movement, add to incoming
      const now = new Date().toISOString();
      pr.items.forEach((item) => {
        setDB((db) => ({
          ...db,
          inventory: db.inventory.map((inv) =>
            inv.product_id === item.product_id
              ? { ...inv, physical_stock: inv.physical_stock + item.quantity, incoming_stock: Math.max(0, inv.incoming_stock - item.quantity) }
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
              created_by: user?.name ?? "System",
              created_at: now,
            },
          ],
        }));
        recalcInventory(item.product_id);
      });
      notify({ title: "Purchase Disetujui", message: `${pr.purchase_code} disetujui, stok bertambah.`, type: "SUCCESS" });
    } else {
      notify({ title: "Purchase Ditolak", message: `${pr.purchase_code} ditolak.`, type: "ERROR" });
    }
    addAudit({ user_name: user?.name ?? "System", user_role: user?.role ?? "SUPER_ADMIN", action: confirm.approve ? "APPROVE" : "REJECT", module: "PURCHASE", record_id: pr.purchase_code, old_value: "SUBMITTED", new_value: confirm.approve ? "APPROVED" : "REJECTED", ip_address: "local", device: "Web" });
    setConfirm(null);
  };

  const columns = [
    {
      key: "purchase_code",
      label: "Purchase",
      render: (_: unknown, row: (typeof pending)[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.purchase_code}</p>
          <p className="text-[10px] text-brand-gray-light">{formatDate(row.created_at)}</p>
        </div>
      ),
    },
    {
      key: "requested_by_name",
      label: "Diajukan Oleh",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "items",
      label: "Item",
      render: (_: unknown, row: (typeof pending)[0]) => (
        <div className="flex flex-col gap-0.5">
          {row.items.length === 0 ? (
            <span className="text-xs text-brand-gray-light">â€”</span>
          ) : (
            row.items.map((it, i) => (
              <span key={i} className="text-xs text-brand-gray-dark">{it.product_name} Ã— {it.quantity} @ {formatCurrency(it.cost_price)}</span>
            ))
          )}
        </div>
      ),
    },
    {
      key: "total_amount",
      label: "Total",
      render: (v: unknown) => <span className="text-xs font-bold text-brand-black">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <PurchaseStatusBadge status={String(v)} />,
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: (typeof pending)[0]) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => setConfirm({ id: row.id, approve: false })}>Tolak</Button>
          <Button size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />} onClick={() => setConfirm({ id: row.id, approve: true })}>Approve</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Approvals"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Purchasing" }, { label: "Approvals" }]}
      />

      <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
        <p className="text-xs text-brand-gray-dark">
          <strong>Setelah approve</strong>, physical stock bertambah dan stock movement otomatis dibuat.
          Purchase yang ditolak tidak mengubah stok.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-brand-gray-border">
          <span className="text-xs text-brand-gray-light">{pending.length} purchase menunggu approval</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={pending as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        title={confirm?.approve ? "Approve Purchase" : "Reject Purchase"}
        message={
          confirm?.approve
            ? "Stok akan bertambah sesuai qty yang diajukan dan stock movement akan dibuat. Lanjutkan?"
            : "Stok tidak akan berubah. Lanjutkan menolak?"
        }
        confirmLabel={confirm?.approve ? "Ya, Approve" : "Ya, Tolak"}
        variant={confirm?.approve ? "primary" : "danger"}
      />
    </div>
  );
}
