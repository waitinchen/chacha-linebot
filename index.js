const express = require('express');
const app = express();

// 基本中間件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康檢查路由（Railway需要）
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'chacha-linebot'
  });
});

// 基本路由
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.status(200).send('Hello World! 查查測試中... 時間: ' + new Date().toISOString());
});

// 測試路由
app.get('/test', (req, res) => {
  console.log('Test route accessed');
  res.status(200).json({ 
    message: 'Test successful',
    timestamp: new Date().toISOString(),
    service: 'chacha-linebot'
  });
});

// 簡單的webhook測試路由
app.post('/webhook', (req, res) => {
  console.log('Webhook called');
  res.status(200).send('Webhook OK');
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404處理
app.use((req, res) => {
  console.log('404 - Path not found:', req.path);
  res.status(404).json({ error: 'Path not found' });
});

// 啟動服務器 - Railway優化
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`🚀 Server running on http://${host}:${port}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
