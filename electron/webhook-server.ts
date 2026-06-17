import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.WEBHOOK_PORT || 3001;

// استخدام body-parser لمعالجة الطلبات
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 1. اختبار حيوية الخادم (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// 2. التحقق من Webhook الخاص بـ Meta (GET)
// يرسل خادم فيسبوك طلباً هنا لتأكيد هوية الخادم وصحة رمز التحقق (Verify Token)
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // يمكن تخصيص الرمز عبر متغير البيئة META_VERIFY_TOKEN
  const localVerifyToken = process.env.META_VERIFY_TOKEN || 'my_verify_token';

  if (mode === 'subscribe' && token === localVerifyToken) {
    console.log('✅ تم التحقق من Webhook الخاص بـ Meta بنجاح!');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ فشل التحقق من Webhook الخاص بـ Meta. رمز التحقق غير متطابق.');
    res.sendStatus(403);
  }
});

// 3. استقبال رسائل Meta الواردة (POST)
app.post('/webhook/meta', async (req, res) => {
  try {
    const { body } = req;

    console.log('📥 حدث جديد وارد من Meta:', JSON.stringify(body, null, 2));

    // التأكد من أن الحدث هو رسالة واتساب
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const val = change?.value;
      const message = val?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from; // رقم المرسل
        const textBody = message.text?.body; // نص الرسالة
        const msgId = message.id; // معرف الرسالة

        console.log(`📥 رسالة واردة من Meta: ${from} | المحتوى: ${textBody}`);

        // إعداد البيانات وتمريرها لخادم Electron المحلي
        const payload = {
          from: `whatsapp:+${from}`, // تنسيق موحد متوافق مع البرنامج
          to: `whatsapp:+${val.metadata?.display_phone_number || ''}`,
          body: textBody,
          sid: msgId,
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
      }
    }

    // الرد على Meta دائماً بـ 200 OK لتجنب إيقاف الـ Webhook
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('❌ خطأ في معالجة Webhook الخاص بـ Meta:', error);
    res.sendStatus(500);
  }
});

// 4. استقبال webhook الواتساب من Twilio (POST)
app.post('/webhook/whatsapp', async (req, res) => {
  try {
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
