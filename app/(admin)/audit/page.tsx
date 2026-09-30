"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { RoleBadge } from "@/components/ui/Badge";
import { formatDateTime, truncate } from "@/lib/utils";
import { useData } from "@/lib/store";
import { ScrollText } from "lucide-react";

const actionColors: Record<string, string> = {
  CREATE: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
  APPROVE: "bg-purple-50 text-purple-700",
  REJECT: "bg-orange-50 text-orange-700",
  SUBMIT: "bg-yellow-50 text-yellow-700",
  RESET: "bg-red-50 text-red-700",
  PRINT: "bg-yellow-50 text-yellow-700",
  PAYMENT: "bg-teal-50 text-teal-700",
  SHIP: "bg-indigo-50 text-indigo-700",
  LOGIN: "bg-gray-100 text-gray-700",
};

export default function AuditLogPage() {
  const { auditLogs } = useData();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const moduleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    auditLogs.forEach((l) => counts.set(l.module, (counts.get(l.module) ?? 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => ({ value, label: value }));
  }, [auditLogs]);

  const actionOptions = useMemo(() => {
    const set = new Set(auditLogs.map((l) => l.action));
    return Array.from(set).map((value) => ({ value, label: value }));
  }, [auditLogs]);

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        !search ||
        log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.record_id?.toLowerCase().includes(search.toLowerCase()) ||
        log.module?.toLowerCase().includes(search.toLowerCase());
      const matchModule = !moduleFilter || log.module === moduleFilter;
      const matchAction = !actionFilter || log.action === actionFilter;
      return matchSearch && matchModule && matchAction;
    });
  }, [auditLogs, search, moduleFilter, actionFilter]);

  const perPage = 15;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const topModules = useMemo(() => {
    const counts = new Map<string, number>();
    auditLogs.forEach((l) => counts.set(l.module, (counts.get(l.module) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [auditLogs]);

  const columns = [
    {
      key: "created_at",
      label: "Waktu",
      render: (v: unknown) => (
        <span className="text-xs text-brand-gray-mid whitespace-nowrap">{formatDateTime(String(v))}</span>
      ),
    },
    {
      key: "user_name",
      label: "User",
      render: (_: unknown, row: typeof paginated[0]) => (
        <div>
          <p className="text-xs font-semibold text-brand-black">{row.user_name}</p>
          <RoleBadge role={row.user_role} />
        </div>
      ),
    },
    {
      key: "action",
      label: "Aksi",
      render: (v: unknown) => (
        <span className={`badge ${actionColors[String(v)] ?? "bg-gray-100 text-gray-700"}`}>
          {String(v)}
        </span>
      ),
    },
    {
      key: "module",
      label: "Modul",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark font-semibold">{String(v)}</span>,
    },
    {
      key: "record_id",
      label: "Record",
      render: (v: unknown) => (
        <span className="text-xs text-blue-600 font-mono truncate block max-w-[160px]">{String(v)}</span>
      ),
    },
    {
      key: "changes",
      label: "Perubahan",
      render: (_: unknown, row: typeof paginated[0]) => (
        <div className="flex items-center gap-1.5 text-[11px] font-mono min-w-[180px]">
          <span className="text-red-500 truncate max-w-[130px]" title={row.old_value ?? "â€”"}>
            {row.old_value ? truncate(row.old_value, 22) : "â€”"}
          </span>
          <span className="text-brand-gray-light">â†’</span>
          <span className="text-green-600 truncate max-w-[130px]" title={row.new_value ?? "â€”"}>
            {row.new_value ? truncate(row.new_value, 22) : "â€”"}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Audit Log" }]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{auditLogs.length}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Log</p>
        </div>
        {topModules.map(([module, count], i) => (
          <div key={module} className={i === 0 ? "card py-3 bg-brand-yellow/10" : "card py-3"}>
            <p className="text-2xl font-bold text-brand-black">{count}</p>
            <p className="text-xs text-brand-gray-mid mt-0.5">Log Â· {module}</p>
          </div>
        ))}
        {topModules.length < 3 &&
          Array.from({ length: 3 - topModules.length }).map((_, i) => (
            <div key={`empty-${i}`} className="card py-3">
              <p className="text-2xl font-bold text-brand-gray-light">0</p>
              <p className="text-xs text-brand-gray-light mt-0.5">Belum ada modul</p>
            </div>
          ))}
      </div>

      <div className="card bg-brand-yellow/10 border border-brand-yellow/30 py-3">
        <div className="flex items-start gap-3">
          <ScrollText className="w-4 h-4 text-brand-black mt-0.5 flex-shrink-0" />
          <p className="text-xs text-brand-gray-dark">
            Audit log bersifat <strong>immutable</strong> â€” tidak bisa dihapus atau diubah.
            Setiap aksi mencatat User, Role, Action, Module, Record ID, old value, new value, timestamp, IP, dan device.
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari user / record / modul..." className="w-64" />
          <Select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            options={moduleOptions}
            placeholder="Semua Modul"
            className="w-44"
          />
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={actionOptions}
            placeholder="Semua Aksi"
            className="w-36"
          />
          {(search || moduleFilter || actionFilter) && (
            <button
              className="text-xs text-brand-gray-mid hover:text-brand-black"
              onClick={() => {
                setSearch("");
                setModuleFilter("");
                setActionFilter("");
              }}
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} logs</span>
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
    </div>
  );
}
