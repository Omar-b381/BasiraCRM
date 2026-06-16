<USER_REQUEST>
# 🤖 AI AGENT PROMPT — Arabic CRM Desktop App (Phase 1)
## نظام إدارة علاقات العملاء العربي — المرحلة الأولى

---

## ⚠️ CRITICAL SAFETY RULES — قواعد السلامة الحرجة (اقرأها أولاً ولا تتجاوزها)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  🚨 ABSOLUTE PROHIBITIONS — محظورات مطلقة لا استثناء لها                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  1. ❌ لا تُنشئ أي جداول جديدة في Supabase تحت أي ظرف                     ║
║  2. ❌ لا تُعدّل هيكل (Schema) أي جدول موجود — لا ALTER TABLE               ║
║  3. ❌ لا تحذف أي جداول أو بيانات — لا DROP — لا TRUNCATE — لا DELETE       ║
║  4. ❌ لا تُضف أو تحذف أي Indexes أو Constraints أو Foreign Keys           ║
║  5. ❌ لا تُعدّل أي RLS Policies أو Roles أو Permissions في Supabase       ║
║  6. ❌ لا تُنشئ أي Database Functions أو Triggers أو Views                 ║
║  7. ❌ لا تستخدم Supabase Service Role Key إلا في السياق المحدد أدناه      ║
║  8. ❌ لا تُخزّن أي API Keys أو Secrets في كود الواجهة الأمامية مباشرةً    ║
║  9. ❌ لا تتجاوز القراءة من الجداول الموجودة إلا بعد عرضها على المستخدم    ║
║  10.❌ لا تُجري أي migration أو seed أو reset على قاعدة البيانات           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ✅ المسموح به الوحيد في قاعدة البيانات:                                    ║
║     • SELECT (قراءة فقط من الجداول الموجودة)                                ║
║     • INSERT في جداول CRM التي ينشئها المستخدم يدوياً خارج هذا الكود       ║
║     • UPDATE للبيانات فقط (وليس للهيكل) في جداول CRM المحددة               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📋 MISSION BRIEF — مهمة المشروع

أنت AI Agent متخصص في بناء تطبيقات Desktop احترافية. مهمتك بناء **المرحلة الأولى** من نظام CRM عربي متكامل باستخدام:

- **Electron.js** — تطبيق Desktop
- **React 18 + TypeScript** — واجهة المستخدم
- **Tailwind CSS** — التصميم (RTL عربي)
- **Supabase** — قاعدة البيانات السحابية (قراءة وكتابة محدودة فقط)
- **Twilio WhatsApp API** — إرسال واستقبال رسائل WhatsApp
- **Docker** — containerization لبيئة التطوير
- **Vite** — bundler للواجهة

**اللغة الأساسية:** العربية (RTL) مع دعم ثانوي للإنجليزية

---

## 🏗️ PROJECT STRUCTURE — هيكل المشروع الكامل

```
arabic-crm/
├── docker-compose.yml
├── Dockerfile.dev
├── .env.example                    ← نموذج متغيرات البيئة (بدون قيم حقيقية)
├── .env                            ← لا تُنشئه — يوفره المستخدم
├── .gitignore
├── package.json
├── electron/
│   ├── main.ts                     ← Electron Main Process
│   ├── preload.ts                  ← Preload Script (IPC Bridge)
│   └── ipc/
│       ├── whatsapp.ipc.ts         ← WhatsApp IPC handlers
│       ├── supabase.ipc.ts         ← Supabase IPC handlers
│       └── settings.ipc.ts        ← Settings IPC handlers
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                   ← Tailwind + RTL base styles
│   ├── lib/
│   │   ├── supabase.ts             ← Supabase client (anon key only)
│   │   ├── twilio.ts               ← Twilio REST client wrapper
│   │   └── rfm.ts                  ← RFM Analysis engine
│   ├── store/
│   │   ├── useSettingsStore.ts     ← Zustand — API settings
│   │   ├── useContactsStore.ts     ← Zustand — contacts/leads
│   │   └── useMessagesStore.ts     ← Zustand — WhatsApp messages
│   ├── hooks/
│   │   ├── useWhatsApp.ts
│   │   ├── useRFM.ts
│   │   └── useConnectionTest.ts
│   ├── pages/
│   │   ├── Dashboard.tsx           ← لوحة التحكم الرئيسية
│   │   ├── Contacts.tsx            ← إدارة جهات الاتصال
│   │   ├── WhatsApp.tsx            ← واجهة المحادثات
│   │   ├── RFMAnalysis.tsx         ← تحليل RFM
│   │   └── Settings.tsx            ← إعدادات APIs ← PRIORITY PAGE
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── Layout.tsx
│   │   ├── whatsapp/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── MessageComposer.tsx
│   │   ├── rfm/
│   │   │   ├── RFMMatrix.tsx
│   │   │   ├── RFMSegmentCard.tsx
│   │   │   └── RFMChart.tsx
│   │   ├── contacts/
│   │   │   ├── ContactCard.tsx
│   │   │   ├── ContactForm.tsx
│   │   │   └── ContactTable.tsx
│   │   ├── settings/
│   │   │   ├── SupabaseSettings.tsx
│   │   │   ├── TwilioSettings.tsx
│   │   │   ├── WhatsAppSettings.tsx
│   │   │   └── ConnectionTestCard.tsx  ← فحص الاتصال
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Badge.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── StatusIndicator.tsx
│   └── types/
│       ├── contact.types.ts
│       ├── message.types.ts
│       ├── rfm.types.ts
│       └── settings.types.ts
├── electron-builder.yml
└── vite.config.ts
```

