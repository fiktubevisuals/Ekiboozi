import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Pesapal endpoints
  app.post('/api/pesapal/order', async (req, res) => {
    try {
      const { amount, description, reference } = req.body;
      const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || 'default_key';
      const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || 'default_secret';
      // Default to production as it's more likely what users intend when they bring their own keys
      const PESAPAL_ENV = process.env.PESAPAL_ENV || 'production';

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
          throw new Error(`Invalid Pesapal API Keys for environment: ${PESAPAL_ENV}. If using Live/Production keys, please set PESAPAL_ENV="production" in your AI Studio Secrets.`);
        }
        throw new Error(`Failed to get Pesapal token: ${JSON.stringify(authData)}`);
      }

      // 2. Register IPN if missing
      let ipnId = process.env.PESAPAL_IPN_ID;
      if (!ipnId || ipnId === 'MY_PESAPAL_IPN_ID') {
        const ipnResponse = await fetch(`${baseUrl}/api/URLSetup/RegisterIPN`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authData.token}`
          },
          body: JSON.stringify({
            url: `https://${req.get('host')}/api/pesapal/ipn`,
            ipn_notification_type: 'POST'
          })
        });
        const ipnData = await ipnResponse.json();
        if (ipnData.error) {
           console.warn('Failed to dynamically register IPN, using dummy', ipnData);
           ipnId = '12345678-1234-1234-1234-123456789012';
        } else {
           ipnId = ipnData.ipn_id;
        }
      }

      // 3. Submit Order Request
      const orderPayload = {
        id: reference,
        currency: 'UGX',
        amount: parseFloat(amount),
        description: description,
        callback_url: `https://${req.get('host')}/payment/callback`,
        notification_id: ipnId,
        billing_address: {
          email_address: 'john@example.com',
          phone_number: '',
          country_code: 'UG',
          first_name: 'Guest',
          middle_name: '',
          last_name: 'User',
          line_1: '',
          line_2: '',
          city: '',
          state: '',
          postal_code: '',
          zip_code: ''
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
        throw new Error(orderData.error.message || 'Error submitting order');
      }

      res.json({
        redirect_url: orderData.redirect_url,
        order_tracking_id: orderData.order_tracking_id
      });

    } catch (error: any) {
      console.error('Pesapal error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  app.get('/api/pesapal/status', async (req, res) => {
    try {
      const { order_tracking_id } = req.query;
      
      if (!order_tracking_id) {
        return res.status(400).json({ error: 'Missing order_tracking_id' });
      }

      const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || 'default_key';
      const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || 'default_secret';
      const PESAPAL_ENV = process.env.PESAPAL_ENV || 'production';

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
        throw new Error('Failed to authenticate with Pesapal to check status.');
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
      
      res.json(statusData);
    } catch (error: any) {
      console.error('Pesapal status error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
