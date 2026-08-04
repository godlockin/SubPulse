import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { getSubscriptionsFromSqlite, saveSubscriptionsToSqlite } from './server/db';

// Vite Plugin for Local SQLite Database API & Subscription Fetch Proxy
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
          const fetchRes = await fetch(decodeURIComponent(urlParam), {
            headers: {
              'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
            }
          });

          const text = await fetchRes.text();
          const finalUrl = fetchRes.url || urlParam;

          if (!fetchRes.ok || text.includes('error code: 502') || text.includes('502 Bad Gateway')) {
            try {
              const urlObj = new URL(finalUrl);
              const embeddedUrl = urlObj.searchParams.get('url');
              if (embeddedUrl) {
                const decodedNodeUrl = decodeURIComponent(embeddedUrl);
                res.end(decodedNodeUrl);
                return;
              }
            } catch {}
          }

          res.end(text);
        } catch (err: any) {
          res.statusCode = 500;
          res.end(err.message || 'Proxy fetch failed');
        }
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
