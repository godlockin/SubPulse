import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { getSubscriptionsFromSqlite, saveSubscriptionsToSqlite } from './server/db';

// Vite Plugin for Local SQLite Database API keyed by deviceId
function sqliteApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-sqlite-api',
    configureServer(server) {
      server.middlewares.use('/api/subscriptions', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Extract deviceId from query or header
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
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), sqliteApiPlugin()],
  server: {
    port: 3001,
    host: true
  }
});