---

## 📁 FILE 1: docker-compose.yml

```yaml
version: '3.9'

services:
  crm-app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: arabic-crm-dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5173:5173"    # Vite dev server
      - "3001:3001"    # Webhook receiver للـ WhatsApp
    env_file:
      - .env
    environment:
      - NODE_ENV=development
      - DISPLAY=${DISPLAY:-:0}
    network_mode: host
    restart: unless-stopped

  webhook-receiver:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: arabic-crm-webhook
    command: npx ts-node electron/webhook-server.ts
    ports:
      - "3001:3001"
    env_file:
      - .env
    restart: unless-stopped
```

---

## 📁 FILE 2: Dockerfile.dev

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173 3001

CMD ["npm", "run", "dev"]
```

---

## 📁 FILE 3: .env.example — نموذج متغيرات البيئة

```env
# ═══════════════════════════════════════════════════
# SUPABASE — قاعدة البيانات السحابية
# ═══════════════════════════════════════════════════
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ Service Role Key — للاستخدام في Main Process فقط — لا تضعه في VITE_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ═══════════════════════════════════════════════════
# TWILIO — WhatsApp Business API
# ═══════════════════════════════════════════════════
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# ═══════════════════════════════════════════════════
# WEBHOOK — استقبال رسائل WhatsApp
# ═══════════════════════════════════════════════════
WEBHOOK_PORT=3001
WEBHOOK_SECRET=your_webhook_secret_here

# ═══════════════════════════════════════════════════
# APP CONFIG
# ═══════════════════════════════════════════════════
NODE_ENV=development
APP_NAME=بصيرة CRM
APP_VERSION=1.0.0
```

---

## 📁 FILE 4: package.json

```json
{
  "name": "arabic-crm",
  "version": "1.0.0",
  "description": "نظام CRM عربي متكامل",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build && electron-builder",
    "preview": "vite preview",
    "electron:dev": "electron ."
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "twilio": "^4.23.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.364.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.4.0",
    "express": "^4.18.0",
    "body-parser": "^1.20.0",
    "electron-store": "^8.1.0",
    "dayjs": "^1.11.10"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "electron": "^30.0.0",
    "electron-builder": "^24.9.0",
    "vite-plugin-electron": "^0.28.0",
    "concurrently": "^8.2.0",
    "wait-on": "^7.2.0",
    "@types/twilio": "^3.19.0"
  }
}
```

---

## 📁 FILE 5: src/types/settings.types.ts

```typescript
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
```

---

## 📁 FILE 6: src/types/contact.types.ts

```typescript
export type RFMSegment =
  | 'champions'        // أبطال
  | 'loyal'            // مخلصون
  | 'potential_loyal'  // محتملو الولاء
  | 'new_customers'    // عملاء جدد
  | 'promising'        // واعدون
  | 'need_attention'   // يحتاجون اهتمام
  | 'about_to_sleep'   // على وشك النوم
  | 'at_risk'          // في خطر
  | 'cannot_lose'      // لا يمكن خسارتهم
  | 'hibernating'      // سابتون
  | 'lost'             // مفقودون

