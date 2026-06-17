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

export interface MetaConfig {
  accessToken: string;
  phoneNumberId: string;
  whatsappNumber: string;
  verifyToken: string;
}

export interface WebhookConfig {
  port: number;
  secret: string;
  enabled: boolean;
}

export interface Employee {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'supervisor' | 'agent';
  permissions: string[];
}

export interface PrintSettings {
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyLogo: string; // Base64 encoded image
  taxNumber: string;
  termsText: string;
  paperSize: 'A4' | 'A5' | 'Receipt';
  showLogo: boolean;
}

export interface AppSettings {
  supabase: SupabaseConfig;
  twilio: TwilioConfig;
  meta: MetaConfig;
  activeProvider: 'twilio' | 'meta';
  webhook: WebhookConfig;
  employees?: Employee[];
  quickReplies?: string[];
  activeEmployeeId?: string;
  lastUpdated?: string;
  printSettings?: PrintSettings;
}

export interface ConnectionTestResult {
  service: 'supabase' | 'twilio' | 'meta' | 'webhook';
  status: 'idle' | 'testing' | 'success' | 'failed';
  message: string;
  latency?: number; // ms
  details?: Record<string, unknown>;
}
