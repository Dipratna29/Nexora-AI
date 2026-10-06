-- TrustTrip Razorpay Payment Integration Migration
-- Migration 002: Add payment tracking, idempotency, refund, and webhook columns safely

-- 1. Extend razorpay_payments table if columns are missing
ALTER TABLE public.razorpay_payments 
    ADD COLUMN IF NOT EXISTS equipment_order_id BIGINT,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS webhook_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS refund_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS amount_refunded_paise BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 2. Extend equipment_orders table with Razorpay payment references
ALTER TABLE public.equipment_orders 
    ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.razorpay_payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.razorpay_payments (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.razorpay_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.razorpay_payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.razorpay_payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order ON public.equipment_orders (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.equipment_orders (user_id, created_at DESC);

-- 4. Row Level Security Policies
ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_orders ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- razorpay_payments service_role policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_razorpay_payments' AND tablename = 'razorpay_payments') THEN
        CREATE POLICY service_role_all_razorpay_payments ON public.razorpay_payments FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- users read their own razorpay_payments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_payments' AND tablename = 'razorpay_payments') THEN
        CREATE POLICY users_read_own_payments ON public.razorpay_payments FOR SELECT TO authenticated USING (
            user_id IN (SELECT user_id FROM public.users WHERE username = auth.email() OR username = (auth.jwt()->>'sub'))
        );
    END IF;

    -- equipment_orders service_role policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_equipment_orders' AND tablename = 'equipment_orders') THEN
        CREATE POLICY service_role_all_equipment_orders ON public.equipment_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- users read their own equipment_orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_read_own_orders' AND tablename = 'equipment_orders') THEN
        CREATE POLICY users_read_own_orders ON public.equipment_orders FOR SELECT TO authenticated USING (
            user_id IN (SELECT user_id FROM public.users WHERE username = auth.email() OR username = (auth.jwt()->>'sub'))
        );
    END IF;
END $$;
