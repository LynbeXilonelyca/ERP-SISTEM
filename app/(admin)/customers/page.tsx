"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput, Select, Input, Textarea } from "@/components/ui/Input";
import { Table, Pagination } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { paymentTerms } from "@/lib/seed";
import type { Customer as CustomerType, CustomerType as CustomerKind } from "@/types";
import { Plus, Pencil, Phone } from "lucide-react";

const typeColor: Record<string, "info" | "yellow" | "success"> = {
  REGULAR: "info",
  RESELLER: "yellow",
  DISTRIBUTOR: "success",
};

type Draft = {
  id: string;
  customer_code: string;
  store_name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  customer_type: CustomerKind;
  payment_term_id: string;
  payment_term_label: string;
  sales_id: string;
  sales_name: string;
  credit_limit: number;
  minimum_order: number;
  maximum_order: number;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
};

export default function CustomersPage() {
  const { customers, users, setDB, notify, addAudit } = useData();
  const { user, hasRole } = useAuth();
  const isManage = hasRole("SUPER_ADMIN") || hasRole("SALES_ADMIN") || hasRole("SHIPPING_ADMIN");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomerType | null>(null);
  const [draft, setDraft] = useState<Draft>({ id: "", customer_code: "", store_name: "", owner_name: "", phone: "", email: "", address: "", city: "", customer_type: "REGULAR", payment_term_id: "pt0", payment_term_label: "Cash", sales_id: "", sales_name: "", credit_limit: 0, minimum_order: 6, maximum_order: 500, status: "ACTIVE", created_at: "" });

  const salesOptions = useMemo(() => users.filter((u) => u.role === "SALES" && u.status === "ACTIVE"), [users]);
  const paymentTermOptions = useMemo(() => paymentTerms.map((t) => ({ value: t.id, label: t.label })), []);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !search ||
        c.store_name.toLowerCase().includes(search.toLowerCase()) ||
        c.customer_code.toLowerCase().includes(search.toLowerCase()) ||
        c.owner_name.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || c.customer_type === typeFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [customers, search, typeFilter, statusFilter]);

  const perPage = 10;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditing(null);
    const firstSales = salesOptions[0];
    setDraft({
      id: `cu${Date.now()}`,
      customer_code: `CST-${String(customers.length + 1).padStart(3, "0")}`,
      store_name: "",
      owner_name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      customer_type: "REGULAR",
      payment_term_id: "pt0",
      payment_term_label: "Cash",
      sales_id: firstSales?.id ?? "",
      sales_name: firstSales?.name ?? "",
      credit_limit: 0,
      minimum_order: 6,
      maximum_order: 500,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    });
    setShowForm(true);
  };

  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openAdd();
      router.replace("/customers");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (c: CustomerType) => {
    setEditing(c);
    setDraft({
      id: c.id,
      customer_code: c.customer_code,
      store_name: c.store_name,
      owner_name: c.owner_name,
      phone: c.phone,
      email: c.email ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      customer_type: c.customer_type,
      payment_term_id: c.payment_term_id,
      payment_term_label: c.payment_term_label,
      sales_id: c.sales_id,
      sales_name: c.sales_name,
      credit_limit: c.credit_limit,
      minimum_order: c.minimum_order,
      maximum_order: c.maximum_order,
      status: c.status,
      created_at: c.created_at,
    });
    setShowForm(true);
  };

  const save = () => {
    if (!draft.store_name || !draft.owner_name || !draft.phone) return;
    const data: CustomerType = {
      id: draft.id,
      customer_code: draft.customer_code,
      store_name: draft.store_name,
      owner_name: draft.owner_name,
      sales_id: draft.sales_id,
      sales_name: salesOptions.find((u) => u.id === draft.sales_id)?.name ?? draft.sales_name,
      phone: draft.phone,
      email: draft.email,
      address: draft.address,
      city: draft.city,
      customer_type: draft.customer_type,
      payment_term_id: draft.payment_term_id,
      payment_term_label: paymentTermOptions.find((t) => t.value === draft.payment_term_id)?.label ?? draft.payment_term_label,
      credit_limit: draft.credit_limit,
      outstanding: editing ? editing.outstanding : 0,
      minimum_order: editing ? editing.minimum_order : 6,
      maximum_order: editing ? editing.maximum_order : 500,
      status: editing ? editing.status : "ACTIVE",
      created_at: draft.created_at,
    };
    setDB((db) => ({
      ...db,
      customers: editing ? db.customers.map((c) => (c.id === editing.id ? data : c)) : [...db.customers, data],
    }));
    addAudit({
      user_name: user?.name ?? "Super Admin",
      user_role: user?.role ?? "SUPER_ADMIN",
      action: editing ? "UPDATE" : "CREATE",
      module: "CUSTOMER",
      record_id: data.customer_code,
      old_value: editing ? "EXISTS" : "NONE",
      new_value: data.store_name,
      ip_address: "local",
      device: "Web",
    });
    notify({ title: editing ? "Customer Diperbarui" : "Customer Ditambahkan", message: `${data.store_name} tersimpan.`, type: "SUCCESS" });
    setShowForm(false);
  };

  const columns = [
    {
      key: "customer_code",
      label: "Customer",
      render: (_: unknown, row: typeof paginated[0]) => (
        <div>
          <p className="text-xs font-bold text-brand-black">{row.store_name}</p>
          <p className="text-[10px] text-brand-gray-light">{row.customer_code} Â· {row.owner_name}</p>
        </div>
      ),
    },
    {
      key: "sales_name",
      label: "Sales PIC",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "city",
      label: "Kota",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v || "â€”")}</span>,
    },
    {
      key: "customer_type",
      label: "Tipe",
      render: (v: unknown) => <Badge variant={typeColor[String(v)] ?? "default"}>{String(v)}</Badge>,
    },
    {
      key: "payment_term_label",
      label: "Term",
      render: (v: unknown) => <span className="text-xs text-brand-gray-dark">{String(v)}</span>,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      render: (v: unknown) => (
        <span className={`text-xs font-semibold ${Number(v) > 0 ? "text-red-500" : "text-brand-gray-light"}`}>
          {Number(v) > 0 ? formatCurrency(Number(v)) : "Lunas"}
        </span>
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
      key: "status",
      label: "Status",
      render: (v: unknown) => <Badge variant={v === "ACTIVE" ? "success" : "gray"}>{String(v)}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, row: typeof paginated[0]) =>
        isManage ? (
          <div className="flex items-center gap-1">
            <a href={`tel:${row.phone}`} className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors">
              <Phone className="w-3.5 h-3.5" />
            </a>
            <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-brand-yellow/20 text-brand-gray-mid hover:text-brand-black transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-brand-gray-light">Lihat</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Customers" }]}
        actions={
          isManage ? (
            <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
              Tambah Customer
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Customer", value: customers.length },
          { label: "Regular", value: customers.filter(c => c.customer_type === "REGULAR").length },
          { label: "Reseller", value: customers.filter(c => c.customer_type === "RESELLER").length },
          { label: "Distributor", value: customers.filter(c => c.customer_type === "DISTRIBUTOR").length },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3 py-3">
            <div>
              <p className="text-2xl font-bold text-brand-black">{s.value}</p>
              <p className="text-xs text-brand-gray-mid mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-brand-gray-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari toko / kode / pemilik..." className="w-56" />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: "REGULAR", label: "Regular" },
              { value: "RESELLER", label: "Reseller" },
              { value: "DISTRIBUTOR", label: "Distributor" },
            ]}
            placeholder="Semua Tipe"
            className="w-40"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
            placeholder="Semua Status"
            className="w-36"
          />
          {(search || typeFilter || statusFilter) && (
            <button className="text-xs text-brand-gray-mid hover:text-brand-black" onClick={() => { setSearch(""); setTypeFilter(""); setStatusFilter(""); }}>
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-brand-gray-light">{filtered.length} customer</span>
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
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Customer" : "Tambah Customer"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            <Button disabled={!draft.store_name || !draft.owner_name || !draft.phone} onClick={save}>
              {editing ? "Simpan Perubahan" : "Tambah Customer"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nama Toko (wajib)" value={draft.store_name} onChange={(e) => setDraft({ ...draft, store_name: e.target.value })} placeholder="Nama toko / CV / PT" />
          <Input label="Nama Pemilik (wajib)" value={draft.owner_name} onChange={(e) => setDraft({ ...draft, owner_name: e.target.value })} placeholder="Nama pemilik / PIC" />
          <Input label="No. Telepon (wajib)" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
          <Input label="Email" type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="email@toko.com" />
          <Select
            label="Customer Type"
            value={draft.customer_type}
            onChange={(e) => setDraft({ ...draft, customer_type: e.target.value as CustomerKind })}
            options={[
              { value: "REGULAR", label: "Regular" },
              { value: "RESELLER", label: "Reseller" },
              { value: "DISTRIBUTOR", label: "Distributor" },
            ]}
          />
          <Select
            label="Payment Term"
            value={draft.payment_term_id}
            onChange={(e) => setDraft({ ...draft, payment_term_id: e.target.value, payment_term_label: paymentTermOptions.find((t) => t.value === e.target.value)?.label ?? draft.payment_term_label })}
            options={paymentTermOptions}
          />
          <Select
            label="Sales PIC"
            value={draft.sales_id}
            onChange={(e) => setDraft({ ...draft, sales_id: e.target.value, sales_name: salesOptions.find((u) => u.id === e.target.value)?.name ?? "" })}
            options={salesOptions.map((u) => ({ value: u.id, label: u.name }))}
          />
          <Input label="Credit Limit" type="number" value={draft.credit_limit} onChange={(e) => setDraft({ ...draft, credit_limit: Number(e.target.value) })} placeholder="0" hint="0 = tidak ada limit" />
          <div className="col-span-2">
            <Textarea label="Alamat" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Alamat lengkap toko" />
          </div>
          <Input label="Kota" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Kota" />
        </div>
      </Modal>
    </div>
  );
}
