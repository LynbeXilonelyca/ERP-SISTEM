"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Info } from "lucide-react";

export default function CommissionPage() {
  const { commissions, sessions } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showInfo, setShowInfo] = useState(false);

  const filtered = commissions.filter((c) => {
    const matchSearch = !search || c.sales_name.toLowerCase().includes(search.toLowerCase()) || c.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const perPage = 10;

  const columns = [
    {
      key: "invoice_number",
      label: "Invoice",
      render: (_: unknown, row: (typeof commissions)[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.invoice_number}</p>
          <p className="text-[10px] text-brand-gray-light">{row.sales_name}</p>
        </div>
      ),
    },
    {
      key: "gross_profit",
      label: "Profit",
      render: (v: unknown) => <span className="text-xs font-semibold text-brand-gray-dark">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "collected_amount",
      label: "Penagihan",
      render: (_: unknown, row: (typeof commissions)[0]) => (
        <span className="text-xs text-brand-gray-dark">{formatCurrency(row.collected_amount)}</span>
      ),
    },
    {
      key: "own_brand_commission",
      label: "Merek Sendiri",
      render: (_: unknown, row: (typeof commissions)[0]) => (
        <span className="text-xs text-blue-600">{row.own_brand_commission > 0 ? `${formatCurrency(row.own_brand_commission)} (+${row.own_brand_rate}%)` : "—"}</span>
      ),
    },
    {
      key: "other_brand_commission",
      label: "Merek Lain",
      render: (_: unknown, row: (typeof commissions)[0]) => (
        <span className="text-xs text-purple-600">{row.other_brand_commission > 0 ? `${formatCurrency(row.other_brand_commission)} (+${row.other_brand_rate}%)` : "—"}</span>
      ),
    },
    {
      key: "total_commission",
      label: "Total Komisi",
      render: (v: unknown) => <span className="text-xs font-bold text-green-600">{formatCurrency(Number(v))}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <Badge variant={v === "PAID" ? "success" : v === "APPROVED" ? "yellow" : "warning"}>{String(v)}</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Commission Transactions"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Commission" }]}
        actions={<Button variant="secondary" icon={<Info className="w-4 h-4" />} onClick={() => setShowInfo(true)}>Engine Info</Button>}
      />

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari sales / invoice..." className="w-56" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "CALCULATED", label: "Calculated" },
              { value: "APPROVED", label: "Approved" },
              { value: "PAID", label: "Paid" },
              { value: "ADJUSTED", label: "Adjusted" },
            ]}
            placeholder="Semua Status"
            className="w-40"
          />
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} transaksi</span>
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

      <Modal open={showInfo} onClose={() => setShowInfo(false)} title="Commission Engine" size="md" footer={<Button variant="secondary" onClick={() => setShowInfo(false)}>Tutup</Button>}>
        <div className="space-y-3 text-sm text-brand-gray-dark">
          <p><strong>Komisi dihitung dari penagihan (yang sudah dibayar).</strong> Setiap invoice hanya dikomisi jika nilai sudah diterima.</p>
          <p><strong>Merek Sendiri:</strong> persentase komisi untuk produk own brand.</p>
          <p><strong>Merek Lain:</strong> persentase komisi untuk produk non own brand.</p>
          <div className="p-3 bg-brand-yellow/10 rounded-xl">
            <p className="text-xs"><strong>Contoh:</strong> Merek Sendiri 2% + Merek Lain 1% dari profit penagihan.</p>
            <p className="text-xs mt-1">Komisi baru cair setelah Super Admin approve session sales.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
