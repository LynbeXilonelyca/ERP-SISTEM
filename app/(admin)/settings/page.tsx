"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { paymentTerms } from "@/lib/seed";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Save, Database, User } from "lucide-react";

export default function SettingsPage() {
  const { reset, users } = useData();
  const { user } = useAuth();
  const [resetDialog, setResetDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warningStock, setWarningStock] = useState("20");

  const saveSettings = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const me = users.find((u) => u.id === user?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Settings" }]}
      />

      {/* Profile */}
      <div className="card">
        <p className="section-title mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Profil Saya</p>
        {me && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-brand-gray-light">Nama</p>
              <p className="font-semibold text-brand-black mt-0.5">{me.name}</p>
            </div>
            <div>
              <p className="text-xs text-brand-gray-light">Email</p>
              <p className="font-semibold text-brand-black mt-0.5">{me.email}</p>
            </div>
            <div>
              <p className="text-xs text-brand-gray-light">Role</p>
              <p className="font-semibold text-brand-black mt-0.5">{me.role.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-brand-gray-light">Platform</p>
              <p className="font-semibold text-brand-black mt-0.5">{me.allowed_platform}</p>
            </div>
          </div>
        )}
      </div>

      {/* Business Settings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title">Pengaturan Bisnis</p>
          <Button variant="secondary" icon={<Save className="w-4 h-4" />} onClick={saveSettings}>
            {saved ? "Tersimpan âœ“" : "Simpan"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">Payment Terms</p>
            <div className="space-y-2">
              {paymentTerms.map((pt) => (
                <div key={pt.id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl">
                  <span className="text-sm font-medium text-brand-black">{pt.label}</span>
                  <span className="text-xs text-brand-gray-mid">{pt.days} hari</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-brand-gray-light mt-2">
              Super Admin dapat menambah tempo baru (mis. 14, 45, 60 hari) tanpa mengubah database.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-brand-gray-mid uppercase tracking-wide mb-3">Config Lainnya</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Default Warning Stock</label>
                <input type="number" className="form-input" value={warningStock} onChange={(e) => setWarningStock(e.target.value)} />
                <p className="text-xs text-brand-gray-light mt-1">Dapat di-override per produk.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="card border border-red-200">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-brand-black">Reset Data Demo</p>
            <p className="text-xs text-brand-gray-mid">Kembalikan seluruh data ke kondisi awal (seed).</p>
          </div>
          <Button variant="danger" onClick={() => setResetDialog(true)}>Reset Data</Button>
        </div>
      </div>

      <ConfirmDialog
        open={resetDialog}
        onClose={() => setResetDialog(false)}
        onConfirm={() => {
          reset();
          setResetDialog(false);
        }}
        title="Reset Seluruh Data"
        message="Semua perubahan akan hilang dan data dikembalikan ke kondisi awal. Lanjutkan?"
        confirmLabel="Ya, Reset"
        variant="danger"
      />
    </div>
  );
}
