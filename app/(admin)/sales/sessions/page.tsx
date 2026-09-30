"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SessionStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import type { SalesSession } from "@/types";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "DONE", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

export default function SalesSessionsPage() {
  const { sessions, users, setDB, addAudit, notify } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [salesId, setSalesId] = useState("");

  const salesUsers = useMemo(
    () => users.filter((u) => u.role === "SALES" && u.status === "ACTIVE"),
    [users]
  );

  const createSession = () => {
    const sales = salesUsers.find((u) => u.id === salesId);
    if (!sales) return;
    const now = new Date().toISOString();
    const year = now.slice(0, 4);
    const seq = sessions
      .map((s) => {
        const m = s.session_code.match(/SLS-\d{4}-(\d+)/);
        return m ? Number(m[1]) : 0;
      })
      .reduce((a, b) => Math.max(a, b), 0) + 1;
    setDB((db) => ({
      ...db,
      sessions: [
        ...db.sessions,
        {
          id: `s${Date.now()}`,
          session_code: `SLS-${year}-${String(seq).padStart(3, "0")}`,
          sales_id: sales.id,
          sales_name: sales.name,
          start_date: now.slice(0, 10),
          status: "ACTIVE",
          total_invoices: 0,
          total_revenue: 0,
          total_commission: 0,
          created_at: now,
        },
      ],
    }));
    addAudit({
      user_name: "Super Admin",
      user_role: "SUPER_ADMIN",
      action: "CREATE",
      module: "SESSION",
      record_id: sales.name,
      old_value: "NONE",
      new_value: "ACTIVE",
      ip_address: "local",
      device: "Web",
    });
    notify({
      title: "Sesi Dibuat",
      message: `Sesi penjualan aktif untuk ${sales.name}.`,
      type: "SUCCESS",
    });
    setShowCreate(false);
    setSalesId("");
  };

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        const matchSearch =
          !search ||
          s.session_code.toLowerCase().includes(search.toLowerCase()) ||
          s.sales_name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || s.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [sessions, search, statusFilter]
  );

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    {
      key: "session_code",
      label: "Session",
      render: (_: unknown, row: SalesSession) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.session_code}</p>
          <p className="text-[10px] text-brand-gray-light">{row.sales_name}</p>
        </div>
      ),
    },
    {
      key: "sales_name",
      label: "Sales",
      render: (v: unknown) => <span className="text-xs font-semibold text-brand-black">{String(v)}</span>,
    },
    {
      key: "start_date",
      label: "Mulai",
      render: (v: unknown) => <span className="text-xs text-brand-gray-mid">{formatDate(String(v))}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <SessionStatusBadge status={String(v)} />,
    },
    {
      key: "total_invoices",
      label: "Jumlah Invoice",
      render: (v: unknown) => <span className="text-sm font-bold text-brand-black">{String(v)}</span>,
    },
    {
      key: "total_revenue",
      label: "Pendapatan",
      render: (v: unknown) => <span className="text-xs font-semibold text-brand-black">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "total_commission",
      label: "Komisi",
      render: (v: unknown) => <span className="text-xs font-semibold text-green-600">{formatCurrency(Number(v))}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Sessions"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Sales" }, { label: "Sessions" }]}
        actions={
          <Button icon={<span>+</span>} onClick={() => setShowCreate(true)}>
            Buat Sesi
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Session", value: sessions.length },
          { label: "Aktif", value: sessions.filter((s) => s.status === "ACTIVE").length },
          { label: "Pending Review", value: sessions.filter((s) => s.status === "PENDING_REVIEW").length },
          { label: "Selesai", value: sessions.filter((s) => s.status === "DONE").length },
        ].map((s) => (
          <div key={s.label} className="card py-3">
            <p className="text-2xl font-bold text-brand-black">{s.value}</p>
            <p className="text-xs text-brand-gray-mid mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari session / sales..." className="w-64" />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS}
            placeholder="Semua Status"
            className="w-40"
          />
          {(search || statusFilter) && (
            <button className="text-xs text-brand-gray-mid hover:text-brand-black" onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}>
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} session</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={paginated as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
        {filtered.length > perPage && (
          <div className="p-4 border-t border-brand-gray-border">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filtered.length / perPage)}
              total={filtered.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Buat Sesi Penjualan"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Batal
            </Button>
            <Button onClick={createSession} disabled={!salesId}>
              Simpan
            </Button>
          </>
        }
      >
        <Select
          label="Sales"
          value={salesId}
          onChange={(e) => setSalesId(e.target.value)}
          options={salesUsers.map((u) => ({ value: u.id, label: u.name }))}
          placeholder={salesUsers.length === 0 ? "Tidak ada sales aktif" : "Pilih sales"}
        />
      </Modal>
    </div>
  );
}
