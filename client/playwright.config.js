import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  timeout:30000,
  use:{baseURL:'http://127.0.0.1:5174',headless:true,channel:'chrome'},
  reporter:'list',
  webServer:[
    {command:'npm --prefix ../server run dev:test',url:'http://127.0.0.1:4000/api/health',reuseExistingServer:false,timeout:60000},
    {command:'npm run dev -- --port 5174',url:'http://127.0.0.1:5174',reuseExistingServer:false,timeout:60000},
  ],
});
