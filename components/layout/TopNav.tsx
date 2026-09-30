"use client";
import Link from "next/link";
import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  LogOut,
  User,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ClipboardCheck,
  UserPlus,
  CheckCheck,
  Eraser,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInitials, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";

const iconMap = {
  WARNING: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  INFO: <Info className="w-4 h-4 text-blue-500" />,
  SUCCESS: <CheckCircle className="w-4 h-4 text-green-500" />,
  ERROR: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

interface TopNavProps {
  onToggleSidebar: () => void;
}

const topActions = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { label: "Update Stok", href: "/inventory", icon: <Boxes className="w-3.5 h-3.5" /> },
  { label: "Tambah Produk", href: "/products?new=1", icon: <PackagePlus className="w-3.5 h-3.5" /> },
  { label: "Approval", href: "/approvals", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  { label: "Tambah Customer", href: "/customers?new=1", icon: <UserPlus className="w-3.5 h-3.5" /> },
];

export function TopNav({ onToggleSidebar }: TopNavProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout, hasRole } = useAuth();
  const { notifications: allNotifications, markNotifRead, markAllNotifRead, clearNotifs } = useData();
  const router = useRouter();
  const isSuper = hasRole("SUPER_ADMIN");

  const notifications = allNotifications.filter(
    (n) => !n.target_role || n.target_role === user?.role
  );
  const unread = notifications.filter((n) => !n.is_read).length;
  const currentUser = user ?? { name: "Super Admin", role: "SUPER_ADMIN", email: "admin@erp.com" };

  const goProfile = () => {
    setShowProfile(false);
    router.push("/settings");
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <header className="h-14 bg-white border-b border-brand-gray-border flex items-center px-4 gap-3 relative z-30">
      {/* Hamburger */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-xl hover:bg-brand-bg text-brand-gray-mid transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-light" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKey}
          placeholder="Search invoice, customer, product..."
          className="w-full bg-brand-bg border border-transparent focus:border-brand-gray-border rounded-xl pl-9 pr-4 py-2 text-sm placeholder-brand-gray-light focus:outline-none focus:ring-2 focus:ring-brand-yellow transition-all"
        />
      </div>

      {/* Aksi cepat (Top Menu) — Super Admin */}
      {isSuper && (
        <div className="hidden lg:flex items-center gap-1">
          {topActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-brand-gray-mid hover:bg-brand-yellow/20 hover:text-brand-black transition-colors whitespace-nowrap"
            >
              {a.icon}
              <span className="text-[11px] font-semibold">{a.label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Notification */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotif(!showNotif);
            setShowProfile(false);
          }}
          className="relative p-2 rounded-xl hover:bg-brand-bg text-brand-gray-mid transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {showNotif && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-brand-gray-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray-border">
              <p className="text-sm font-bold">Notifications</p>
              <span className="text-xs text-brand-gray-mid">{unread} unread</span>
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-brand-gray-border">
                <button onClick={markAllNotifRead} className="flex items-center gap-1 text-[10px] font-semibold text-brand-gray-mid hover:text-brand-black transition-colors">
                  <CheckCheck className="w-3 h-3" /> Tandai Dibaca ({unread})
                </button>
                <button onClick={clearNotifs} className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-600 transition-colors">
                  <Eraser className="w-3 h-3" /> Hapus Semua
                </button>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-brand-gray-light">
                  Tidak ada notifikasi
                </div>
              )}
              {notifications.slice(0, 12).map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotifRead(n.id)}
                  className={cn(
                    "px-4 py-3 flex gap-3 border-b border-brand-gray-border last:border-0 hover:bg-brand-bg cursor-pointer transition-colors",
                    !n.is_read && "bg-brand-yellow/5"
                  )}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {iconMap[n.type as keyof typeof iconMap]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-black leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-brand-gray-mid mt-0.5 truncate">{n.message}</p>
                    <p className="text-[10px] text-brand-gray-light mt-1">
                      {formatDateTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-brand-yellow rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => {
            setShowProfile(!showProfile);
            setShowNotif(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-brand-bg transition-colors"
        >
          <div className="w-7 h-7 bg-brand-yellow rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-brand-black">
              {getInitials(currentUser.name)}
            </span>
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-semibold text-brand-black leading-tight">{currentUser.name}</p>
            <p className="text-[10px] text-brand-gray-light">{currentUser.role.replace(/_/g, " ")}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-brand-gray-light hidden md:block" />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-brand-gray-border overflow-hidden">
            <div className="px-4 py-3 border-b border-brand-gray-border">
              <p className="text-sm font-bold">{currentUser.name}</p>
              <p className="text-xs text-brand-gray-mid">{currentUser.email}</p>
            </div>
            <div className="py-1.5">
              <button
                onClick={goProfile}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-gray-dark hover:bg-brand-bg transition-colors"
              >
                <User className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={goProfile}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-gray-dark hover:bg-brand-bg transition-colors"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
              <div className="border-t border-brand-gray-border my-1" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}