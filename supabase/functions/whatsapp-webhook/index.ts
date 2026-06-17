// ============================================================
//  🚀 بصيرة CRM – WhatsApp Webhook Edge Function
//  يعمل على Supabase Edge (Deno) – دائم ومجاني 100%
//  
//  يدعم:
//    ✅ واجهة WhatsApp Cloud API (Meta)
//    ✅ واجهة Twilio WhatsApp Webhook
//    ✅ حفظ الرسائل في جدول whatsapp_messages
//    ✅ إنشاء/تحديث جهات الاتصال تلقائياً
//    ✅ التحقق من الـ Webhook Secret
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── إنشاء Supabase Client ──────────────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── CORS Headers ──────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Twilio-Signature",
};

// ============================================================
//  المدخل الرئيسي للـ Function
// ============================================================
serve(async (req: Request) => {
  // معالجة CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── تحقق Webhook من Meta (GET) ────────────────────────
  if (req.method === "GET") {
    return handleVerification(url);
  }

  // ── استقبال رسالة واتساب (POST) ──────────────────────
  if (req.method === "POST") {
    try {
      const contentType = req.headers.get("content-type") || "";
      let body: any;

      if (contentType.includes("application/x-www-form-urlencoded")) {
        // ← Twilio Webhook
        const text = await req.text();
        body = Object.fromEntries(new URLSearchParams(text));
        return await handleTwilioWebhook(body);
      } else {
        // ← Meta WhatsApp Cloud API
        body = await req.json();
        return await handleMetaWebhook(body);
      }
    } catch (err) {
      console.error("❌ خطأ في معالجة الطلب:", err);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});

// ============================================================
//  التحقق من الـ Webhook (Meta Cloud API)
// ============================================================
function handleVerification(url: URL): Response {
  const mode      = url.searchParams.get("hub.mode");
  const token     = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const secret    = Deno.env.get("WEBHOOK_VERIFY_TOKEN");

  if (mode === "subscribe" && token === secret) {
    console.log("✅ Webhook تم التحقق منه بنجاح");
    return new Response(challenge, { status: 200 });
  }

  console.warn("⚠️ فشل التحقق من الـ Webhook – token غير صحيح");
  return new Response("Forbidden", { status: 403 });
}

// ============================================================
//  معالجة Webhook من Meta WhatsApp Cloud API
// ============================================================
async function handleMetaWebhook(body: any): Promise<Response> {
  const entry    = body?.entry?.[0];
  const changes  = entry?.changes?.[0];
  const value    = changes?.value;
  const messages = value?.messages;

  if (!messages || messages.length === 0) {
    // قد يكون status update أو notification – نقبله بهدوء
    return jsonResponse({ status: "ok", note: "no messages in payload" });
  }

  const contact = value?.contacts?.[0];
  const phone   = messages[0]?.from;
  const name    = contact?.profile?.name || phone;

  for (const msg of messages) {
    await saveMessage({
      platform:      "meta",
      contactPhone:  msg.from,
      contactName:   name,
      direction:     "inbound",
      body:          extractMetaBody(msg),
      messageType:   msg.type,
      externalId:    msg.id,
      timestamp:     new Date(Number(msg.timestamp) * 1000).toISOString(),
      mediaUrl:      extractMetaMedia(msg),
      rawPayload:    msg,
    });
  }

  return jsonResponse({ status: "ok" });
}

// ============================================================
//  معالجة Webhook من Twilio
// ============================================================
async function handleTwilioWebhook(body: any): Promise<Response> {
  const from      = (body.From || "").replace("whatsapp:", "");
  const to        = (body.To   || "").replace("whatsapp:", "");
  const text      = body.Body || "";
  const sid       = body.MessageSid || "";
  const mediaUrl  = body.MediaUrl0 || undefined;
  const mediaType = body.MediaContentType0 || undefined;

  await saveMessage({
    platform:     "twilio",
    contactPhone: from,
    contactName:  body.ProfileName || from,
    direction:    "inbound",
    body:         text,
    messageType:  mediaUrl ? "image" : "text",
    externalId:   sid,
    timestamp:    new Date().toISOString(),
    mediaUrl:     mediaUrl,
    rawPayload:   body,
  });

  // Twilio يتوقع رد TwiML فارغ
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    }
  );
}

