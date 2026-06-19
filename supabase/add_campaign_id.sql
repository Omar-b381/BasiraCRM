-- SQL script to upgrade notifications_log in Supabase
-- Run this in your Supabase SQL Editor:

ALTER TABLE public.notifications_log 
ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES public.campaigns(id) ON DELETE SET NULL;