export interface RFMScore {
  recency: number;    // 1-5
  frequency: number;  // 1-5
  monetary: number;   // 1-5
  total: number;      // 3-15
  segment: RFMSegment;
}

export interface Contact {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;       // بصيغة +20XXXXXXXXXX
  whatsapp?: string;   // بصيغة whatsapp:+20XXXXXXXXXX
  email?: string;
  company?: string;
  tags: string[];
  notes?: string;
  lastPurchaseDate?: string;
  purchaseCount: number;
  totalSpend: number;
  rfmScore?: RFMScore;
  createdAt: string;
  updatedAt: string;
  supabaseId?: string; // ID من قاعدة البيانات الموجودة
}
```

---

## 📁 FILE 7: src/types/message.types.ts

```typescript
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageDirection = 'inbound' | 'outbound';

export interface WhatsAppMessage {
  id: string;
  twilioSid?: string;
  contactId: string;
  contactPhone: string;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  mediaUrl?: string;
  timestamp: string;
  readAt?: string;
}

export interface Conversation {
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessage?: WhatsAppMessage;
  unreadCount: number;
  messages: WhatsAppMessage[];
  lastActivity: string;
}
```

---

## 📁 FILE 8: src/types/rfm.types.ts

```typescript
export interface RFMSegmentInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  color: string;
  bgColor: string;
  recommendedAction: string;
  whatsappTemplate?: string;
}

export const RFM_SEGMENTS_CONFIG: Record<string, RFMSegmentInfo> = {
  champions: {
    id: 'champions',
    nameAr: 'الأبطال',
    nameEn: 'Champions',
    description: 'اشتروا مؤخراً، يشترون كثيراً، وينفقون أكثر',
    color: '#10B981',
    bgColor: '#D1FAE5',
    recommendedAction: 'كافئهم، اطلب مراجعاتهم، أشركهم في المنتجات الجديدة',
    whatsappTemplate: 'مرحباً {name}! أنت من أبطالنا المميزين 🏆 هدية خاصة لك...'
  },
  loyal: {
    id: 'loyal',
    nameAr: 'المخلصون',
    nameEn: 'Loyal Customers',
    description: 'ينفقون جيداً ويستجيبون للعروض',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    recommendedAction: 'اعرض برامج ولاء، اطلب منهم الترقية لمستوى أعلى',
    whatsappTemplate: 'أهلاً {name}! بعد كل مشترياتك معنا، لديك عرض حصري...'
  },
  at_risk: {
    id: 'at_risk',
    nameAr: 'في خطر',
    nameEn: 'At Risk',
    description: 'اشتروا كثيراً لكن منذ فترة — يحتاجون إعادة تفعيل',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    recommendedAction: 'تواصل معهم فوراً بعروض شخصية، افهم سبب غيابهم',
    whatsappTemplate: 'اشتقنالك يا {name}! مرت {days} أيام ولم نراك...'
  },
  lost: {
    id: 'lost',
    nameAr: 'المفقودون',
    nameEn: 'Lost',
    description: 'أقل تكرار وأقل إنفاق ومرت فترة طويلة',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    recommendedAction: 'أعد إحياءهم بعروض قوية جداً أو تجاهلهم',
    whatsappTemplate: 'نفتقدك {name}! عرض استثنائي 50% خصم لعودتك...'
  },
  cannot_lose: {
    id: 'cannot_lose',
    nameAr: 'لا يمكن خسارتهم',
    nameEn: 'Cannot Lose Them',
    description: 'اشتروا كثيراً لكن لم يعودوا — قيمة عالية جداً',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    recommendedAction: 'تواصل شخصياً، قدم عروض VIP، استفسر عن سبب التوقف',
    whatsappTemplate: 'أنت من أهم عملائنا {name}، نريد أن نعرف كيف نخدمك أفضل...'
  }
};
```

---

## 📁 FILE 9: electron/main.ts

```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { setupWhatsAppIPC } from './ipc/whatsapp.ipc';
import { setupSupabaseIPC } from './ipc/supabase.ipc';
import { setupSettingsIPC } from './ipc/settings.ipc';

