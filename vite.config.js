import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3171,
    strictPort: true,
  },
  // 테스트는 최상위 tests/ 폴더에만 둠 — electron/ 이나 src/ 옆에 두면 패키징(asar)에 같이
  // 딸려 들어가므로. DOM이 필요 없는 로직(파서·파일 처리·스토어 액션)만 다루므로 node 환경.
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
})