// ============================================================
//  الحفظ في قاعدة البيانات
// ============================================================
interface SaveMessageParams {
  platform:     "meta" | "twilio";
  contactPhone: string;
  contactName:  string;
  direction:    "inbound" | "outbound";
  body:         string;
  messageType:  string;
  externalId:   string;
  timestamp:    string;
  mediaUrl?:    string;
  rawPayload:   any;
}

async function saveMessage(params: SaveMessageParams): Promise<void> {
  const {
    platform, contactPhone, contactName,
    direction, body, messageType,
    externalId, timestamp, mediaUrl, rawPayload,
  } = params;

  const cleanPhone = contactPhone.replace("whatsapp:", "").replace("+", "").trim();

  // 1️⃣ ابحث عن جهة اتصال موجودة
  let customerId: string | null = null;

  const { data: existingContacts } = await supabase
    .from("customers")
    .select("customer_id, name")
    .or(`phone.eq.${cleanPhone},customer_phone_2.eq.${cleanPhone}`)
    .limit(1);

  if (existingContacts && existingContacts.length > 0) {
    customerId = existingContacts[0].customer_id;
  } else {
    // 2️⃣ أنشئ جهة اتصال جديدة تلقائياً
    const newCustId = 'CUST_' + Math.floor(Math.random() * 10000);
    const { data: newContact, error: contactError } = await supabase
      .from("customers")
      .insert({
        customer_id:    newCustId,
        name:           contactName,
        phone:          cleanPhone,
        created_at:     timestamp,
      })
      .select("customer_id")
      .single();

    if (contactError) {
      console.error("❌ فشل إنشاء جهة الاتصال:", contactError.message);
      customerId = newCustId;
    } else {
      customerId = newContact?.customer_id ?? newCustId;
      console.log(`✅ تم إنشاء جهة اتصال جديدة: ${contactName} (${cleanPhone})`);
    }
  }

  // 3️⃣ ابحث عن المحادثة أو أنشئها
  let conversationId: number | null = null;
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    // الحصول على معرف المزود من جدول whatsapp_providers
    const { data: provider } = await supabase
      .from("whatsapp_providers")
      .select("id")
      .eq("type", platform)
      .limit(1)
      .maybeSingle();

    const providerId = provider?.id || null;

    // إدراج محادثة جديدة
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        customer_id: customerId,
        provider_id: providerId,
        status: "active",
        last_message_at: timestamp,
      })
      .select("id")
      .single();

    if (convError) {
      console.error("❌ فشل إنشاء المحادثة:", convError.message);
      return;
    }
    conversationId = newConv.id;
  }

  // 4️⃣ احفظ الرسالة في جدول messages
  const { error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      direction:       direction,
      content:         body,
      message_type:    messageType === "image" ? "image" : "text",
      status:          "delivered",
      provider_msg_id: externalId,
      sent_at:         timestamp,
    });

  if (msgError) {
    console.error("❌ فشل حفظ الرسالة:", msgError.message);
  } else {
    // تحديث توقيت آخر رسالة للمحادثة
    await supabase
      .from("conversations")
      .update({ last_message_at: timestamp })
      .eq("id", conversationId);

    console.log(`📨 [${platform.toUpperCase()}] رسالة جديدة من ${cleanPhone}: "${body.substring(0, 50)}"`);
  }
}

// ============================================================
//  دوال مساعدة
// ============================================================

/** استخراج نص الرسالة من Payload الخاص بـ Meta */
function extractMetaBody(msg: any): string {
  switch (msg.type) {
    case "text":     return msg.text?.body       || "";
    case "image":    return msg.image?.caption   || "[صورة]";
    case "video":    return msg.video?.caption   || "[فيديو]";
    case "audio":    return "[رسالة صوتية]";
    case "document": return msg.document?.filename || "[ملف]";
    case "location": return `[موقع: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
    case "sticker":  return "[ملصق]";
    case "reaction": return `[تفاعل: ${msg.reaction?.emoji}]`;
    default:         return `[${msg.type}]`;
  }
}

/** استخراج رابط الوسائط من Payload الخاص بـ Meta */
function extractMetaMedia(msg: any): string | undefined {
  const media = msg.image || msg.video || msg.audio || msg.document || msg.sticker;
  return media?.id ? `https://graph.facebook.com/v18.0/${media.id}` : undefined;
}

/** إرجاع JSON response موحد */
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
