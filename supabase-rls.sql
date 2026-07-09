-- ============================================================
-- Vendoro — Row Level Security Policies
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

-- ── 12. support_conversations & support_messages ─────────────
alter table support_conversations enable row level security;
alter table support_messages      enable row level security;

create policy "support_conversations: own only"
  on support_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "support_messages: own conversation"
  on support_messages for select
  using (
    exists (
      select 1 from support_conversations sc
      where sc.id = support_messages.conversation_id
      and sc.user_id = auth.uid()
    )
  );

create policy "support_messages: insert own"
  on support_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from support_conversations sc
      where sc.id = support_messages.conversation_id
      and sc.user_id = auth.uid()
    )
  );

-- ── Helper function: atomic stock increment ───────────────────
-- Used by /api/restore-stock to avoid read-modify-write race condition
create or replace function increment_product_stock(p_product_id uuid, p_qty int)
returns void
language sql
security definer
as $$
  update products set stock = stock + p_qty where id = p_product_id;
$$;

-- ── Helper function: atomic stock decrement ───────────────────
-- Used by /api/webhook to avoid race condition on duplicate webhook events
create or replace function decrement_product_stock(p_product_id uuid, p_qty int)
returns void
language sql
security definer
as $$
  update products set stock = greatest(0, stock - p_qty) where id = p_product_id;
$$;

-- ── 13. reviews: enforce verified-purchase requirement server-side ─────────
drop policy if exists "reviews: own write" on reviews;

create policy "reviews: own write"
  on reviews for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from order_items oi
      join orders o on o.id = oi.order_id
      where oi.product_id::text = reviews.product_id::text
      and o.buyer_id = auth.uid()
      and o.status = 'paid'
    )
  );

-- ── 14. profiles: prevent self role-escalation ────────────────────────────
create or replace function prevent_role_self_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role then
    if auth.role() != 'service_role' then
      raise exception 'Role changes are not permitted directly. Contact an administrator.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_role_escalation on profiles;
create trigger trg_prevent_role_escalation
  before update on profiles
  for each row
  execute function prevent_role_self_escalation();

-- ── 15. suppliers: prevent self-verification ──────────────────────────────
create or replace function prevent_supplier_self_verify()
returns trigger as $$
begin
  if new.verified is distinct from old.verified then
    if auth.role() != 'service_role' then
      raise exception 'Verification status can only be changed by an administrator.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_supplier_self_verify on suppliers;
create trigger trg_prevent_supplier_self_verify
  before update on suppliers
  for each row
  execute function prevent_supplier_self_verify();

-- ── 16. orders: guard status transitions and immutable fields ─────────────
create or replace function guard_order_update()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.buyer_id is distinct from old.buyer_id
     or new.supplier_id is distinct from old.supplier_id
     or new.total_price is distinct from old.total_price
     or new.stripe_session_id is distinct from old.stripe_session_id then
    raise exception 'These order fields cannot be changed directly.';
  end if;

  if new.status = 'paid' and old.status is distinct from 'paid' then
    raise exception 'Order status can only be set to paid via payment confirmation.';
  end if;

  if auth.uid() = old.buyer_id and new.status is distinct from old.status then
    if not (old.status = 'pending' and new.status = 'cancelled') then
      raise exception 'Buyers may only cancel orders that are still pending.';
    end if;
  end if;

  if auth.uid() = (select user_id from suppliers where id = old.supplier_id)
     and new.status is distinct from old.status
     and new.status = 'pending' then
    raise exception 'Cannot revert an order back to pending.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_guard_order_update on orders;
create trigger trg_guard_order_update
  before update on orders
  for each row
  execute function guard_order_update();

-- ── 17. order_items: prevent price tampering and post-payment injection ───
drop policy if exists "order_items: buyer insert" on order_items;

create policy "order_items: buyer insert"
  on order_items for insert
  with check (
    auth.uid() = (select buyer_id from orders where id = order_items.order_id)
    and (select status from orders where id = order_items.order_id) = 'pending'
    and price_at_purchase = (select price from products where id = order_items.product_id)
  );

-- ── 18. conversations & messages: cleanup + hijack prevention ─────────────
drop policy if exists "conv_insert" on conversations;
drop policy if exists "conv_select" on conversations;
drop policy if exists "conversations: participants only" on conversations;
drop policy if exists "msg_insert" on messages;
drop policy if exists "msg_select" on messages;
drop policy if exists "messages: participants insert" on messages;
drop policy if exists "messages: participants read" on messages;

create policy "conversations: participants only"
  on conversations for all
  using (auth.uid() = buyer_id or auth.uid() = supplier_id)
  with check (auth.uid() = buyer_id or auth.uid() = supplier_id);

create policy "messages: participants read"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (auth.uid() = c.buyer_id or auth.uid() = c.supplier_id)
    )
  );

create policy "messages: participants insert"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (auth.uid() = c.buyer_id or auth.uid() = c.supplier_id)
    )
  );

create or replace function prevent_conversation_reassignment()
returns trigger as $$
begin
  if auth.role() != 'service_role' then
    if new.buyer_id is distinct from old.buyer_id or new.supplier_id is distinct from old.supplier_id then
      raise exception 'Conversation participants cannot be changed.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_conversation_reassignment on conversations;
create trigger trg_prevent_conversation_reassignment
  before update on conversations
  for each row
  execute function prevent_conversation_reassignment();

-- ── 19. storage.objects (product-images bucket): fix INSERT policy ───
drop policy if exists "Authenticated upload product images" on storage.objects;

create policy "Authenticated upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 20. products: DB-level CHECK constraints (defense in depth) ────
alter table products
  add constraint price_positive check (price > 0),
  add constraint stock_non_negative check (stock >= 0);
