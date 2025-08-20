const express = require('express');
const app = express();

// 最簡單的路由
app.get('/', (req, res) => {
  console.log('收到請求！');
  res.send('Hello World! 查查測試中...');
});

app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Test successful' });
});

// 重要：確保監聽所有接口
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
