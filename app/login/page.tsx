"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { seedCredentials } from "@/lib/seed";
import { homeForRole } from "@/lib/access";

const demoAccounts = [
  { role: "SUPER_ADMIN", label: "Super Admin", email: "superadmin@erp.com", color: "bg-brand-yellow text-brand-black" },
  { role: "SALES_ADMIN", label: "Admin Penjualan", email: "penjualan@erp.com", color: "bg-green-100 text-green-700" },
  { role: "SHIPPING_ADMIN", label: "Admin Pengiriman", email: "pengiriman@erp.com", color: "bg-orange-100 text-orange-700" },
  { role: "FINANCE", label: "Finance", email: "finance@erp.com", color: "bg-blue-100 text-blue-700" },
  { role: "PURCHASE_ADMIN", label: "Admin Pembelian", email: "pembelian@erp.com", color: "bg-purple-100 text-purple-700" },
  { role: "SALES", label: "Sales (Mobile)", email: "andi@erp.com", color: "bg-red-100 text-red-700" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login gagal.");
      return;
    }
    // Determine landing by looking up the user
    const { seedUsers } = await import("@/lib/seed");
    const user = seedUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    router.push(homeForRole(user?.role ?? "SUPER_ADMIN"));
  };

  const quickFill = (em: string) => {
    setEmail(em);
    setPassword(seedCredentials[em] ?? "");
    setError("");
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      {/* Background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-yellow/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-brand-black">ERP Admin</h1>
          <p className="text-sm text-brand-gray-mid mt-1">Distribution Management System</p>
        </div>

        {/* Card */}
        <div className="card shadow-xl">
          <h2 className="text-base font-bold text-brand-black mb-1">Selamat Datang</h2>
          <p className="text-xs text-brand-gray-mid mb-6">Login sesuai role Anda di sistem</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-light" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="form-input pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-light" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="form-input pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-light hover:text-brand-gray-mid transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-brand-gray-border">
            <p className="text-[10px] text-brand-gray-light text-center">
              Admin & Staff menggunakan Web. Sales menggunakan Mobile App.
            </p>
          </div>
        </div>

        {/* Demo role picker */}
        <div className="mt-4 card bg-white/90">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-brand-gray-mid" />
            <p className="text-xs font-bold text-brand-black">Pilih Role (Demo)</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => quickFill(acc.email)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-brand-gray-border hover:border-brand-yellow hover:bg-brand-yellow/10 transition-all text-left"
              >
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${acc.color}`}>
                  {acc.role.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] text-brand-gray-mid truncate">{acc.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-brand-gray-light mt-3 text-center">
            Klik role untuk mengisi akun demo otomatis, lalu klik Login.
          </p>
        </div>
      </div>
    </div>
  );
}
