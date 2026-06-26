-- ============================================================
-- KioskFlow — Row Level Security Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Enable RLS on all tables ──────────────────────────────
alter table cart_items   enable row level security;
alter table wishlist     enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table products     enable row level security;
alter table suppliers    enable row level security;
alter table profiles     enable row level security;
alter table notifications enable row level security;
alter table reviews      enable row level security;

-- ── 2. profiles ──────────────────────────────────────────────
-- Users can only read/write their own profile
create policy "profiles: own record"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 3. suppliers ─────────────────────────────────────────────
-- Anyone can read supplier info (marketplace needs it)
create policy "suppliers: public read"
  on suppliers for select
  using (true);

-- Supplier can only update their own record
create policy "suppliers: own write"
  on suppliers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. products ──────────────────────────────────────────────
-- Anyone can read products
create policy "products: public read"
  on products for select
  using (true);

-- Only the product's supplier can insert/update/delete
create policy "products: supplier write"
  on products for all
  using (
    auth.uid() = (select user_id from suppliers where id = products.supplier_id)
  )
  with check (
    auth.uid() = (select user_id from suppliers where id = products.supplier_id)
  );

-- ── 5. cart_items ────────────────────────────────────────────
-- Users can only access their own cart
create policy "cart_items: own cart"
  on cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. wishlist ──────────────────────────────────────────────
-- Users can only access their own wishlist
create policy "wishlist: own list"
  on wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 7. orders ────────────────────────────────────────────────
-- Buyers see only their own orders
create policy "orders: buyer read"
  on orders for select
  using (auth.uid() = buyer_id);

-- Suppliers see orders where they are the supplier
create policy "orders: supplier read"
  on orders for select
  using (
    auth.uid() = (select user_id from suppliers where id = orders.supplier_id)
  );

-- Authenticated buyers can create orders (checkout API uses user JWT)
create policy "orders: buyer insert"
  on orders for insert
  with check (auth.uid() = buyer_id);

-- Buyers and suppliers can update order status
create policy "orders: update"
  on orders for update
  using (
    auth.uid() = buyer_id
    or auth.uid() = (select user_id from suppliers where id = orders.supplier_id)
  );

-- ── 8. order_items ───────────────────────────────────────────
-- Buyers see items from their own orders
create policy "order_items: buyer read"
  on order_items for select
  using (
    auth.uid() = (select buyer_id from orders where id = order_items.order_id)
  );

-- Suppliers see items where their products were ordered
create policy "order_items: supplier read"
  on order_items for select
  using (
    auth.uid() = (
      select s.user_id from products p
      join suppliers s on s.id = p.supplier_id
      where p.id = order_items.product_id
    )
  );

-- Insert allowed when buyer matches (checkout creates order_items)
create policy "order_items: buyer insert"
  on order_items for insert
  with check (
    auth.uid() = (select buyer_id from orders where id = order_items.order_id)
  );

-- ── 9. notifications ─────────────────────────────────────────
-- Users can only see their own notifications
create policy "notifications: own"
  on notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 10. reviews ──────────────────────────────────────────────
-- Anyone can read reviews
create policy "reviews: public read"
  on reviews for select
  using (true);

-- Users can only write their own reviews
create policy "reviews: own write"
  on reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
