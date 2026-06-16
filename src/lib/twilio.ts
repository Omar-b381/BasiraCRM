// Twilio client wrapper for the frontend renderer
// All requests are routed through Electron IPC to keep Account SID and Auth Token secure on the main process.

export const twilioClient = {
  /**
   * Send WhatsApp message to a customer
   * @param to Phone number in format +20XXXXXXXXXX
   * @param body Message body text
   */
  sendWhatsApp: async (to: string, body: string) => {
    return window.electronAPI.whatsapp.send(to, body);
  },

  /**
   * Get list of conversations
   */
  getConversations: async () => {
    return window.electronAPI.whatsapp.getConversations();
  },

  /**
   * Get message history for a specific phone number
   */
  getMessages: async (contactPhone: string) => {
    return window.electronAPI.whatsapp.getMessages(contactPhone);
  }
};
