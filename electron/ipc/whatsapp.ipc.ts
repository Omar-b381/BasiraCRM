import { ipcMain, BrowserWindow } from 'electron';
import Twilio from 'twilio';
import type Store from 'electron-store';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import Pusher from 'pusher-js';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

interface MetaConfig {
  accessToken: string;
  phoneNumberId: string;
  whatsappNumber: string;
  verifyToken: string;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function setupWhatsAppIPC(store: Store) {
  let realtimeChannel: any = null;

  // تهيئة الاستماع لـ Pusher لاستقبال الرسائل سحابياً بشكل مجاني وفوري
  try {
    const PusherClass = (Pusher as any).Pusher || Pusher;
    const pusher = new PusherClass("95a9339dddab8dc6b6c1", {
      cluster: "mt1"
    });

    const channel = pusher.subscribe("whatsapp-channel");

    channel.bind("incoming-message", async (data: any) => {
      console.log('📡 رسالة واردة مستلمة من Pusher في الـ Main Process:', data);
      const { from, body, sid } = data;
      if (!from || !body) return;

      try {
        const supabase = getSupabaseClient();
        const { customerId, conversationId } = await ensureConversation(supabase, from);

        // حفظ الرسالة في قاعدة البيانات Supabase
        const { data: insertedMsg, error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            direction: 'inbound',
            content: body,
            message_type: 'text',
            status: 'delivered',
            provider_msg_id: sid || `PUSHER_${Date.now()}`,
            sent_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (insertError) throw insertError;

        // تحديث المحادثة لتظهر في الأعلى
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        // بث للواجهة الرسومية
        const formattedMsg = {
          id: String(insertedMsg.id),
          twilioSid: insertedMsg.provider_msg_id,
          contactId: customerId,
          contactPhone: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
          direction: 'inbound',
          body: insertedMsg.content,
          status: 'delivered',
          timestamp: insertedMsg.sent_at
        };

        const windows = BrowserWindow.getAllWindows();
        for (const win of windows) {
          win.webContents.send('whatsapp:incoming', formattedMsg);
        }
      } catch (err) {
        console.error('Error saving Pusher message in Main Process:', err);
      }
    });

    console.log('✅ تم تشغيل مستمع Pusher سحابياً بنجاح');
  } catch (err) {
    console.error('⚠️ فشل تشغيل مستمع Pusher في الـ Main Process:', err);
  }

  // دالة مساعدة للحصول على عميل Supabase المحدث
  const getSupabaseClient = (): SupabaseClient => {
    const settings = store.get('apiSettings') as { supabase?: SupabaseConfig };
    const config = settings?.supabase;
    if (!config?.url || !config?.anonKey) {
      throw new Error('إعدادات Supabase غير مكتملة');
    }
    return createClient(config.url.replace(/[”"']/g, '').trim(), config.anonKey.replace(/[”"']/g, '').trim(), {
      auth: { persistSession: false },
      realtime: { transport: ws as any },
    });
  };

  const startRealtimeSubscription = (supabase: SupabaseClient) => {
    if (realtimeChannel) {
      console.log('🔄 Re-subscribing to Supabase Realtime...');
      realtimeChannel.unsubscribe();
    } else {
      console.log('📡 Subscribing to Supabase Realtime...');
    }
    
    realtimeChannel = supabase
      .channel('public:messages_realtime_stream')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'direction=eq.inbound'
      }, async (payload) => {
        try {
          const newMsg = payload.new;
          console.log('📬 Live message inserted in DB:', newMsg);
          
          // Get customer phone
          const { data: conv } = await supabase
            .from('conversations')
            .select(`
              customer_id,
              customers (
                phone
              )
            `)
            .eq('id', newMsg.conversation_id)
            .single() as any;
            
          if (conv) {
            const custPhone = conv.customers?.phone || '';
            const formattedMsg = {
              id: String(newMsg.id),
              twilioSid: newMsg.provider_msg_id,
              contactId: conv.customer_id,
              contactPhone: custPhone.startsWith('whatsapp:') ? custPhone : `whatsapp:${custPhone}`,
              direction: 'inbound',
              body: newMsg.content,
              status: 'delivered',
              timestamp: newMsg.sent_at
            };

            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
              win.webContents.send('whatsapp:incoming', formattedMsg);
            }
          }
        } catch (err) {
          console.error('Error handling realtime message insert:', err);
        }
      })
      .subscribe((status) => {
        console.log(`📡 Realtime subscription status: ${status}`);
      });
  };

