import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const certDir = path.resolve(__dirname, '../certs')
const certExists = fs.existsSync(path.join(certDir, 'localhost+2.pem'))

const httpsConfig = certExists
  ? {
      key: fs.readFileSync(path.join(certDir, 'localhost+2-key.pem')),
      cert: fs.readFileSync(path.join(certDir, 'localhost+2.pem')),
    }
  : undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    ...(httpsConfig && { https: httpsConfig }),
  },
})
