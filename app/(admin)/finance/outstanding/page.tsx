"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useData } from "@/lib/store";

export default function OutstandingPage() {
  const { customers } = useData();
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => c.outstanding > 0 && (!search || c.store_name.toLowerCase().includes(search.toLowerCase())));

  const columns = [
    {
      key: "customer_code",
      label: "Customer",
      render: (_: unknown, row: (typeof filtered)[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.store_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.customer_code} Â· {row.sales_name}</p>
        </div>
      ),
    },
    {
      key: "city",
      label: "Kota",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      render: (v: unknown) => (
        <span className="text-xs font-bold text-red-500">{formatCurrency(Number(v))}</span>
      ),
    },
    {
      key: "credit_limit",
      label: "Credit Limit",
      render: (v: unknown) => (
        <span className="text-xs text-brand-gray-dark">
          {Number(v) > 0 ? formatCurrency(Number(v)) : "â€”"}
        </span>
      ),
    },
    {
      key: "customer_type",
      label: "Tipe",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
  ];

  const totalOutstanding = filtered.reduce((a, c) => a + c.outstanding, 0);
  const totalCredit = filtered.reduce((a, c) => a + c.credit_limit, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outstanding"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Finance" }, { label: "Outstanding" }]}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="card py-3">
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalOutstanding)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Piutang</p>
        </div>
        <div className="card py-3">
          <p className="text-2xl font-bold text-brand-black">{formatCurrency(totalCredit)}</p>
          <p className="text-xs text-brand-gray-mid mt-0.5">Total Credit Limit (berpiutang)</p>
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari customer..." className="w-60" />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} customer berpiutang</span>
        </div>
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          data={filtered as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
      </div>
    </div>
  );
}