// ⚠️ المتجر المحلي للإعدادات — لا يصل إلى Supabase مباشرة
const store = new Store({
  name: 'arabic-crm-settings',
  encryptionKey: 'arabic-crm-secure-key-2024',
});

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, // ⚠️ أمان — لا تفعّل هذا
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0F172A',
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    title: 'بصيرة CRM',
  });

  // RTL support
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript(`
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    `);
  });

  if (process.env.NODE_ENV === 'development') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // فتح روابط خارجية في المتصفح الافتراضي
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  // تسجيل IPC handlers
  setupSettingsIPC(store);
  setupWhatsAppIPC(store);
  setupSupabaseIPC(store); // قراءة فقط

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export { store };
```

---

## 📁 FILE 10: electron/preload.ts

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// ⚠️ Bridge آمن بين Renderer و Main Process
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  },

  // Connection Tests
  testConnection: {
    supabase: (config: unknown) => ipcRenderer.invoke('test:supabase', config),
    twilio: (config: unknown) => ipcRenderer.invoke('test:twilio', config),
    webhook: () => ipcRenderer.invoke('test:webhook'),
  },

  // WhatsApp
  whatsapp: {
    send: (to: string, body: string) => ipcRenderer.invoke('whatsapp:send', { to, body }),
    getConversations: () => ipcRenderer.invoke('whatsapp:getConversations'),
    getMessages: (contactPhone: string) => ipcRenderer.invoke('whatsapp:getMessages', contactPhone),
    onMessage: (callback: (msg: unknown) => void) => {
      ipcRenderer.on('whatsapp:incoming', (_, msg) => callback(msg));
    },
  },

  // Supabase (READ ONLY from renderer — limited to safe queries)
  db: {
    getContacts: (filters?: unknown) => ipcRenderer.invoke('db:getContacts', filters),
    getContactById: (id: string) => ipcRenderer.invoke('db:getContactById', id),
    getRFMData: (dateRange?: unknown) => ipcRenderer.invoke('db:getRFMData', dateRange),
  },
});
```

---

## 📁 FILE 11: electron/ipc/settings.ipc.ts

