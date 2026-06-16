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
      // Clean up previous listeners if necessary
      ipcRenderer.removeAllListeners('whatsapp:incoming');
      ipcRenderer.on('whatsapp:incoming', (_, msg) => callback(msg));
    },
  },

  // Supabase (limited to specific queries)
  db: {
    getContacts: (filters?: unknown) => ipcRenderer.invoke('db:getContacts', filters),
    getContactById: (id: string) => ipcRenderer.invoke('db:getContactById', id),
    getRFMData: (dateRange?: unknown) => ipcRenderer.invoke('db:getRFMData', dateRange),
    getProviders: () => ipcRenderer.invoke('db:getProviders'),
    saveProvider: (provider: unknown) => ipcRenderer.invoke('db:saveProvider', provider),
  },
});
