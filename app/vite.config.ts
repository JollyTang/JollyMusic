import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  base: process.env.GITHUB_PAGES ? '/JollyMusic/' : '/',
});