```typescript
import { ipcMain } from 'electron';
import type Store from 'electron-store';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';

export function setupSettingsIPC(store: Store) {
  // استرجاع الإعدادات المحفوظة
  ipcMain.handle('settings:get', async () => {
    return store.get('apiSettings', {
      supabase: { url: '', anonKey: '', serviceRoleKey: '' },
      twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
      webhook: { port: 3001, secret: '', enabled: false },
    });
  });

  // حفظ الإعدادات (محلياً — مشفرة)
  ipcMain.handle('settings:save', async (_, settings) => {
    // ⚠️ التحقق — لا نحفظ بيانات فارغة
    if (!settings || typeof settings !== 'object') {
      return { success: false, error: 'بيانات غير صالحة' };
    }
    store.set('apiSettings', settings);
    return { success: true, message: 'تم حفظ الإعدادات بنجاح' };
  });

  // ═══════════════════════════════════════════
  // فحص اتصال Supabase
  // ═══════════════════════════════════════════
  ipcMain.handle('test:supabase', async (_, config) => {
    const start = Date.now();
    try {
      if (!config?.url || !config?.anonKey) {
        return {
          status: 'failed',
          message: 'يرجى إدخال URL و Anon Key أولاً',
          latency: 0
        };
      }

      const client = createClient(config.url, config.anonKey);

      // ✅ اختبار آمن — فقط SELECT بدون تعديل
      const { error } = await client
        .from('_test_connection_dummy_')
        .select('count')
        .limit(1);

      const latency = Date.now() - start;

      // حتى لو الجدول غير موجود، الاتصال نجح
      if (error?.code === '42P01' || !error) {
        return {
          status: 'success',
          message: `✅ الاتصال بـ Supabase ناجح`,
          latency,
          projectUrl: config.url
        };
      }

      if (error?.code === 'PGRST116') {
        return {
          status: 'success',
          message: `✅ الاتصال ناجح (${latency}ms)`,
          latency
        };
      }

      return {
        status: 'failed',
        message: `❌ فشل الاتصال: ${error.message}`,
        latency
      };

    } catch (err: unknown) {
      return {
        status: 'failed',
        message: `❌ خطأ في الشبكة: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`,
        latency: Date.now() - start
      };
    }
  });

  // ═══════════════════════════════════════════
  // فحص اتصال Twilio
  // ═══════════════════════════════════════════
  ipcMain.handle('test:twilio', async (_, config) => {
    const start = Date.now();
    try {
      if (!config?.accountSid || !config?.authToken) {
        return {
          status: 'failed',
          message: 'يرجى إدخال Account SID و Auth Token',
          latency: 0
        };
      }

      const client = Twilio(config.accountSid, config.authToken);

      // اختبار بجلب معلومات الحساب
      const account = await client.api.accounts(config.accountSid).fetch();
      const latency = Date.now() - start;

      return {
        status: 'success',
        message: `✅ اتصال Twilio ناجح`,
        latency,
        accountName: account.friendlyName,
        accountStatus: account.status
      };

    } catch (err: unknown) {
      const latency = Date.now() - start;
      const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';

      if (errMsg.includes('Authentication')) {
        return {
          status: 'failed',
          message: '❌ بيانات Twilio غير صحيحة',
          latency
        };
      }

      return {
        status: 'failed',
        message: `❌ فشل الاتصال: ${errMsg}`,
        latency
      };
    }
  });

  // ═══════════════════════════════════════════
  // فحص Webhook Server
  // ═══════════════════════════════════════════
  ipcMain.handle('test:webhook', async () => {
    const start = Date.now();
    try {
      const settings = store.get('apiSettings') as { webhook?: { port: number } };
      const port = settings?.webhook?.port || 3001;

      const response = await fetch(`http://localhost:${port}/health`);
      const latency = Date.now() - start;

      if (response.ok) {
        return {
          status: 'success',
          message: `✅ Webhook Server يعمل على المنفذ ${port}`,
          latency
        };
      }

      return {
        status: 'failed',
        message: `❌ Webhook Server لا يستجيب`,
        latency
      };
    } catch {
      return {
        status: 'failed',
        message: '❌ Webhook Server غير مشغّل — ابدأ Docker أولاً',
        latency: Date.now() - start
      };
    }
  });
}
```

---

## 📁 FILE 12: electron/ipc/whatsapp.ipc.ts

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import Twilio from 'twilio';
import type Store from 'electron-store';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

export function setupWhatsAppIPC(store: Store) {
  const getClient = () => {
    const settings = store.get('apiSettings') as { twilio?: TwilioConfig };
    const twilio = settings?.twilio;

    if (!twilio?.accountSid || !twilio?.authToken) {
      throw new Error('إعدادات Twilio غير مكتملة — اذهب إلى الإعدادات');
    }

    return {
      client: Twilio(twilio.accountSid, twilio.authToken),
      fromNumber: twilio.whatsappNumber || 'whatsapp:+14155238886',
    };
  };

  // إرسال رسالة WhatsApp
  ipcMain.handle('whatsapp:send', async (_, { to, body }) => {
    try {
      const { client, fromNumber } = getClient();

      // تأكد من صيغة الرقم
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const message = await client.messages.create({
        from: fromNumber,
        to: toNumber,
        body,
      });

      return {
        success: true,
        sid: message.sid,
        status: message.status,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل إرسال الرسالة',
      };
    }
  });

  // جلب المحادثات من Twilio
  ipcMain.handle('whatsapp:getConversations', async () => {
    try {
      const { client, fromNumber } = getClient();

      const messages = await client.messages.list({
        from: fromNumber,
        limit: 100,
      });

      // تجميع المحادثات حسب الرقم
      const conversations = new Map<string, unknown[]>();

      for (const msg of messages) {
        const phone = msg.direction === 'outbound-api' ? msg.to : msg.from;
        if (!conversations.has(phone)) {
          conversations.set(phone, []);
        }
        conversations.get(phone)?.push({
          id: msg.sid,
          twilioSid: msg.sid,
          direction: msg.direction === 'outbound-api' ? 'outbound' : 'inbound',
          body: msg.body,
          status: msg.status,
          timestamp: msg.dateCreated?.toISOString(),
          contactPhone: phone,
        });
      }

      return {
        success: true,
        conversations: Array.from(conversations.entries()).map(([phone, msgs]) => ({
          contactPhone: phone,
          messages: msgs,
          lastActivity: (msgs[0] as { timestamp: string })?.timestamp,
          unreadCount: (msgs as { direction: string }[]).filter((m) => m.direction === 'inbound').length,
        })),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب المحادثات',
      };
    }
  });

  // استقبال رسالة واردة (من Webhook Server عبر IPC)
  ipcMain.on('whatsapp:forward-incoming', (_, message) => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('whatsapp:incoming', message);
    }
  });
}
```