  // دالة مساعدة للحصول على عميل Twilio المحدث من قاعدة البيانات أو التخزين المحلي
  const getTwilioClient = async (supabase: SupabaseClient) => {
    try {
      const { data: provider } = await supabase
        .from('whatsapp_providers')
        .select('*')
        .eq('type', 'twilio')
        .limit(1)
        .maybeSingle();

      if (provider && provider.api_key && provider.api_url) {
        return {
          client: Twilio(provider.api_url.replace(/[”"']/g, '').trim(), provider.api_key.replace(/[”"']/g, '').trim()),
          fromNumber: provider.phone_number || 'whatsapp:+14155238886',
        };
      }
    } catch (err) {
      console.error('Error fetching Twilio config from Supabase, falling back to store:', err);
    }

    const settings = store.get('apiSettings') as { twilio?: TwilioConfig };
    const twilio = settings?.twilio;

    if (!twilio?.accountSid || !twilio?.authToken) {
      throw new Error('إعدادات Twilio غير مكتملة — اذهب إلى الإعدادات');
    }

    return {
      client: Twilio(twilio.accountSid.replace(/[”"']/g, '').trim(), twilio.authToken.replace(/[”"']/g, '').trim()),
      fromNumber: twilio.whatsappNumber || 'whatsapp:+14155238886',
    };
  };

  // دالة للحصول على مزود الخدمة النشط وإعداده
  const getActiveProvider = async (supabase: SupabaseClient) => {
    try {
      const { data: provider } = await supabase
        .from('whatsapp_providers')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (provider) {
        return provider;
      }
    } catch (err) {
      console.error('Error fetching active provider from Supabase, falling back to local store:', err);
    }

    // fallback to store
    const settings = store.get('apiSettings') as { activeProvider?: string; twilio?: TwilioConfig; meta?: MetaConfig };
    const activeProvider = settings?.activeProvider || 'twilio';

    if (activeProvider === 'meta' && settings?.meta?.accessToken) {
      return {
        id: null,
        name: 'meta',
        type: 'meta',
        api_key: settings.meta.accessToken,
        api_url: settings.meta.phoneNumberId,
        phone_number: settings.meta.whatsappNumber,
      };
    }

    if (settings?.twilio?.accountSid) {
      return {
        id: null,
        name: 'twilio',
        type: 'twilio',
        api_key: settings.twilio.authToken,
        api_url: settings.twilio.accountSid,
        phone_number: settings.twilio.whatsappNumber,
      };
    }

    throw new Error('إعدادات واتساب غير مكتملة — اذهب إلى الإعدادات');
  };

  // دالة لمطابقة الهاتف مع العميل وجلسة المحادثة
  const ensureConversation = async (supabase: SupabaseClient, phone: string): Promise<{ customerId: string; conversationId: number }> => {
    const cleanPhone = phone.replace('whatsapp:', '').replace('+', '').trim();
    
    // 1. البحث عن العميل
    let { data: customer } = await supabase
      .from('customers')
      .select('customer_id')
      .or(`phone.eq.${cleanPhone},customer_phone_2.eq.${cleanPhone}`)
      .limit(1)
      .maybeSingle();

    let customerId = customer?.customer_id;

    // إذا لم يوجد، نقوم بإنشائه كعميل جديد
    if (!customerId) {
      const { data: newCust, error: createError } = await supabase
        .from('customers')
        .insert({
          customer_id: 'CUST_' + Math.floor(Math.random() * 10000),
          name: `عميل واتساب ${cleanPhone.substring(cleanPhone.length - 4)}`,
          phone: cleanPhone,
          created_at: new Date().toISOString()
        })
        .select('customer_id')
        .single();
      
      if (createError) throw createError;
      customerId = newCust.customer_id;
    }

    // 2. البحث عن المحادثة
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!conversation) {
      // الحصول على معرف Twilio من قاعدة البيانات
      const { data: provider } = await supabase
        .from('whatsapp_providers')
        .select('id')
        .eq('type', 'twilio')
        .limit(1)
        .maybeSingle();

      const providerId = provider?.id || null;

      // إدراج محادثة جديدة
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customerId,
          provider_id: providerId,
          status: 'active',
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (convError) throw convError;
      return { customerId, conversationId: newConv.id };
    }

    return { customerId, conversationId: conversation.id };
  };

  // إرسال رسالة WhatsApp
  ipcMain.handle('whatsapp:send', async (_, { to, body }) => {
    try {
      const supabase = getSupabaseClient();

      // الحصول على مزود الخدمة النشط
      const provider = await getActiveProvider(supabase);

      let messageId = '';
      let statusStr = '';

      if (provider.type === 'meta') {
        const cleanTo = to.replace('whatsapp:', '').replace('+', '').trim();
        const response = await fetch(`https://graph.facebook.com/v18.0/${provider.api_url}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
            type: 'text',
            text: { preview_url: false, body: body }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Meta API Error: ${response.status}`);
        }

        const resData = await response.json();
        messageId = resData.messages?.[0]?.id || `meta_msg_${Date.now()}`;
        statusStr = 'sent';
      } else {
        // Twilio
        const { client, fromNumber } = await getTwilioClient(supabase);
        const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const twilioRes = await client.messages.create({
          from: fromNumber,
          to: toNumber,
          body,
        });

        messageId = twilioRes.sid;
        statusStr = twilioRes.status;
      }

      // إدراج وحفظ في Supabase
      const { customerId, conversationId } = await ensureConversation(supabase, to);
      
      const { data: insertedMsg, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'outbound',
          content: body,
          message_type: 'text',
          status: statusStr,
          provider_msg_id: messageId,
          sent_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // تحديث توقيت آخر رسالة للمحادثة
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // حفظ لوق الإشعار إذا كانت مرتبطة بطلب
      await supabase
        .from('notifications_log')
        .insert({
          customer_id: customerId,
          type: 'whatsapp',
          status: statusStr,
          sent_at: new Date().toISOString(),
          provider_id: provider.id || null,
          message_content: body
        });

      return {
        success: true,
        sid: messageId,
        status: statusStr,
        timestamp: new Date().toISOString(),
        message: {
          id: String(insertedMsg.id),
          twilioSid: insertedMsg.provider_msg_id,
          contactId: customerId,
          contactPhone: to,
          direction: 'outbound',
          body: insertedMsg.content,
          status: statusStr,
          timestamp: insertedMsg.sent_at
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل إرسال الرسالة',
      };
    }
  });

  // جلب المحادثات من Supabase
  ipcMain.handle('whatsapp:getConversations', async () => {
    try {
      const supabase = getSupabaseClient();

      // تهيئة الاشتراك اللحظي التلقائي
      try {
        startRealtimeSubscription(supabase);
      } catch (rtErr) {
        console.error('Failed to start realtime subscription:', rtErr);
      }

      // جلب الجلسات مع العملاء
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          customer_id,
          provider_id,
          status,
          last_message_at,
          customers (
            name,
            phone
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // جلب آخر رسالة لكل جلسة
      const formattedConversations = await Promise.all(
        (conversations || []).map(async (conv: any) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('sent_at', { ascending: false })
            .limit(1);

          const lastMsg = msgs && msgs.length > 0 ? msgs[0] : null;
          const custPhone = conv.customers?.phone || '';

          return {
            id: conv.id,
            status: conv.status,
            contactId: conv.customer_id,
            contactName: conv.customers?.name || 'عميل غير معروف',
            contactPhone: custPhone.startsWith('whatsapp:') ? custPhone : `whatsapp:+${custPhone}`,
            unreadCount: 0,
            lastActivity: conv.last_message_at || conv.created_at,
            lastMessage: lastMsg ? {
              id: String(lastMsg.id),
              twilioSid: lastMsg.provider_msg_id,
              contactId: conv.customer_id,
              contactPhone: custPhone,
              direction: lastMsg.direction,
              body: lastMsg.content,
              status: lastMsg.status,
              timestamp: lastMsg.sent_at
            } : undefined
          };
        })
      );

      return {
        success: true,
        conversations: formattedConversations,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب المحادثات',
      };
    }
  });

  // جلب الرسائل لجلسة محددة من الهاتف
  ipcMain.handle('whatsapp:getMessages', async (_, contactPhone) => {
    try {
      const supabase = getSupabaseClient();
      const cleanPhone = contactPhone.replace('whatsapp:', '').replace('+', '').trim();

      // البحث عن العميل
      const { data: customer } = await supabase
        .from('customers')
        .select('customer_id')
        .or(`phone.eq.${cleanPhone},customer_phone_2.eq.${cleanPhone}`)
        .limit(1)
        .maybeSingle();

      if (!customer) {
        return { success: true, messages: [] };
      }

      // البحث عن المحادثة
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', customer.customer_id)
        .limit(1)
        .maybeSingle();

      if (!conv) {
        return { success: true, messages: [] };
      }

      // جلب رسائلها
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        messages: (msgs || []).map(m => ({
          id: String(m.id),
          twilioSid: m.provider_msg_id,
          contactId: customer.customer_id,
          contactPhone,
          direction: m.direction,
          body: m.content,
          status: m.status,
          timestamp: m.sent_at
        }))
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل جلب الرسائل',
      };
    }
  });

  // استقبال رسالة واردة (من Webhook Server)
  // وحفظها في قاعدة البيانات قبل بثها للواجهة
  ipcMain.on('whatsapp:forward-incoming', async (_, rawMsg) => {
    try {
      const supabase = getSupabaseClient();
      const { from, body, sid } = rawMsg; // From: +20XXXXXXXXXX, Body: Text, MessageSid: SMxxx

      const { customerId, conversationId } = await ensureConversation(supabase, from);

      // حفظ الرسالة في Supabase
      const { data: insertedMsg, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          direction: 'inbound',
          content: body,
          message_type: 'text',
          status: 'delivered',
          provider_msg_id: sid,
          sent_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // تحديث المحادثة
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      // بث للواجهة
      const formattedMsg = {
        id: String(insertedMsg.id),
        twilioSid: insertedMsg.provider_msg_id,
        contactId: customerId,
        contactPhone: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        direction: 'inbound',
        body: insertedMsg.content,
        status: 'delivered',
        timestamp: insertedMsg.sent_at
      };

      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send('whatsapp:incoming', formattedMsg);
      }
    } catch (err) {
      console.error('Error handling incoming message save:', err);
    }
  });
}
