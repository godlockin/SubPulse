import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { getSubscriptionsFromSqlite, saveSubscriptionsToSqlite } from './server/db';

function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Vite Plugin for Local Server Endpoints (/api/subscriptions, /api/proxy, /api/geo)
function localServerPlugin(): Plugin {
  return {
    name: 'vite-plugin-local-server',
    configureServer(server) {
      // Subscriptions DB Endpoint
      server.middlewares.use('/api/subscriptions', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const reqUrl = new URL(req.url || '', 'http://localhost');
        const deviceId = reqUrl.searchParams.get('deviceId') || (req.headers['x-device-id'] as string) || 'device_default';

        if (req.method === 'GET') {
          try {
            const subs = getSubscriptionsFromSqlite(deviceId);
            res.end(JSON.stringify(subs));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              const subs = JSON.parse(body);
              saveSubscriptionsToSqlite(deviceId, subs);
              res.end(JSON.stringify({ success: true, deviceId, count: subs.length }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.end(JSON.stringify({ status: 'ok' }));
        }
      });

      // Subscription Fetch Server Proxy Endpoint
      server.middlewares.use('/api/proxy', async (req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const reqUrl = new URL(req.url || '', 'http://localhost');
        const urlParam = reqUrl.searchParams.get('url');

        if (!urlParam) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        try {
          const targetUrl = decodeURIComponent(urlParam);

          try {
            const redirectRes = await fetch(targetUrl, {
              redirect: 'manual',
              headers: {
                'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
              }
            });

            const location = redirectRes.headers.get('location');
            if (location) {
              const fullLocation = new URL(location, targetUrl).toString();
              const locObj = new URL(fullLocation);
              const embeddedUrl = locObj.searchParams.get('url');
              if (embeddedUrl) {
                const decodedNodeUrl = decodeURIComponent(embeddedUrl);
                if (decodedNodeUrl.startsWith('http://') || decodedNodeUrl.startsWith('https://')) {
                  const subRes = await fetch(decodedNodeUrl, {
                    headers: { 'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse' }
                  });
                  if (subRes.ok) {
                    const text = await subRes.text();
                    res.end(text);
                    return;
                  }
                } else {
                  res.end(decodedNodeUrl);
                  return;
                }
              }
            }
          } catch {}

          const fetchRes = await fetch(targetUrl, {
            redirect: 'follow',
            headers: {
              'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
            }
          });

          const text = await fetchRes.text();
          res.end(text);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(err.message || 'Proxy fetch failed');
        }
      });

      // IP Geolocation Endpoint
      server.middlewares.use('/api/geo', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const reqUrl = new URL(req.url || '', 'http://localhost');
        const ipParam = reqUrl.searchParams.get('ip') || reqUrl.searchParams.get('host');

        if (!ipParam) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing ip parameter' }));
          return;
        }

        const cleanIp = ipParam.trim();

        try {
          const fetchRes = await fetch(`http://ip-api.com/json/${cleanIp}?lang=zh-CN`);
          if (fetchRes.ok) {
            const data: any = await fetchRes.json();
            if (data && data.status === 'success') {
              const countryCode = (data.countryCode || '').toUpperCase();
              res.end(
                JSON.stringify({
                  ip: data.query || cleanIp,
                  country: data.country || countryCode,
                  countryCode,
                  city: data.city || '',
                  isp: data.isp || data.org || '',
                  flag: getCountryFlagEmoji(countryCode)
                })
              );
              return;
            }
          }
        } catch {}

        res.statusCode = 502;
        res.end(JSON.stringify({ error: 'Failed to lookup IP geolocation' }));
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localServerPlugin()],
  server: {
    port: 3001,
    host: true
  }
});
