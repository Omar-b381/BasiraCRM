-- ============================================================
-- 📊 بصيرة CRM — هيكلية جداول قاعدة البيانات السحابية (SQL Schema)
-- ============================================================

-- 1. جدول تعريف المنتجات الأساسية
CREATE TABLE IF NOT EXISTS public.product_definitions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. جدول متغيرات المنتجات (تفاصيل الحجم/اللون والأسعار)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id SERIAL PRIMARY KEY,
    product_name TEXT REFERENCES public.product_definitions(name) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    price NUMERIC(15,2) NOT NULL DEFAULT 0, -- سعر البيع للعميل
    cost_price NUMERIC(15,2) NOT NULL DEFAULT 0, -- تكلفة الشراء
    sku TEXT UNIQUE, -- رمز الباركود أو كود التخزين
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_name, variant_name)
);

-- 3. جدول الموظفين والصلاحيات
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
    sub_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    shipping_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
    final_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'قيد الانتظار',
    notes TEXT,
    shipping_company TEXT,
    tracking_number TEXT,
    refund_amount NUMERIC(15,2) DEFAULT 0,
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. جدول تفاصيل وبنود الفواتير (المنتجات المطلوبة)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES public.invoices(invoice_id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    sub_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    details TEXT,
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
-- 🛠️ تعديل الجداول الحالية وإضافة حقول الكتالوج والمخزون
-- ============================================================
ALTER TABLE public.product_definitions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.product_definitions ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 📊 جداول موديولات الـ CRM الأساسية الجديدة
-- ============================================================

-- 7. جدول مراحل مسار الصفقات (Sales Pipeline Stages)
CREATE TABLE IF NOT EXISTS public.deal_stages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- اسم المرحلة (عميل محتمل، تفاوض، عرض سعر، ...)
    color TEXT NOT NULL DEFAULT '#6366f1',
    position INTEGER NOT NULL DEFAULT 0, -- ترتيب المرحلة في الـ Kanban
    is_won BOOLEAN NOT NULL DEFAULT false,
    is_lost BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. جدول مصادر العملاء المحتملين (Lead Sources)
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- فيسبوك، إنستغرام، واتساب، إحالة، موقع إلكتروني...
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. جدول العملاء المحتملين (Leads)
CREATE TABLE IF NOT EXISTS public.leads (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    company TEXT,
    source_id INTEGER REFERENCES public.lead_sources(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'جديد'
        CHECK (status IN ('جديد', 'تم التواصل', 'مهتم', 'مؤهل', 'تم التحويل', 'غير مهتم', 'ضائع')),
    temperature TEXT NOT NULL DEFAULT 'بارد'
        CHECK (temperature IN ('ساخن', 'دافئ', 'بارد')),
    assigned_to TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    notes TEXT,
    converted_customer_id INTEGER REFERENCES public.customers(customer_id) ON DELETE SET NULL,
    converted_deal_id INTEGER, -- سيتم ربطه كـ FK لاحقاً لتجنب التعارض الدائري
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. جدول الصفقات (Deals / Opportunities)
CREATE TABLE IF NOT EXISTS public.deals (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    customer_id INTEGER REFERENCES public.customers(customer_id) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
    stage_id INTEGER NOT NULL REFERENCES public.deal_stages(id) ON DELETE RESTRICT,
    value NUMERIC(15,2) NOT NULL DEFAULT 0, -- قيمة الصفقة
    currency TEXT NOT NULL DEFAULT 'EGP',
    probability INTEGER NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    assigned_to TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    notes TEXT,
    won_at TIMESTAMP WITH TIME ZONE,
    lost_at TIMESTAMP WITH TIME ZONE,
    lost_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ربط converted_deal_id في جدول leads بجدول deals بعد إنشائهما
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_converted_deal FOREIGN KEY (converted_deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;

-- 11. جدول المهام والمتابعات (Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'متابعة'
        CHECK (type IN ('مكالمة', 'اجتماع', 'متابعة', 'بريد', 'واتساب', 'أخرى')),
    priority TEXT NOT NULL DEFAULT 'متوسطة'
        CHECK (priority IN ('عاجلة', 'عالية', 'متوسطة', 'منخفضة')),
    status TEXT NOT NULL DEFAULT 'معلقة'
        CHECK (status IN ('معلقة', 'قيد التنفيذ', 'مكتملة', 'ملغاة')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    customer_id INTEGER REFERENCES public.customers(customer_id) ON DELETE SET NULL,
    deal_id INTEGER REFERENCES public.deals(id) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
    assigned_to TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. جدول سجل الأنشطة (Activity Log)
CREATE TABLE IF NOT EXISTS public.activity_log (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('deal', 'lead', 'customer', 'task', 'invoice')),
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- مثال: 'created', 'status_changed', 'stage_moved', 'note_added'
    details JSONB DEFAULT '{}'::jsonb, -- تفاصيل التغيير
    performed_by TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. جدول الإشعارات الداخلية (Notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES public.system_employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT NOT NULL DEFAULT 'info'
        CHECK (type IN ('info', 'warning', 'success', 'error', 'reminder')),
    entity_type TEXT, -- 'deal', 'lead', 'task', 'invoice'
    entity_id INTEGER, -- رقم الكيان المرتبط
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 🔒 تفعيل الحماية لجميع الجداول (Row Level Security - RLS)
-- ============================================================
ALTER TABLE public.product_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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

-- سياسات جدول المنتجات الأساسية
CREATE POLICY "Secure client select" ON public.product_definitions FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.product_definitions FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.product_definitions FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.product_definitions FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول متغيرات المنتجات
CREATE POLICY "Secure client select" ON public.product_variants FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.product_variants FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.product_variants FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.product_variants FOR DELETE USING (public.is_authorized_client());

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

-- سياسات جدول مراحل الصفقات
CREATE POLICY "Secure client select" ON public.deal_stages FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.deal_stages FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.deal_stages FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.deal_stages FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول مصادر العملاء
CREATE POLICY "Secure client select" ON public.lead_sources FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.lead_sources FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.lead_sources FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.lead_sources FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول العملاء المحتملين
CREATE POLICY "Secure client select" ON public.leads FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.leads FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.leads FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.leads FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول الصفقات
CREATE POLICY "Secure client select" ON public.deals FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.deals FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.deals FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.deals FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول المهام
CREATE POLICY "Secure client select" ON public.tasks FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.tasks FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.tasks FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.tasks FOR DELETE USING (public.is_authorized_client());

-- سياسات سجل الأنشطة
CREATE POLICY "Secure client select" ON public.activity_log FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.activity_log FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.activity_log FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.activity_log FOR DELETE USING (public.is_authorized_client());

-- سياسات جدول الإشعارات
CREATE POLICY "Secure client select" ON public.notifications FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.notifications FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.notifications FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.notifications FOR DELETE USING (public.is_authorized_client());

-- ============================================================
-- 🌱 البيانات الأولية والافتراضية (Default Seed Data)
-- ============================================================

INSERT INTO public.deal_stages (name, color, position, is_won, is_lost) VALUES
    ('عميل محتمل', '#8b5cf6', 0, false, false),
    ('تواصل أولي', '#6366f1', 1, false, false),
    ('عرض سعر', '#3b82f6', 2, false, false),
    ('تفاوض', '#f59e0b', 3, false, false),
    ('تم الكسب ✅', '#22c55e', 4, true, false),
    ('خسارة ❌', '#ef4444', 5, false, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.lead_sources (name, color) VALUES
    ('فيسبوك', '#1877F2'),
    ('إنستغرام', '#E4405F'),
    ('واتساب', '#25D366'),
    ('إحالة عميل', '#f59e0b'),
    ('موقع إلكتروني', '#6366f1'),
    ('أخرى', '#6b7280')
ON CONFLICT (name) DO NOTHING;
