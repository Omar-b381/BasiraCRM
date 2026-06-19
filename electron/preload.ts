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
    meta: (config: unknown) => ipcRenderer.invoke('test:meta', config),
    webhook: () => ipcRenderer.invoke('test:webhook'),
  },

  // Auth (hashing and verification)
  auth: {
    hashPassword: (password: string) => ipcRenderer.invoke('auth:hashPassword', password),
    verifyPassword: (password: string, hash: string) => ipcRenderer.invoke('auth:verifyPassword', { password, hash }),
    sessionLogin: (employee: unknown) => ipcRenderer.invoke('auth:sessionLogin', employee),
    sessionLogout: () => ipcRenderer.invoke('auth:sessionLogout'),
  },

  // WhatsApp
  whatsapp: {
    send: (to: string, body: string, mediaUrl?: string, messageType?: string, fileName?: string) => 
      ipcRenderer.invoke('whatsapp:send', { to, body, mediaUrl, messageType, fileName }),
    getConversations: () => ipcRenderer.invoke('whatsapp:getConversations'),
    getMessages: (contactPhone: string) => ipcRenderer.invoke('whatsapp:getMessages', contactPhone),
    deleteConversation: (id: number) => ipcRenderer.invoke('whatsapp:deleteConversation', id),
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

  invoice: {
    searchCustomer: (query: string) => ipcRenderer.invoke('invoice:searchCustomer', query),
    create: (draft: unknown) => ipcRenderer.invoke('invoice:create', draft),
    update: (payload: unknown) => ipcRenderer.invoke('invoice:update', payload),
    cancel: (invoiceId: number, reason?: string) => ipcRenderer.invoke('invoice:cancel', invoiceId, reason),
    getById: (invoiceId: number) => ipcRenderer.invoke('invoice:getById', invoiceId),
    search: (query: string) => ipcRenderer.invoke('invoice:search', query),
    generatePdf: (invoiceData: unknown) => ipcRenderer.invoke('invoice:generatePdf', invoiceData),
    printDirect: (invoiceData: unknown) => ipcRenderer.invoke('invoice:printDirect', invoiceData),
    searchProducts: (query: string) => ipcRenderer.invoke('invoice:searchProducts', query),
    getProductVariants: (productName: string) => ipcRenderer.invoke('invoice:getProductVariants', productName),
    getNextId: () => ipcRenderer.invoke('invoice:getNextId'),
    getShippingRates: () => ipcRenderer.invoke('invoice:getShippingRates'),
  },

  shipping: {
    getInvoicesForExport: (filters: unknown) =>
      ipcRenderer.invoke('shipping:getInvoicesForExport', filters),
    exportExcel: (rows: unknown) =>
      ipcRenderer.invoke('shipping:exportExcel', rows),
    parseExcelForTracking: () =>
      ipcRenderer.invoke('shipping:parseExcelForTracking'),
    updateStatuses: (updates: unknown) =>
      ipcRenderer.invoke('shipping:updateStatuses', updates),
    getDbStats: () =>
      ipcRenderer.invoke('shipping:getDbStats'),
  },

  tasks: {
    getTasks: () => ipcRenderer.invoke('tasks:get'),
    createTask: (task: unknown) => ipcRenderer.invoke('tasks:create', task),
    updateTask: (task: unknown) => ipcRenderer.invoke('tasks:update', task),
    deleteTask: (id: number) => ipcRenderer.invoke('tasks:delete', id),
    onTaskReminder: (callback: (task: any) => void) => {
      ipcRenderer.removeAllListeners('tasks:reminder');
      ipcRenderer.on('tasks:reminder', (_, task) => callback(task));
    },
  },
});
