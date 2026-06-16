import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load env vars from .env if exists
if (fs.existsSync(path.resolve(__dirname, '.env'))) {
  const envContent = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vercel-api-dev-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/')) {
            const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
            const apiPath = parsedUrl.pathname;
            const filePath = path.resolve(__dirname, `.${apiPath}.js`);

            if (fs.existsSync(filePath)) {
              try {
                // Parse query parameters
                req.query = Object.fromEntries(parsedUrl.searchParams.entries());

                // Clear require cache for development hot-reloading
                delete require.cache[require.resolve(filePath)];
                delete require.cache[require.resolve('./api/_db.js')];

                const handler = require(filePath);
                if (typeof handler === 'function') {
                  await handler(req, res);
                  return;
                }
              } catch (err) {
                console.error(`Error executing API handler ${apiPath}:`, err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                return;
              }
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: '127.0.0.1'
  }
});
