export interface IElectronAPI {
  settings: {
    get: () => Promise<any>;
    save: (settings: any) => Promise<{ success: boolean; error?: string; message?: string }>;
  };
  testConnection: {
    supabase: (config: any) => Promise<any>;
    twilio: (config: any) => Promise<any>;
    webhook: () => Promise<any>;
  };
  whatsapp: {
    send: (to: string, body: string) => Promise<any>;
    getConversations: () => Promise<any>;
    getMessages: (contactPhone: string) => Promise<any>;
    onMessage: (callback: (msg: any) => void) => void;
  };
  db: {
    getContacts: (filters?: any) => Promise<any>;
    getContactById: (id: string) => Promise<any>;
    getRFMData: (dateRange?: any) => Promise<any>;
    getProviders: () => Promise<any>;
    saveProvider: (provider: any) => Promise<any>;
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
