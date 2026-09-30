// ─── Supplier ────────────────────────────────────────────────────
export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
}

// ─── App Settings ────────────────────────────────────────────────
export interface AppSettings {
  cut_off_days: number;
  cut_off_enabled: boolean;
  main_commission_rate: number;
  own_brand_commission_rate: number;
  other_brand_commission_rate: number;
  reminder_h1_enabled: boolean;
}

// ─── Sales Order (Jalur Pengadaan → Penjualan) ───────────────────
export type OrderStatus =
  | "AWAITING_SALES"
  | "APPROVED_BY_SALES"
  | "REJECTED_BY_SALES"
  | "INVOICE_PENDING"
  | "COMPLETED"
  | "CANCELLED";

export interface SalesOrder {
  id: string;
  order_code: string;
  purchase_id: string;
  purchase_code: string;
  supplier_id: string;
  supplier_name: string;
  sales_id: string;
  sales_name: string;
  items: PurchaseItem[];
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  completed_at?: string;
}

// ─── Auth & Users ───────────────────────────────────────────────
export type Role =
  | "SUPER_ADMIN"
  | "SALES"
  | "SALES_ADMIN"
  | "SHIPPING_ADMIN"
  | "FINANCE"
  | "PURCHASE_ADMIN";

export type Platform = "WEB" | "MOBILE" | "BOTH";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  allowed_platform: Platform;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
}

// ─── Product ────────────────────────────────────────────────────
export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
}

export interface Category {
  id: string;
  name: string;
  sub_categories: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  category_id: string;
}

export interface PaymentTerm {
  id: string;
  label: string;
  days: number;
}

export interface ProductPrice {
  payment_term_id: string;
  payment_term_label: string;
  price: number;
  effective_from: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand_id: string;
  brand_name: string;
  category_id: string;
  category_name: string;
  sub_category_id: string;
  sub_category_name: string;
  is_own_brand: boolean;
  minimum_order: number;
  maximum_order: number;
  multiple_order: number;
  warning_stock: number;
  cost_price: number;
  prices: ProductPrice[];
  status: "ACTIVE" | "INACTIVE";
  image_url?: string;
  created_at: string;
}

// ─── Inventory ──────────────────────────────────────────────────
export interface InventoryItem {
  product_id: string;
  product_name: string;
  sku: string;
  physical_stock: number;
  reserved_stock: number;
  available_stock: number;
  incoming_stock: number;
  damaged_stock: number;
  warning_stock: number;
}

export type MovementType =
  | "PURCHASE"
  | "SALE"
  | "RETURN_SELLABLE"
  | "RETURN_DAMAGED"
  | "ADJUSTMENT";

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  movement_type: MovementType;
  quantity: number;
  before_stock: number;
  after_stock: number;
  reference_type: string;
  reference_id: string;
  created_by: string;
  created_at: string;
}

// ─── Customer ───────────────────────────────────────────────────
export type CustomerType = "REGULAR" | "RESELLER" | "DISTRIBUTOR";

export interface Customer {
  id: string;
  customer_code: string;
  store_name: string;
  owner_name: string;
  sales_id: string;
  sales_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  customer_type: CustomerType;
  payment_term_id: string;
  payment_term_label: string;
  credit_limit: number;
  outstanding: number;
  minimum_order: number;
  maximum_order: number;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
}

// ─── Sales Session ───────────────────────────────────────────────
export type SessionStatus = "ACTIVE" | "PENDING_REVIEW" | "DONE" | "CANCELLED";

export interface SalesSession {
  id: string;
  session_code: string;
  sales_id: string;
  sales_name: string;
  start_date: string;
  end_date?: string;
  status: SessionStatus;
  total_invoices: number;
  total_revenue: number;
  total_commission: number;
  created_at: string;
}

// ─── Invoice ────────────────────────────────────────────────────
export type InvoiceStatus =
    | "DRAFT"
    | "CANCELLED"
    | "PENDING_SUPER"
    | "PENDING_SHIPPING"
    | "PENDING_FINANCE"
    | "CONFIRMED"
    | "PRINTED"
    | "READY_TO_SHIP"
    | "SENDING"
    | "DELIVERED"
    | "RETURNED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
export type ShippingStatus =
  | "PENDING"
  | "READY"
  | "SENDING"
  | "DELIVERED"
  | "RETURNED";

export interface InvoiceItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  cost_at_transaction: number;
  standard_price: number;
  selling_price: number;
  subtotal: number;
  payment_term: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  session_id: string;
  sales_id: string;
  sales_name: string;
  customer_id: string;
  customer_name: string;
  store_name: string;
  items: InvoiceItem[];
  payment_term_id: string;
  payment_term_label: string;
  subtotal: number;
  discount: number;
  total: number;
  invoice_status: InvoiceStatus;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
  source?: "SALES" | "ORDER";
  order_id?: string;
  due_date?: string;
  printed_at?: string;
  printed_by?: string;
    print_count: number;
    notes?: string;
    change_note?: string;
    shipping_date?: string;
    created_at: string;
    updated_at: string;
  }

// ─── Purchase ───────────────────────────────────────────────────
export type PurchaseStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface PurchaseItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  subtotal: number;
}

export interface PurchaseRequest {
  id: string;
  purchase_code: string;
  supplier_id: string;
  supplier_name: string;
  for_sales_id?: string;
  for_sales_name?: string;
  items: PurchaseItem[];
  total_amount: number;
  status: PurchaseStatus;
  invoice_url?: string;
  proof_url?: string;
  notes?: string;
  requested_by: string;
  requested_by_name: string;
  approved_by?: string;
  approved_by_name?: string;
  created_at: string;
  approved_at?: string;
}

// ─── Finance ────────────────────────────────────────────────────
export interface Payment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  payment_method: string;
  proof_url?: string;
  created_by: string;
  created_at: string;
}

export interface BillingSession {
    id: string;
    session_id: string;
    session_code: string;
    sales_name: string;
    total_invoices: number;
    total_amount: number;
    paid_amount: number;
    outstanding: number;
    status: "PENDING" | "REVIEWED" | "APPROVED" | "REJECTED";
    total_commission?: number;
    created_at: string;
    approved_at?: string;
  }

// ─── Commission ─────────────────────────────────────────────────
export type CommissionStatus =
  | "PENDING"
  | "CALCULATED"
  | "APPROVED"
  | "PAID"
  | "ADJUSTED";

export interface CommissionTransaction {
  id: string;
  session_id: string;
  sales_id: string;
  sales_name: string;
  invoice_id: string;
  invoice_number: string;
  gross_profit: number;
  main_commission_rate: number;
  main_commission: number;
  own_brand_rate: number;
  own_brand_commission: number;
  sub_commission_rate: number;
  sub_commission: number;
  total_commission: number;
  status: CommissionStatus;
  created_at: string;
}

// ─── Notification ────────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  is_read: boolean;
  created_at: string;
  target_role?: Role;
}

// ─── Price Change Request ─────────────────────────────────────────
export type PriceChangeStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PriceChangeRequest {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  payment_term_id: string;
  payment_term_label: string;
  old_price: number;
  new_price: number;
  requested_by: string;
  requested_by_name: string;
  requested_by_role: Role;
  status: PriceChangeStatus;
  notes?: string;
  created_at: string;
  decided_at?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  user_name: string;
  user_role: Role;
  action: string;
  module: string;
  record_id: string;
  old_value?: string;
  new_value?: string;
  ip_address: string;
  device: string;
  created_at: string;
}

// ─── Table & Pagination ─────────────────────────────────────────
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}
