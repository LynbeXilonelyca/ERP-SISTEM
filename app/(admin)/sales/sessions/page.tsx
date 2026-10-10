"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { SessionStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { Plus, Send, Eye } from "lucide-react";
import type { SalesSession } from "@/types";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUBMITTED", label: "Menunggu Finance" },
  { value: "REVIEWED", label: "Review Finance" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

export default function SalesSessionsPage() {
  const { sessions, users, employees, shipping_routes, setDB, addAudit, notify } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    sales_id: "",
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    start_day: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    route_id: "",
    supir_id: "",
    kenek_id: "",
  });
  const [detailId, setDetailId] = useState<string | null>(null);

  const salesUsers = useMemo(
    () => users.filter((u) => u.role === "SALES" && u.status === "ACTIVE"),
    [users]
  );
  const supirList = useMemo(
    () => employees.filter((e) => e.employee_type === "SUPER" && e.status === "ACTIVE"),
    [employees]
  );
  const kenekList = useMemo(
    () => employees.filter((e) => e.employee_type === "KENEK" && e.status === "ACTIVE"),
    [employees]
  );

  const createSession = () => {
    const sales = salesUsers.find((u) => u.id === form.sales_id);
    if (!sales) return;
    const now = new Date().toISOString();
    const year = form.period.slice(0, 4);
    const seq = sessions
      .map((s) => {
        const m = s.session_code.match(/SLS-\d{4}-(\d+)/);
        return m ? Number(m[1]) : 0;
      })
      .reduce((a, b) => Math.max(a, b), 0) + 1;
    const route = shipping_routes.find((r) => r.id === form.route_id);
    const supir = supirList.find((e) => e.id === form.supir_id);
    const kenek = kenekList.find((e) => e.id === form.kenek_id);
    const session: SalesSession = {
      id: `s${Date.now()}`,
      session_code: `SLS-${year}-${String(seq).padStart(3, "0")}`,
      sales_id: sales.id,
      sales_name: sales.name,
      period: form.period,
      start_date: form.start_day,
      start_day: form.start_day,
      status: "ACTIVE",
      route_id: route?.id,
      route_name: route?.name,
      supir_id: supir?.id,
      supir_name: supir?.name,
      kenek_id: kenek?.id,
      kenek_name: kenek?.name,
      total_invoices: 0,
      total_revenue: 0,
      total_collected: 0,
      total_commission: 0,
      bonus_amount: 0,
      created_at: now,
    };
    // 1 session per sales-bulan: session lama yang belum final dibatalkan
    setDB((db) => ({
      ...db,
      sessions: [
        ...db.sessions
          .filter((s) => !(s.sales_id === sales.id && s.period === form.period && s.status !== "APPROVED" && s.status !== "CANCELLED"))
          .map((s) =>
            s.sales_id === sales.id && s.period === form.period
              ? { ...s, status: "CANCELLED" as const }
              : s
          ),
        session,
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
      message: `Sesi ${session.session_code} untuk ${sales.name} (${form.period}).`,
      type: "SUCCESS",
    });
    setShowCreate(false);
    setForm({ sales_id: "", period: form.period, start_day: form.start_day, route_id: "", supir_id: "", kenek_id: "" });
  };

  const submitSession = (s: SalesSession) => {
    setDB((db) => ({
      ...db,
      sessions: db.sessions.map((x) =>
        x.id === s.id ? { ...x, status: "SUBMITTED" as const, submitted_at: new Date().toISOString() } : x
      ),
    }));
    addAudit({ user_name: "Super Admin", user_role: "SUPER_ADMIN", action: "SUBMIT", module: "SESSION", record_id: s.session_code, old_value: "ACTIVE", new_value: "SUBMITTED", ip_address: "local", device: "Web" });
    notify({ title: "Sesi Dikirim", message: `${s.session_code} menunggu review Finance.`, type: "SUCCESS", target_role: "FINANCE" });
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
          <p className="text-[10px] text-brand-gray-light">Periode {row.period}</p>
        </div>
      ),
    },
    {
      key: "sales_name",
      label: "Sales",
      render: (_: unknown, row: SalesSession) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.sales_name}</p>
          <p className="text-[10px] text-brand-gray-light">
            {row.supir_name ? `Supir: ${row.supir_name} · Kenek: ${row.kenek_name ?? "-"}` : "Belum ada kru"}
          </p>
        </div>
      ),
    },
    {
      key: "route_name",
      label: "Jalur",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v || "—")}</span>,
    },
    {
      key: "start_day",
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
      label: "Invoice",
      render: (v: unknown) => <span className="text-sm font-bold text-brand-black">{String(v)}</span>,
    },
    {
      key: "total_revenue",
      label: "Pendapatan",
      render: (v: unknown) => <span className="text-xs font-semibold text-brand-black">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "total_collected",
      label: "Ditagih",
      render: (_: unknown, row: SalesSession) => (
        <div>
          <p className="text-xs font-semibold text-green-600">{formatCurrency(row.total_collected)}</p>
          {row.total_revenue > 0 && (
            <p className="text-[10px] text-brand-gray-light">{Math.round((row.total_collected / row.total_revenue) * 100)}%</p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: SalesSession) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => setDetailId(row.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-brand-gray-mid hover:text-blue-600 transition-colors">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {row.status === "ACTIVE" && (
            <Button size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => submitSession(row)}>
              Kirim
            </Button>
          )}
        </div>
      ),
    },
  ];

  const detail = detailId ? sessions.find((s) => s.id === detailId) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="History Sesi Penjualan"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Sales" }, { label: "History" }]}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            Buat Sesi
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Session", value: sessions.length },
          { label: "Aktif", value: sessions.filter((s) => s.status === "ACTIVE").length },
          { label: "Menunggu Finance", value: sessions.filter((s) => s.status === "SUBMITTED").length },
          { label: "Review Finance", value: sessions.filter((s) => s.status === "REVIEWED").length },
          { label: "Disetujui", value: sessions.filter((s) => s.status === "APPROVED").length },
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
            className="w-48"
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
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Batal
            </Button>
            <Button onClick={createSession} disabled={!form.sales_id || !form.period}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Sales"
            value={form.sales_id}
            onChange={(e) => setForm({ ...form, sales_id: e.target.value })}
            options={salesUsers.map((u) => ({ value: u.id, label: u.name }))}
            placeholder={salesUsers.length === 0 ? "Tidak ada sales aktif" : "Pilih sales"}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Periode (Bulan)" type="month" value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            />
            <Input
              label="Tanggal Mulai" type="date" value={form.start_day}
              onChange={(e) => setForm({ ...form, start_day: e.target.value })}
            />
          </div>
          <Select
            label="Jalur"
            value={form.route_id}
            onChange={(e) => setForm({ ...form, route_id: e.target.value })}
            options={shipping_routes.map((r) => ({ value: r.id, label: r.name }))}
            placeholder="Pilih jalur pengiriman"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Supir"
              value={form.supir_id}
              onChange={(e) => setForm({ ...form, supir_id: e.target.value })}
              options={supirList.map((e) => ({ value: e.id, label: e.name }))}
              placeholder={supirList.length === 0 ? "Belum ada supir" : "Pilih supir"}
            />
            <Select
              label="Kenek"
              value={form.kenek_id}
              onChange={(e) => setForm({ ...form, kenek_id: e.target.value })}
              options={kenekList.map((e) => ({ value: e.id, label: e.name }))}
              placeholder={kenekList.length === 0 ? "Belum ada kenek" : "Pilih kenek"}
            />
          </div>
          <p className="text-[10px] text-brand-gray-light">
            Satu session per sales-bulan. Membuat session baru akan membatalkan session lama yang belum final.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail?.session_code ?? "Detail Session"}
        size="md"
        footer={<Button variant="secondary" onClick={() => setDetailId(null)}>Tutup</Button>}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-[10px] text-brand-gray-light uppercase">Sales</p>
                <p className="text-xs font-bold text-brand-black">{detail.sales_name}</p>
              </div>
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-[10px] text-brand-gray-light uppercase">Jalur</p>
                <p className="text-xs font-bold text-brand-black">{detail.route_name ?? "—"}</p>
              </div>
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-[10px] text-brand-gray-light uppercase">Supir</p>
                <p className="text-xs font-bold text-brand-black">{detail.supir_name ?? "—"}</p>
              </div>
              <div className="p-3 bg-brand-bg rounded-xl">
                <p className="text-[10px] text-brand-gray-light uppercase">Kenek</p>
                <p className="text-xs font-bold text-brand-black">{detail.kenek_name ?? "—"}</p>
              </div>
            </div>
            <DetailRow label="Status" value={<SessionStatusBadge status={detail.status} />} />
            <DetailRow label="Pendapatan" value={formatCurrency(detail.total_revenue)} />
            <DetailRow label="Ditagih" value={formatCurrency(detail.total_collected)} />
            <DetailRow label="Komisi" value={formatCurrency(detail.total_commission)} />
            {detail.bonus_amount > 0 && <DetailRow label="Bonus" value={formatCurrency(detail.bonus_amount)} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-brand-gray-mid">{label}</span>
      <span className="font-bold text-brand-black">{value}</span>
    </div>
  );
}