---

## 📁 FILE 13: electron/ipc/supabase.ipc.ts

```typescript
import { ipcMain } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type Store from 'electron-store';

// ╔══════════════════════════════════════════════════════════════╗
// ║  ⚠️ READ-ONLY IPC HANDLER                                    ║
// ║  هذا الملف يحتوي على عمليات SELECT فقط                      ║
// ║  ❌ لا INSERT ❌ لا UPDATE ❌ لا DELETE ❌ لا DDL              ║
// ╚══════════════════════════════════════════════════════════════╝

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;

export function setupSupabaseIPC(store: Store) {
  const getClient = (): SupabaseClient => {
    const settings = store.get('apiSettings') as { supabase?: SupabaseConfig };
    const config = settings?.supabase;

    if (!config?.url || !config?.anonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }

    // إعادة استخدام Client إذا لم تتغير الإعدادات
    if (!cachedClient) {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: { persistSession: false },
        global: {
          headers: {
            'X-Client-Info': 'arabic-crm/1.0.0',
          },
        },
      });
    }

    return cachedClient;
  };

  // ✅ جلب جهات الاتصال (SELECT فقط)
  ipcMain.handle('db:getContacts', async (_, filters) => {
    try {
      const client = getClient();

      // ⚠️ تعديل اسم الجدول حسب schema الخاص بك
      let query = client
        .from('contacts') // ← غيّر هذا للجدول الصحيح
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب جهات الاتصال',
        data: []
      };
    }
  });

  // ✅ جلب بيانات RFM للتحليل (SELECT فقط)
  ipcMain.handle('db:getRFMData', async (_, dateRange) => {
    try {
      const client = getClient();

      const fromDate = dateRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = dateRange?.to || new Date().toISOString();

      // ⚠️ تعديل اسم الجدول حسب schema الخاص بك
      const { data, error } = await client
        .from('orders') // ← غيّر هذا للجدول الصحيح
        .select(`
          customer_id,
          created_at,
          total_amount,
          contacts (
            id,
            name,
            phone
          )
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب بيانات RFM',
        data: []
      };
    }
  });
}
```

---

## 📁 FILE 14: src/lib/rfm.ts — RFM Analysis Engine

```typescript
import type { Contact, RFMScore, RFMSegment } from '../types/contact.types';

interface OrderRecord {
  customer_id: string;
  created_at: string;
  total_amount: number;
}

interface CustomerMetrics {
  customerId: string;
  recencyDays: number;      // أيام منذ آخر شراء
  frequency: number;        // عدد الطلبات
  monetary: number;         // إجمالي الإنفاق
}

// ═══════════════════════════════════════════════════
// الخطوة 1: حساب مقاييس RFM الخام
// ═══════════════════════════════════════════════════
export function calculateRawMetrics(orders: OrderRecord[]): Map<string, CustomerMetrics> {
  const metricsMap = new Map<string, CustomerMetrics>();
  const now = Date.now();

  for (const order of orders) {
    const existing = metricsMap.get(order.customer_id);
    const orderDate = new Date(order.created_at).getTime();
    const daysSince = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));

    if (!existing) {
      metricsMap.set(order.customer_id, {
        customerId: order.customer_id,
        recencyDays: daysSince,
        frequency: 1,
        monetary: order.total_amount || 0,
      });
    } else {
      metricsMap.set(order.customer_id, {
        ...existing,
        recencyDays: Math.min(existing.recencyDays, daysSince),
        frequency: existing.frequency + 1,
        monetary: existing.monetary + (order.total_amount || 0),
      });
    }
  }

  return metricsMap;
}

