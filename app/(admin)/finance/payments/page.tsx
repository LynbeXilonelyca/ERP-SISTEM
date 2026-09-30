"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";

export default function PaymentsPage() {
  const { payments } = useData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = payments.filter(
    (p) =>
      !search ||
      p.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const perPage = 10;

  const columns = [
    {
      key: "created_at",
      label: "Tanggal",
      render: (v: unknown) => <span className="text-xs text-brand-gray-mid">{formatDate(String(v))}</span>,
    },
    {
      key: "invoice_number",
      label: "Invoice",
      render: (v: unknown) => <span className="text-xs font-bold text-brand-black">{String(v)}</span>,
    },
    {
      key: "customer_name",
      label: "Customer",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "amount",
      label: "Jumlah",
      render: (v: unknown) => <span className="text-xs font-bold text-green-600">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "payment_method",
      label: "Metode",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "created_by",
      label: "Oleh",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "Payments" }]}
      />
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari invoice / customer..." className="w-60" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} pembayaran</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered.slice((page - 1) * perPage, page * perPage) as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filtered.length / perPage)}
          total={filtered.length}
          perPage={perPage}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
