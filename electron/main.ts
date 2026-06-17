import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import Store from 'electron-store';
import http from 'http';
import { setupWhatsAppIPC } from './ipc/whatsapp.ipc';
import { setupSupabaseIPC } from './ipc/supabase.ipc';
import { setupSettingsIPC } from './ipc/settings.ipc';
import { setupInvoiceIPC } from './ipc/invoice.ipc';
import { setupShippingIPC } from './ipc/shipping.ipc';

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
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#0F172A',
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

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
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

// خادم محلي لاستقبال الرسائل الواردة من حاوية الـ Webhook
function startLocalMessageServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/incoming') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const message = JSON.parse(body);
          // توجيه الحدث إلى معالج الـ WhatsApp IPC
          ipcMain.emit('whatsapp:forward-incoming', null, message);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid JSON');
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  // التعامل مع أخطاء التشغيل (مثل أن يكون المنفذ محجوزاً)
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn('⚠️ المنفذ 3002 مستخدم بالفعل. سيتم تخطي تشغيل خادم الاستقبال لتجنب الانهيار.');
    } else {
      console.error('❌ خطأ في خادم استقبال الرسائل:', err);
    }
  });

  // الاستماع على منفذ 3002
  server.listen(3002, 'localhost', () => {
    console.log(' خادم استقبال الرسائل للـ Main Process يعمل على منفذ 3002');
  });
}

app.commandLine.appendSwitch('disable-gpu-cache');

// ── التقاط أي خطأ غير متوقع قبل فتح النافذة ──
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  dialog.showErrorBox('خطأ في التطبيق', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

app.whenReady().then(async () => {
  // تسجيل IPC handlers
  setupSettingsIPC(store);
  setupWhatsAppIPC(store);
  setupSupabaseIPC(store);
  setupInvoiceIPC(store);
  setupShippingIPC(store);
  
  // تشغيل خادم استقبال الرسائل المحلي
  startLocalMessageServer();

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
