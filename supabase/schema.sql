-- ============================================================
-- 📊 بصيرة CRM — هيكلية جداول قاعدة البيانات السحابية (SQL Schema)
-- ============================================================

-- 1. جدول الموظفين والصلاحيات
CREATE TABLE IF NOT EXISTS public.system_employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent',
    permissions TEXT[] NOT NULL DEFAULT '{send_messages}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول العملاء (دليل الهاتف وجهات الاتصال)
CREATE TABLE IF NOT EXISTS public.customers (
    customer_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    phone_2 TEXT,
    address TEXT,
    governorate TEXT,
    city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول الفواتير (الطلبات)
CREATE TABLE IF NOT EXISTS public.invoices (
    invoice_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES public.customers(customer_id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_phone_2 TEXT,
    customer_address TEXT,
    invoice_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    final_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'قيد الانتظار',
    notes TEXT,
    shipping_company TEXT,
    tracking_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. جدول تفاصيل وبنود الفواتير (المنتجات المطلوبة)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    product_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. جدول قنوات اتصال واتساب ومزودي الخدمة
CREATE TABLE IF NOT EXISTS public.whatsapp_providers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    api_key TEXT,
    api_url TEXT,
    phone_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. جدول إعدادات الطباعة وهوية الفواتير
CREATE TABLE IF NOT EXISTS public.print_settings (
    id SERIAL PRIMARY KEY,
    primary_color TEXT NOT NULL DEFAULT '#FF6632',
    text_color TEXT NOT NULL DEFAULT '#FFFFFF',
    show_logo BOOLEAN NOT NULL DEFAULT true,
    logo_url TEXT,
    company_name TEXT,
    company_phone TEXT,
    company_address TEXT,
    tax_number TEXT,
    terms_text TEXT,
    paper_size TEXT NOT NULL DEFAULT 'A4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 🔒 تفعيل الحماية لجميع الجداول (Row Level Security - RLS)
-- ============================================================
ALTER TABLE public.system_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 🔓 سياسات الوصول المؤمنة (Secure Access Policies using Context Signature)
-- ============================================================

-- دالة مساعدة للتحقق من هوية ومصدر الطلب القادم من تطبيق الديسكتوب
-- نستخدم ترويسة (Header) مخصصة 'x-basira-signature' تحتوي على رمز تحقق متفق عليه لمنع الوصول العشوائي للبيانات عبر الـ Anon Key
CREATE OR REPLACE FUNCTION public.is_authorized_client()
RETURNS BOOLEAN AS $$
BEGIN
  -- التحقق من وجود الترويسة المخصصة وصحة قيمتها لمنع استعلامات الـ REST API الخارجية غير المصرحة
  RETURN current_setting('request.headers', true)::jsonb->>'x-basira-signature' = 'basira-crm-secure-client-token-2024';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سياسات جدول الموظفين
CREATE POLICY "Secure client select" ON public.system_employees FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.system_employees FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.system_employees FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.system_employees FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول العملاء
CREATE POLICY "Secure client select" ON public.customers FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.customers FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.customers FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.customers FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول الفواتير
CREATE POLICY "Secure client select" ON public.invoices FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.invoices FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.invoices FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.invoices FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول بنود الفواتير
CREATE POLICY "Secure client select" ON public.invoice_items FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.invoice_items FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.invoice_items FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.invoice_items FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول مزودي الخدمة
CREATE POLICY "Secure client select" ON public.whatsapp_providers FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.whatsapp_providers FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.whatsapp_providers FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.whatsapp_providers FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول إعدادات الطباعة
CREATE POLICY "Secure client select" ON public.print_settings FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.print_settings FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.print_settings FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.print_settings FOR DELETE USING (public.is_authorized_client());