// ═══════════════════════════════════════════════════
// الخطوة 2: تحويل المقاييس لدرجات 1-5
// ═══════════════════════════════════════════════════
export function scoreMetrics(metricsMap: Map<string, CustomerMetrics>): Map<string, RFMScore> {
  const allMetrics = Array.from(metricsMap.values());

  const recencies = allMetrics.map((m) => m.recencyDays).sort((a, b) => a - b);
  const frequencies = allMetrics.map((m) => m.frequency).sort((a, b) => a - b);
  const monetaries = allMetrics.map((m) => m.monetary).sort((a, b) => a - b);

  const getQuintile = (value: number, sorted: number[], reverse = false): number => {
    const idx = sorted.findIndex((v) => v >= value);
    const percentile = idx === -1 ? 100 : (idx / sorted.length) * 100;
    const score = Math.ceil(percentile / 20) || 1;
    return reverse ? 6 - score : score;
  };

  const scoreMap = new Map<string, RFMScore>();

  for (const [id, metrics] of metricsMap) {
    // Recency: أقل أيام = أفضل (عكسي)
    const r = getQuintile(metrics.recencyDays, recencies, true);
    // Frequency: أكثر طلبات = أفضل (عادي)
    const f = getQuintile(metrics.frequency, frequencies, false);
    // Monetary: أكثر إنفاق = أفضل (عادي)
    const m = getQuintile(metrics.monetary, monetaries, false);

    const total = r + f + m;
    const segment = classifySegment(r, f, m);

    scoreMap.set(id, { recency: r, frequency: f, monetary: m, total, segment });
  }

  return scoreMap;
}

// ═══════════════════════════════════════════════════
// الخطوة 3: تصنيف الشرائح
// ═══════════════════════════════════════════════════
export function classifySegment(r: number, f: number, m: number): RFMSegment {
  if (r >= 4 && f >= 4 && m >= 4) return 'champions';
  if (f >= 4 && m >= 4) return 'loyal';
  if (r >= 3 && f >= 3 && m >= 3) return 'potential_loyal';
  if (r >= 4 && f <= 1) return 'new_customers';
  if (r >= 3 && f <= 2) return 'promising';
  if (r >= 3 && f >= 2 && m >= 2) return 'need_attention';
  if (r === 2 && f >= 2) return 'about_to_sleep';
  if (r <= 2 && f >= 3 && m >= 3) return 'cannot_lose';
  if (r <= 2 && f >= 2) return 'at_risk';
  if (r <= 2 && f <= 2 && m >= 2) return 'hibernating';
  return 'lost';
}

// ═══════════════════════════════════════════════════
// الدالة الرئيسية
// ═══════════════════════════════════════════════════
export function runRFMAnalysis(
  orders: OrderRecord[],
  contacts: Contact[]
): Contact[] {
  const rawMetrics = calculateRawMetrics(orders);
  const scores = scoreMetrics(rawMetrics);

  return contacts.map((contact) => {
    const score = scores.get(contact.supabaseId || contact.id);
    return score ? { ...contact, rfmScore: score } : contact;
  });
}
```

---

## 📁 FILE 15: src/pages/Settings.tsx — شاشة الإعدادات

```typescript
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Shield, Wifi, WifiOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { AppSettings, ConnectionTestResult } from '../types/settings.types';

