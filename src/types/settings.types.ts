export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string; // يُستخدم في Main Process فقط
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // بصيغة whatsapp:+XXXXXXXXXXX
}

export interface WebhookConfig {
  port: number;
  secret: string;
  enabled: boolean;
}

export interface AppSettings {
  supabase: SupabaseConfig;
  twilio: TwilioConfig;
  webhook: WebhookConfig;
  lastUpdated?: string;
}

export interface ConnectionTestResult {
  service: 'supabase' | 'twilio' | 'webhook';
  status: 'idle' | 'testing' | 'success' | 'failed';
  message: string;
  latency?: number; // ms
  details?: Record<string, unknown>;
}
