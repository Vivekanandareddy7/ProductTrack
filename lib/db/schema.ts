import {
  pgSchema,
  pgTable,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
  boolean,
  integer,
  index,
  date,
} from "drizzle-orm/pg-core";
export const auth = pgSchema("auth");
export const authUsers = auth.table("users", { id: uuid("id").primaryKey() });
export const catalogProducts = pgTable("catalog_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  name: text("name"),
  currentPrice: numeric("current_price"),
  currency: text("currency"),
  imageUrl: text("image_url"),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  priceCheckedAt: timestamp("price_checked_at", { withTimezone: true }),
  stockStatus: text("stock_status").notNull().default("unknown"),
  shippingCost: numeric("shipping_cost"),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
  lastError: text("last_error"),
  leaseToken: uuid("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    userId: uuid("user_id").references(() => authUsers.id),
    catalogId: uuid("catalog_id")
      .references(() => catalogProducts.id)
      .notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, {
      onDelete: "set null",
    }),
    comparisonGroupId: uuid("comparison_group_id").references(
      () => comparisonGroups.id,
      { onDelete: "set null" },
    ),
    deliveryCost: numeric("delivery_cost"),
    restockEnabled: boolean("restock_enabled").notNull().default(false),
    url: text("url").notNull(),
    name: text("name"),
    currentPrice: numeric("current_price"),
    currency: text("currency"),
    imageUrl: text("image_url"),
    updatedAt: timestamp("updated_at"),
    baselinePrice: numeric("baseline_price"),
    targetPrice: numeric("target_price"),
    dropPercent: numeric("drop_percent"),
    alertEnabled: boolean("alert_enabled").notNull().default(false),
    paused: boolean("paused").notNull().default(false),
    alertCondition: boolean("alert_condition").notNull().default(false),
    ruleVersion: integer("rule_version").notNull().default(1),
  },
  (t) => [
    unique("products_user_id_url_key").on(t.userId, t.url),
    unique("products_user_catalog_key").on(t.userId, t.catalogId),
    index("products_catalog_idx").on(t.catalogId),
  ],
);
// Legacy history is preserved by the migration for audit/backwards compatibility.
export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price").notNull(),
  currency: text("currency"),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});
export const catalogPriceHistory = pgTable(
  "catalog_price_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => catalogProducts.id, { onDelete: "cascade" }),
    price: numeric("price").notNull(),
    currency: text("currency").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("catalog_history_time_idx").on(t.catalogId, t.checkedAt)],
);
export const alertEvents = pgTable(
  "alert_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => catalogObservations.id),
    productName: text("product_name").notNull(),
    productUrl: text("product_url").notNull(),
    kind: text("kind").notNull(),
    oldPrice: numeric("old_price"),
    newPrice: numeric("new_price"),
    currency: text("currency").notNull(),
    targetPrice: numeric("target_price"),
    dropPercent: numeric("drop_percent"),
    ruleVersion: integer("rule_version").notNull(),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    unique("alert_observation_rule_key").on(
      t.productId,
      t.observationId,
      t.ruleVersion,
    ),
    index("alert_user_time_idx").on(t.userId, t.createdAt),
  ],
);
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type PriceHistoryRow = typeof priceHistory.$inferSelect;
export type NewPriceHistoryRow = typeof priceHistory.$inferInsert;

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  budget: numeric("budget"),
  currency: text("currency").notNull().default("INR"),
  isPublic: boolean("is_public").notNull().default(false),
  shareToken: uuid("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const comparisonGroups = pgTable("comparison_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const catalogObservations = pgTable("catalog_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  catalogId: uuid("catalog_id")
    .notNull()
    .references(() => catalogProducts.id, { onDelete: "cascade" }),
  price: numeric("price"),
  currency: text("currency").notNull(),
  stockStatus: text("stock_status").notNull(),
  shippingCost: numeric("shipping_cost"),
  checkedAt: timestamp("checked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .unique()
    .references(() => products.id, { onDelete: "set null" }),
  collectionId: uuid("collection_id").references(() => collections.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  productUrl: text("product_url").notNull(),
  imageUrl: text("image_url"),
  currency: text("currency").notNull(),
  paidPrice: numeric("paid_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  baselinePrice: numeric("baseline_price"),
  purchasedAt: date("purchased_at").notNull(),
  trackingWasPaused: boolean("tracking_was_paused").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
