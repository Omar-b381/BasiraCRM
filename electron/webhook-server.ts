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

// استقبال webhook الواتساب من Twilio
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
