import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    headers: {
      // Ensure JAR files are served with correct MIME type
      'Access-Control-Allow-Origin': '*',
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // Custom plugin to handle CWASA file requests
    {
      name: 'cwasa-file-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          
          // Intercept any request containing /jas/ path (including nested routes)
          // Examples: /sign-language/jas/, ./jas/, /jas/
          const jasMatch = url.match(/\/jas\/loc2021\/(.*)/);
          if (jasMatch) {
            const relativePath = jasMatch[1].split('?')[0];
            const filePath = path.join(__dirname, 'public', 'jas', 'loc2021', relativePath);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              // Determine MIME type
              let contentType = 'application/octet-stream';
              if (url.endsWith('.json')) contentType = 'application/json';
              else if (url.endsWith('.jar')) contentType = 'application/java-archive';
              else if (url.endsWith('.properties')) contentType = 'text/plain';
              else if (url.endsWith('.sigml')) contentType = 'application/xml';
              
              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Cache-Control', 'no-cache');
              return fs.createReadStream(filePath).pipe(res);
            }
          }
          
          next();
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure JAR and other binary files are served correctly
  assetsInclude: ['**/*.jar', '**/*.sigml', '**/*.properties'],
}));
