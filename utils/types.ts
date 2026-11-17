export interface AuthModelProps {
  isOpen: boolean;
  onClose: () => void;
}
export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}
export interface Product {
  id: string;
  user_id: string;
  catalog_id?: string;
  url: string;
  name: string;
  current_price: number;
  currency: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  baseline_price?: number | null;
  target_price?: number | null;
  drop_percent?: number | null;
  alert_enabled?: boolean;
  paused?: boolean;
  last_error?: string | null;
  collection_id?: string | null;
  comparison_group_id?: string | null;
  delivery_cost?: number | null;
  restock_enabled?: boolean;
  stock_status?: StockStatus;
  stock_checked_at?: string | null;
  purchase?: Purchase | null;
  comparisons?: ComparisonOffer[];
}
export interface PricePoint {
  price: number;
  checked_at: string;
}
export interface ProductStats {
  first_price?: number | null;
  lowest_price?: number | null;
  highest_price?: number | null;
  median_price?: number | null;
  observation_count?: number;
  history?: PricePoint[];
}
export interface ProductWithStats extends Product, ProductStats {}
export interface PriceHistory extends PricePoint {
  id: string;
  product_id: string;
  currency: string;
  created_at?: string;
}
export interface ScrapedProduct {
  productName: string;
  currentPrice: number | null;
  stockStatus?: StockStatus;
  shippingCost?: number | null;
  currencyCode?: string;
  productImageUrl?: string;
}
export interface AlertEvent {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  kind: "target" | "drop" | "restock";
  old_price: number | null;
  new_price: number | null;
  currency: string;
  target_price?: number | null;
  drop_percent?: number | null;
  status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  created_at: string;
  sent_at?: string | null;
  error?: string | null;
}
export interface SendPriceDropAlertResult {
  success?: boolean;
  error?: string;
}

export type StockStatus = "unknown" | "in_stock" | "out_of_stock";
export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  budget: number | null;
  currency: string;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
}
export interface Purchase {
  id: string;
  user_id: string;
  product_id: string | null;
  collection_id: string | null;
  product_name: string;
  product_url: string;
  image_url?: string;
  currency: string;
  paid_price: number;
  quantity: number;
  baseline_price: number | null;
  purchased_at: string;
}
export interface ComparisonOffer {
  product_id: string;
  name: string;
  url: string;
  image_url?: string;
  current_price: number | null;
  currency: string;
  shipping_cost: number | null;
  shipping_source: "manual" | "store" | "unknown";
  stock_status: StockStatus;
  checked_at?: string;
}
export interface PublicWishlist {
  name: string;
  description: string;
  items: {
    name: string;
    url: string;
    image_url?: string;
    price: number | null;
    currency: string;
    stock_status: StockStatus;
    checked_at?: string;
  }[];
}