const defaultSettings: AppSettings = {
  supabase: { url: '', anonKey: '', serviceRoleKey: '' },
  twilio: { accountSid: '', authToken: '', whatsappNumber: '' },
  webhook: { port: 3001, secret: '', enabled: false },
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [tests, setTests] = useState<Record<string, ConnectionTestResult>>({});

  useEffect(() => {
    window.electronAPI.settings.get().then((s: AppSettings) => {
      if (s) setSettings(s);
    });
  }, []);

  const handleSave = async () => {
    await window.electronAPI.settings.save(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testConnection = async (service: 'supabase' | 'twilio' | 'webhook') => {
    setTests((prev) => ({
      ...prev,
      [service]: { service, status: 'testing', message: 'جارٍ الفحص...' },
    }));

    let result: ConnectionTestResult;

    if (service === 'supabase') {
      result = await window.electronAPI.testConnection.supabase(settings.supabase);
    } else if (service === 'twilio') {
      result = await window.electronAPI.testConnection.twilio(settings.twilio);
    } else {
      result = await window.electronAPI.testConnection.webhook();
    }

    setTests((prev) => ({ ...prev, [service]: { ...result, service } }));
  };

  const StatusIcon = ({ status }: { status?: string }) => {
    if (status === 'testing') return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
    if (status === 'success') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-400" />;
    return <Wifi className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">إعدادات النظام</h1>
          <p className="text-gray-400 mt-1">ربط الخدمات الخارجية وإدارة مفاتيح API</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-all"
        >
          <Save className="w-4 h-4" />
          {saved ? '✅ تم الحفظ' : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* ═══ SUPABASE SECTION ═══ */}
      <SettingsSection
        title="Supabase — قاعدة البيانات"
        icon="🗄️"
        service="supabase"
        test={tests.supabase}
        onTest={() => testConnection('supabase')}
      >
        <div className="grid grid-cols-1 gap-4">
          <SettingsInput
            label="Project URL"
            placeholder="https://xxxx.supabase.co"
            value={settings.supabase.url}
            onChange={(v) => setSettings((s) => ({ ...s, supabase: { ...s.supabase, url: v } }))}
          />
          <SettingsInput
            label="Anon Key (Public)"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            type="password"
            value={settings.supabase.anonKey}
            onChange={(v) => setSettings((s) => ({ ...s, supabase: { ...s.supabase, anonKey: v } }))}
          />
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-amber-300 text-sm">
                <strong>تحذير أمني:</strong> Service Role Key يُستخدم في العمليات الداخلية فقط ولا يظهر في واجهة المستخدم أبداً. خزّنه في ملف .env فقط.
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ═══ TWILIO SECTION ═══ */}
      <SettingsSection
        title="Twilio — WhatsApp Business"
        icon="💬"
        service="twilio"
        test={tests.twilio}
        onTest={() => testConnection('twilio')}
      >
        <div className="grid grid-cols-2 gap-4">
          <SettingsInput
            label="Account SID"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={settings.twilio.accountSid}
            onChange={(v) => setSettings((s) => ({ ...s, twilio: { ...s.twilio, accountSid: v } }))}
          />
          <SettingsInput
            label="Auth Token"
            type="password"
            placeholder="••••••••••••••••••••••••••••••••"
            value={settings.twilio.authToken}
            onChange={(v) => setSettings((s) => ({ ...s, twilio: { ...s.twilio, authToken: v } }))}
          />
          <div className="col-span-2">
            <SettingsInput
              label="WhatsApp Number"
              placeholder="whatsapp:+14155238886"
              value={settings.twilio.whatsappNumber}
              onChange={(v) => setSettings((s) => ({ ...s, twilio: { ...s.twilio, whatsappNumber: v } }))}
            />
          </div>
        </div>
      </SettingsSection>

      {/* ═══ WEBHOOK SECTION ═══ */}
      <SettingsSection
        title="Webhook — استقبال الرسائل"
        icon="🔗"
        service="webhook"
        test={tests.webhook}
        onTest={() => testConnection('webhook')}
      >
        <div className="grid grid-cols-2 gap-4">
          <SettingsInput
            label="المنفذ (Port)"
            placeholder="3001"
            value={String(settings.webhook.port)}
            onChange={(v) => setSettings((s) => ({ ...s, webhook: { ...s.webhook, port: parseInt(v) || 3001 } }))}
          />
          <SettingsInput
            label="Webhook Secret"
            type="password"
            placeholder="مفتاح التحقق من Twilio"
            value={settings.webhook.secret}
            onChange={(v) => setSettings((s) => ({ ...s, webhook: { ...s.webhook, secret: v } }))}
          />
        </div>
        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            🔗 URL الـ Webhook لإضافته في Twilio Console:
            <code className="block mt-1 bg-gray-900 px-3 py-1 rounded text-emerald-400 text-xs mt-2">
              https://YOUR_NGROK_OR_SERVER.com/webhook/whatsapp
            </code>
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}

// ───── Sub Components ─────

function SettingsSection({
  title, icon, children, service, test, onTest
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  service: string;
  test?: ConnectionTestResult;
  onTest: () => void;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {test && (
            <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
              test.status === 'success' ? 'bg-emerald-900/30 text-emerald-300' :
              test.status === 'failed' ? 'bg-red-900/30 text-red-300' :
              'bg-gray-800 text-gray-400'
            }`}>
              {test.status === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
              {test.status === 'success' && <CheckCircle className="w-4 h-4" />}
              {test.status === 'failed' && <XCircle className="w-4 h-4" />}
              <span>{test.message}</span>
              {test.latency !== undefined && (
                <span className="text-gray-500 text-xs">({test.latency}ms)</span>
              )}
            </div>
          )}
          <button
            onClick={onTest}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            فحص الاتصال
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function SettingsInput({
  label, placeholder, value, onChange, type = 'text'
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
 
<truncated 24095 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.