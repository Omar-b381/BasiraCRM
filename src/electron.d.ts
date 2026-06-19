export interface IElectronAPI {
  settings: {
    get: () => Promise<any>;
    save: (settings: any) => Promise<{ success: boolean; error?: string; message?: string }>;
  };
  testConnection: {
    supabase: (config: any) => Promise<any>;
    twilio: (config: any) => Promise<any>;
    meta: (config: any) => Promise<any>;
    webhook: () => Promise<any>;
  };
  auth: {
    hashPassword: (password: string) => Promise<{ success: boolean; hash?: string; error?: string }>;
    verifyPassword: (password: string, hash: string) => Promise<{ success: boolean; isValid?: boolean; error?: string }>;
    sessionLogin: (employee: any) => Promise<{ success: boolean }>;
    sessionLogout: () => Promise<{ success: boolean }>;
  };
  whatsapp: {
    send: (to: string, body: string, mediaUrl?: string, messageType?: string, fileName?: string) => Promise<any>;
    getConversations: () => Promise<any>;
    getMessages: (contactPhone: string) => Promise<any>;
    deleteConversation: (id: number) => Promise<any>;
    onMessage: (callback: (msg: any) => void) => void;
    sendBulkCampaign: (payload: { campaignId: number; contacts: any[]; messageTemplate: string }) => Promise<{ success: boolean; sent?: number; failed?: number; errors?: string[]; error?: string }>;
    onCampaignProgress: (callback: (progress: any) => void) => void;
  };
  db: {
    getContacts: (filters?: any) => Promise<any>;
    getContactById: (id: string) => Promise<any>;
    getRFMData: (dateRange?: any) => Promise<any>;
    getProviders: () => Promise<any>;
    saveProvider: (provider: any) => Promise<any>;
  };
  invoice: {
    searchCustomer: (query: string) => Promise<any>;
    create: (draft: any) => Promise<any>;
    update: (payload: any) => Promise<any>;
    cancel: (invoiceId: number, reason?: string) => Promise<any>;
    getById: (invoiceId: number) => Promise<any>;
    search: (query: string) => Promise<any>;
    generatePdf: (invoiceData: any) => Promise<any>;
    printDirect: (invoiceData: any) => Promise<any>;
    searchProducts: (query: string) => Promise<any>;
    getProductVariants: (productName: string) => Promise<any>;
    getNextId: () => Promise<any>;
    getShippingRates: () => Promise<any>;
  };
  shipping: {
    getInvoicesForExport: (filters: any) => Promise<{ success: boolean; data: any[]; error?: string }>;
    exportExcel: (rows: any[]) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    parseExcelForTracking: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    updateStatuses: (updates: Array<{ invoiceId: number; status: string }>) => Promise<{ success: boolean; error?: string }>;
    getDbStats: () => Promise<{ success: boolean; stats?: any; error?: string }>;
  };
  tasks: {
    getTasks: () => Promise<{ success: boolean; data: any[]; error?: string }>;
    createTask: (task: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    updateTask: (task: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteTask: (id: number) => Promise<{ success: boolean; error?: string }>;
    onTaskReminder: (callback: (task: any) => void) => void;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
