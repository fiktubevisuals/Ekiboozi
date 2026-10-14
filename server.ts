import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import { generateVideoJsonLd } from './src/utils/seoUtils';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Pesapal endpoints
  app.post('/api/pesapal/order', async (req, res) => {
    try {
      const { amount, description, reference, email, phone, donorName } = req.body;
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Invalid payment amount specified.' });
      }

      const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || 'default_key';
      const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || 'default_secret';
      const PESAPAL_ENV = process.env.PESAPAL_ENV || 'production';

      if (
        !PESAPAL_CONSUMER_KEY ||
        PESAPAL_CONSUMER_KEY === 'default_key' ||
        PESAPAL_CONSUMER_KEY === 'MY_PESAPAL_KEY' ||
        !PESAPAL_CONSUMER_SECRET ||
        PESAPAL_CONSUMER_SECRET === 'default_secret' ||
        PESAPAL_CONSUMER_SECRET === 'MY_PESAPAL_SECRET'
      ) {
        return res.status(400).json({
          error: 'Pesapal payment gateway credentials are not yet configured in server environment. No payment was initiated or recorded.'
        });
      }

      const baseUrl = PESAPAL_ENV === 'production' 
        ? 'https://pay.pesapal.com/v3'
        : 'https://cybqa.pesapal.com/pesapalv3';

      // 1. Get Auth Token
      const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          consumer_key: PESAPAL_CONSUMER_KEY,
          consumer_secret: PESAPAL_CONSUMER_SECRET
        })
      });
      
      const authData = await authResponse.json();
      if (!authResponse.ok || !authData.token) {
        if (authData?.error?.code === 'invalid_consumer_key_or_secret_provided') {
          return res.status(400).json({
            error: `Invalid Pesapal API Keys for environment: ${PESAPAL_ENV}. Please check your credentials.`
          });
        }
        return res.status(500).json({
          error: `Pesapal authentication failed: ${authData?.message || authData?.error?.message || 'Check credentials'}`
        });
      }

      // 2. Register IPN if missing
      let ipnId = process.env.PESAPAL_IPN_ID;
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const callbackBase = `${protocol}://${host}`;

      if (!ipnId || ipnId === 'MY_PESAPAL_IPN_ID') {
        try {
          const ipnResponse = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${authData.token}`
            },
            body: JSON.stringify({
              url: `${callbackBase}/api/pesapal/ipn`,
              ipn_notification_type: 'POST'
            })
          });
          const ipnData = await ipnResponse.json();
          if (ipnData.ipn_id) {
            ipnId = ipnData.ipn_id;
          } else {
            ipnId = '12345678-1234-1234-1234-123456789012';
          }
        } catch {
          ipnId = '12345678-1234-1234-1234-123456789012';
        }
      }

      // 3. Submit Order Request
      const names = (donorName || 'Supporter').trim().split(' ');
      const firstName = names[0] || 'Kind';
      const lastName = names.slice(1).join(' ') || 'Supporter';

      const orderPayload = {
        id: reference,
        currency: 'UGX',
        amount: numAmount,
        description: description || 'Payment on Ekiboozi',
        callback_url: `${callbackBase}/payment/callback`,
        notification_id: ipnId,
        billing_address: {
          email_address: email || 'supporter@ekiboozi.com',
          phone_number: phone || '',
          country_code: 'UG',
          first_name: firstName,
          middle_name: '',
          last_name: lastName,
          line_1: '',
          line_2: '',
          city: 'Kampala',
          state: 'Central',
          postal_code: '256',
          zip_code: '256'
        }
      };

      const orderResponse = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify(orderPayload)
      });
      
      const orderData = await orderResponse.json();
      
      if (orderData.error) {
        return res.status(400).json({ error: orderData.error.message || 'Error submitting order to Pesapal.' });
      }

      res.json({
        redirect_url: orderData.redirect_url,
        order_tracking_id: orderData.order_tracking_id,
        reference
      });

    } catch (error: any) {
      console.error('Pesapal order error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Pesapal Instant Payment Notification (IPN) webhook
  app.all('/api/pesapal/ipn', async (req, res) => {
    try {
      const orderTrackingId = (req.query.OrderTrackingId || req.body?.OrderTrackingId || '') as string;
      const orderMerchantReference = (req.query.OrderMerchantReference || req.body?.OrderMerchantReference || '') as string;
      const orderNotificationType = (req.query.OrderNotificationType || req.body?.OrderNotificationType || 'IPNCHANGE') as string;

      console.log('Pesapal IPN callback:', { orderTrackingId, orderMerchantReference, orderNotificationType });

      // Pesapal requires responding with the exact object
      res.json({
        orderNotificationType,
        orderTrackingId,
        orderMerchantReference,
        status: 200
      });
    } catch (err: any) {
      console.error('Pesapal IPN handler error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Payment callback redirect to SPA root with search query
  app.get('/payment/callback', (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    res.redirect(`/${qs ? `?${qs}` : ''}`);
  });

  // Status check endpoint
  app.get('/api/pesapal/status', async (req, res) => {
    try {
      const { order_tracking_id } = req.query;
      
      if (!order_tracking_id) {
        return res.status(400).json({ error: 'Missing order_tracking_id' });
      }

      const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || 'default_key';
      const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || 'default_secret';
      const PESAPAL_ENV = process.env.PESAPAL_ENV || 'production';

      if (
        !PESAPAL_CONSUMER_KEY ||
        PESAPAL_CONSUMER_KEY === 'default_key' ||
        PESAPAL_CONSUMER_KEY === 'MY_PESAPAL_KEY' ||
        !PESAPAL_CONSUMER_SECRET ||
        PESAPAL_CONSUMER_SECRET === 'default_secret' ||
        PESAPAL_CONSUMER_SECRET === 'MY_PESAPAL_SECRET'
      ) {
        return res.status(400).json({
          error: 'Pesapal payment gateway credentials are not configured.',
          isCompleted: false,
          status: 'Unconfigured'
        });
      }

      const baseUrl = PESAPAL_ENV === 'production' 
        ? 'https://pay.pesapal.com/v3'
        : 'https://cybqa.pesapal.com/pesapalv3';

      // 1. Get Auth Token
      const authResponse = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          consumer_key: PESAPAL_CONSUMER_KEY,
          consumer_secret: PESAPAL_CONSUMER_SECRET
        })
      });
      
      const authData = await authResponse.json();
      if (!authResponse.ok || !authData.token) {
        return res.status(500).json({
          error: 'Failed to authenticate with Pesapal to verify status.',
          isCompleted: false
        });
      }

      // 2. Check Status
      const statusResponse = await fetch(`${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${order_tracking_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        }
      });
      
      const statusData = await statusResponse.json();

      // Pesapal status codes: 1 = COMPLETED, 0 = INVALID, 2 = FAILED, 3 = REVERSED
      const statusDesc = (statusData.payment_status_description || '').toLowerCase();
      const isCompleted = statusData.status_code === 1 || statusDesc === 'completed';

      res.json({
        ...statusData,
        isCompleted,
        verifiedStatus: isCompleted ? 'Completed' : (statusData.payment_status_description || 'Pending')
      });
    } catch (error: any) {
      console.error('Pesapal status error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error', isCompleted: false });
    }
  });

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function injectVideoSeoIntoHtml(html: string, videoId: string, origin: string): Promise<string> {
    try {
      const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (!fs.existsSync(configPath)) return html;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      const app = getApps().find(a => a.name === 'seo-server') || initializeApp(config, 'seo-server');
      const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

      const videoSnap = await getDoc(doc(db, 'videos', videoId));
      if (!videoSnap.exists()) return html;

      const video = { id: videoSnap.id, ...videoSnap.data() } as any;
      const videoTitle = `${video.title || 'Video'} – Ekiboozi`;
      const cleanDesc = (video.description || `Watch ${video.title} on Ekiboozi`).slice(0, 200).trim();
      const canonicalUrl = `${origin}/?v=${encodeURIComponent(videoId)}`;
      const imageUrl = video.thumbnailUrl 
        ? (video.thumbnailUrl.startsWith('http') ? video.thumbnailUrl : `${origin}${video.thumbnailUrl.startsWith('/') ? '' : '/'}${video.thumbnailUrl}`) 
        : `${origin}/pwa-512x512.png`;
      const uploadDate = video.createdAt || new Date().toISOString();

      const videoJsonLd = generateVideoJsonLd(video, origin);

      let enriched = html;

      // Replace <title>
      enriched = enriched.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(videoTitle)}</title>`);

      // Replace meta description
      enriched = enriched.replace(
        /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(cleanDesc)}" />`
      );

      // Replace canonical link
      if (enriched.includes('rel="canonical"')) {
        enriched = enriched.replace(/<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
      } else {
        enriched = enriched.replace('</head>', `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n  </head>`);
      }

      // Replace Open Graph & Twitter meta tags
      enriched = enriched.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(videoTitle)}" />`);
      enriched = enriched.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(cleanDesc)}" />`);
      enriched = enriched.replace(/<meta\s+property="og:type"\s+content=".*?"\s*\/?>/i, `<meta property="og:type" content="video.other" />`);
      enriched = enriched.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i, `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />\n    <meta property="video:release_date" content="${uploadDate}" />\n    <meta property="video:actor" content="${escapeHtml(video.channel || 'Creator')}" />`);

      enriched = enriched.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(videoTitle)}" />`);
      enriched = enriched.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(cleanDesc)}" />`);
      enriched = enriched.replace(/<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i, `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`);

      // Replace Schema.org JSON-LD
      const jsonLdBlock = `<script id="schema-video-object" type="application/ld+json">\n${JSON.stringify(videoJsonLd, null, 2)}\n    </script>`;
      if (enriched.includes('id="schema-video-object"')) {
        enriched = enriched.replace(/<script\s+id="schema-video-object"\s+type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdBlock);
      } else {
        enriched = enriched.replace('</head>', `    ${jsonLdBlock}\n  </head>`);
      }

      return enriched;
    } catch (err) {
      console.warn('Could not inject video SEO into HTML:', err);
      return html;
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Intercept root GET when ?v= or ?video= is present to provide instant crawler Open Graph & JSON-LD
    app.get('/', async (req, res, next) => {
      const vId = (req.query.v || req.query.video) as string;
      if (!vId) return next();

      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const origin = `${protocol}://${req.get('host')}`;
        const enrichedHtml = await injectVideoSeoIntoHtml(template, vId, origin);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(enrichedHtml);
      } catch {
        next();
      }
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    app.get('/', async (req, res, next) => {
      const vId = (req.query.v || req.query.video) as string;
      if (!vId) return next();

      try {
        const template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const origin = `${protocol}://${req.get('host')}`;
        const enrichedHtml = await injectVideoSeoIntoHtml(template, vId, origin);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(enrichedHtml);
      } catch {
        next();
      }
    });

    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      const vId = (req.query.v || req.query.video) as string;
      const indexPath = path.join(distPath, 'index.html');
      if (vId) {
        try {
          const template = fs.readFileSync(indexPath, 'utf-8');
          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
          const origin = `${protocol}://${req.get('host')}`;
          const enrichedHtml = await injectVideoSeoIntoHtml(template, vId, origin);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(enrichedHtml);
        } catch {
          // fallback
        }
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
