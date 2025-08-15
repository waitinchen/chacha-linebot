const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
require('dotenv').config();
const CHACHA_PERSONALITY = require('./personality');

const app = express();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 查查與Claude API的對話函數
async function getChatResponse(userMessage) {
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${CHACHA_PERSONALITY}\n\n使用者訊息：${userMessage}\n\n請以查查的身份回應，記住你的語氣特色和專業領域。`
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    return response.data.content[0].text;
  } catch (error) {
    console.error('Claude API錯誤:', error);
    return '還好啦，我現在有點忙，稍後再聊好嗎？沒問題的！';
  }
}

// LINE Webhook處理
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        
        // 獲取查查的回應
        const chachaResponse = await getChatResponse(userMessage);
        
        // 回覆訊息
        await client.replyMessage(replyToken, {
          type: 'text',
          text: chachaResponse
        });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('處理訊息錯誤:', error);
    res.status(500).send('錯誤');
  }
});

// 基本路由
app.get('/', (req, res) => {
  res.send('查查已經醒來了！沒問題，都能解決的！');
});

// 啟動服務器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`查查正在港口 ${port} 等候服務！`);
});
