-- SQL setup script for Smart Tasks & Reminders in Supabase
-- Run this in your Supabase SQL Editor:

-- 1. Create the verification helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_authorized_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('request.headers', true)::jsonb->>'x-basira-signature' = 'basira-crm-secure-client-token-2024';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the tasks table
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
    customer_id TEXT REFERENCES public.customers(customer_id) ON DELETE SET NULL,
    deal_id INTEGER,
    lead_id INTEGER,
    assigned_to TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES public.system_employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reminder_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then create secure client policies
DROP POLICY IF EXISTS "Secure client select" ON public.tasks;
DROP POLICY IF EXISTS "Secure client insert" ON public.tasks;
DROP POLICY IF EXISTS "Secure client update" ON public.tasks;
DROP POLICY IF EXISTS "Secure client delete" ON public.tasks;

CREATE POLICY "Secure client select" ON public.tasks FOR SELECT USING (public.is_authorized_client());
CREATE POLICY "Secure client insert" ON public.tasks FOR INSERT WITH CHECK (public.is_authorized_client());
CREATE POLICY "Secure client update" ON public.tasks FOR UPDATE USING (public.is_authorized_client());
CREATE POLICY "Secure client delete" ON public.tasks FOR DELETE USING (public.is_authorized_client());
