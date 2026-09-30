"use client";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: number; // percentage, positive = up, negative = down
  trendLabel?: string;
  accent?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  accent = false,
  className,
  onClick,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={cn(
        "card flex flex-col gap-3 transition-shadow duration-150",
        accent && "bg-brand-yellow border-brand-yellow-dark",
        onClick && "cursor-pointer hover:shadow-card-hover",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", accent ? "text-brand-black/70" : "text-brand-gray-mid")}>
          {title}
        </p>
        {icon && (
          <span className={cn("p-2 rounded-xl", accent ? "bg-black/10" : "bg-brand-yellow/20 text-brand-black")}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className={cn("text-2xl font-bold leading-tight", accent ? "text-brand-black" : "text-brand-black")}>
          {value}
        </p>
        {subtitle && (
          <p className={cn("text-xs mt-0.5", accent ? "text-brand-black/60" : "text-brand-gray-light")}>
            {subtitle}
          </p>
        )}
      </div>
      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", isPositive ? "text-green-600" : "text-red-500")}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? "+" : ""}{trend}%</span>
          {trendLabel && <span className="text-brand-gray-light font-normal">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
  color?: "yellow" | "green" | "red" | "blue" | "gray";
}

export function MiniStat({ label, value, color = "gray" }: MiniStatProps) {
  const colorClass: Record<string, string> = {
    yellow: "text-amber-600 bg-brand-yellow/20",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
    gray: "text-brand-gray-dark bg-brand-bg",
  };
  return (
    <div className={cn("rounded-xl px-4 py-3 flex flex-col gap-0.5", colorClass[color])}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
