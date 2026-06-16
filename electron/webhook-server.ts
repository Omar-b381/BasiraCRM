import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.WEBHOOK_PORT || 3001;

// استخدام body-parser لمعالجة طلبات Twilio (x-www-form-urlencoded)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 1. اختبار حيوية الخادم (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// التحقق من الـ Webhook الخاص بـ Meta/WhatsApp Cloud API
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'basira_crm_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ تم التحقق من الـ Webhook الخاص بـ Meta بنجاح!');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }
  return res.status(400).send('Bad Request');
});

// 2. استقبال webhook الواتساب من Twilio / Infobip / Meta
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    // 1. التحقق من نوع الويب هوك الخاص بـ Meta WhatsApp Cloud API
    if (req.body.object === 'whatsapp_business_account') {
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const fromNum = message.from || '';
        const toNum = value.metadata?.display_phone_number || '';
        const bodyText = message.text?.body || '';
        const msgSid = message.id || `META_${Date.now()}`;

        if (fromNum && bodyText) {
          const from = `whatsapp:+${fromNum.replace('+', '').trim()}`;
          const to = `whatsapp:+${toNum.replace('+', '').trim()}`;

          console.log(`📥 رسالة واردة من Meta Cloud API: ${from} | المحتوى: ${bodyText}`);

          const payload = {
            from,
            to,
            body: bodyText,
            sid: msgSid,
          };

          try {
            const forwardRes = await fetch('http://localhost:3002/incoming', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!forwardRes.ok) {
              console.error(`❌ فشل تمرير رسالة Meta لـ Electron: ${forwardRes.statusText}`);
            } else {
              console.log('✅ تم تمرير رسالة Meta بنجاح إلى Electron');
            }
          } catch (err) {
            console.error('⚠️ Electron غير متصل حالياً. تم تجاهل التوجيه الفوري لرسالة Meta.');
          }
        }
      }

      return res.status(200).json({ success: true });
    }

    // 2. التحقق من نوع الويب هوك الخاص بـ Infobip
    if (req.body.results && Array.isArray(req.body.results)) {
      console.log(`📥 ويب هوك Infobip وارد: ${req.body.results.length} رسالة`);

      for (const result of req.body.results) {
        const fromNum = result.from;
        const toNum = result.to;
        const bodyText = result.message?.text || '';
        const msgSid = result.messageId || `INFOBIP_${Date.now()}`;

        if (!fromNum || !bodyText) continue;

        const from = `whatsapp:+${fromNum.replace('+', '').trim()}`;
        const to = `whatsapp:+${toNum ? toNum.replace('+', '').trim() : ''}`;

        console.log(`📥 رسالة واردة من Infobip: ${from} | المحتوى: ${bodyText}`);

        const payload = {
          from,
          to,
          body: bodyText,
          sid: msgSid,
        };

        // تمرير الرسالة إلى عملية Electron الرئيسية على منفذ 3002
        try {
          const forwardRes = await fetch('http://localhost:3002/incoming', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!forwardRes.ok) {
            console.error(`❌ فشل تمرير رسالة Infobip لـ Electron: ${forwardRes.statusText}`);
          } else {
            console.log('✅ تم تمرير رسالة Infobip بنجاح إلى Electron');
          }
        } catch (err) {
          console.error('⚠️ Electron غير متصل حالياً. تم تجاهل التوجيه الفوري لرسالة Infobip.');
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true }));
    }

    // افتراض أنه ويب هوك Twilio
    const { From, To, Body, MessageSid } = req.body;

    console.log(`📥 رسالة واردة من Twilio: ${From} | المحتوى: ${Body}`);

    if (!From || !Body) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Invalid request data');
    }

    // إعداد البيانات وتمريرها لخادم Electron المحلي
    const payload = {
      from: From,
      to: To,
      body: Body,
      sid: MessageSid,
    };

    // تمرير الرسالة إلى عملية Electron الرئيسية على منفذ 3002
    try {
      const forwardRes = await fetch('http://localhost:3002/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!forwardRes.ok) {
        console.error(`❌ فشل تمرير الرسالة لـ Electron: ${forwardRes.statusText}`);
      } else {
        console.log('✅ تم تمرير الرسالة بنجاح إلى Electron');
      }
    } catch (err) {
      console.error('⚠️ Electron غير متصل حالياً. تم تجاهل التوجيه الفوري.');
    }

    // الرد على Twilio بـ TwiML فارغ
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end('<Response></Response>');
  } catch (error) {
    console.error('❌ خطأ في معالجة Webhook:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`🚀 خادم Webhook يعمل على منفذ http://localhost:${port}`);
});
