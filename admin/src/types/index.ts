export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'INVENTORY_MANAGER' | 'SUPPORT_MANAGER';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

export type ComplaintStatus = 'Pending' | 'Open' | 'In_Progress' | 'Resolved' | 'Rejected';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SOSStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';

export interface AdminUser {
  id: number;
  user_id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AccountStatus;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface UserProfile {
  user_id: number;
  username: string;
  name: string;
  mob?: string;
  address?: string;
  nationality?: string;
  emergency_contact?: string;
  created_at: string;
  status?: AccountStatus;
  last_login_at?: string;
  is_deleted?: boolean;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  price: number;
  supplier?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'INACTIVE';
  image_url?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryTransaction {
  id: number;
  item_id: number;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADD' | 'REMOVE' | 'ADJUST' | 'ORDER_DEDUCT' | 'DAMAGE' | 'EXPIRED' | 'RETURN';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  supplier?: string;
  batch_number?: string;
  expiry_date?: string;
  admin_id?: number;
  admin_email?: string;
  reason?: string;
  notes?: string;
  created_at: string;
  inventory_items?: {
    name: string;
    sku: string;
  };
}

export interface Complaint {
  id: number;
  username: string;
  category?: string;
  description: string;
  latitude?: number;
  longitude?: number;
  status: string;
  priority?: ComplaintPriority;
  assigned_to?: number;
  assigned_admin_name?: string;
  internal_notes?: string;
  admin_response?: string;
  created_at: string;
  updated_at?: string;
}

export interface SOSIncident {
  id: number;
  user_id?: number;
  username?: string;
  emergency_type: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  status: SOSStatus;
  acknowledged_by?: number;
  acknowledged_admin_name?: string;
  acknowledged_at?: string;
  resolved_by?: number;
  resolved_admin_name?: string;
  resolved_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  location_masked?: boolean;
}

export interface Facility {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  phone?: string;
  opening_hours?: string;
  is_verified: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface Offer {
  id: number;
  title: string;
  description?: string;
  discount: string;
  image_url?: string;
  vendor: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
  created_at?: string;
  updated_at?: string;
}

export interface Guide {
  g_id: number;
  name: string;
  languages?: string;
  status?: string;
  rating?: number;
}

export interface PriceItem {
  id: number;
  name: string;
  base_price: number;
}

export interface PaymentRecord {
  id: number;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  user_id: number;
  equipment_id?: number;
  quantity?: number;
  amount_paise: number;
  currency: string;
  status: string;
  receipt?: string;
  failure_reason?: string;
  paid_at?: string;
  created_at: string;
  traveler_name?: string;
  traveler_username?: string;
  traveler_mob?: string;
  equipment_name?: string;
  equipment_sku?: string;
  unit_price?: number;
  equipment_order_id?: number;
  refund_id?: string;
  refund_status?: string;
  amount_refunded_paise?: number;
  refunded_at?: string;
  signature_verified?: boolean;
  webhook_verified?: boolean;
  payment_method?: string;
  traveler?: any;
  equipment?: any;
  order?: any;
  inventory_audit?: {
    transaction_id?: number;
    transaction_type?: string;
    quantity_deducted?: number;
    previous_stock?: number;
    new_stock?: number;
    current_warehouse_stock?: number;
    created_at?: string;
    reason?: string;
    notes?: string;
    reconciliation_status?: string;
  };
  gateway_details?: any;
}

export interface NotificationRecord {
  notification_id: number;
  user_id: number;
  device_id?: number;
  notification_type: string;
  title?: string;
  body?: string;
  data?: any;
  is_read?: boolean;
  expo_response_status?: string;
  created_at: string;
  users?: {
    username: string;
    name: string;
  };
}

export interface AuditLog {
  id: number;
  admin_id?: number;
  admin_email?: string;
  admin_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
  created_at: string;
}

export interface AdminSettings {
  app_name: string;
  support_email: string;
  support_phone: string;
  default_minimum_stock: number;
  session_timeout_minutes: number;
  sos_alert_sound: boolean;
}

export interface DashboardStats {
  summary: {
    total_users: number;
    active_users: number;
    suspended_users: number;
    new_users_today: number;
    sos_incidents: number;
    open_complaints: number;
    inventory_items: number;
    low_stock_items: number;
    total_revenue: number;
  };
  charts: {
    user_growth: Array<{ date: string; users: number }>;
    complaints_by_status: Array<{ status: string; count: number }>;
    sos_by_status: Array<{ status: string; count: number }>;
    stock_levels: Array<{ name: string; stock: number; min: number }>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  [key: string]: any;
}

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

