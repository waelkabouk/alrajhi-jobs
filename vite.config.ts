import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      {
        name: 'api-mock',
        configureServer(server) {
          server.middlewares.use('/api/jobs', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/json');
            
            try {
              const fetchRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/jobs?status=eq.active&select=id,title_ar,title_en,job_type,sector,location&order=created_at.desc`, {
                headers: {
                  'apikey': env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  'Authorization': `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`
                }
              });
              const data = await fetchRes.json();
              res.end(JSON.stringify(data));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
            }
          });
        }
      }
    ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-accordion",
          ],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
  };
});
