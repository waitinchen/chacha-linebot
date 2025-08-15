const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
require('dotenv').config();
const CHACHA_PERSONALITY = require('./personality');

const app = express();

// 儲存群組對話記錄（簡單的記憶體儲存）
const conversationHistory = new Map();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 儲存對話記錄
function saveMessage(groupId, userName, message) {
  if (!conversationHistory.has(groupId)) {
    conversationHistory.set(groupId, []);
  }
  
  const history = conversationHistory.get(groupId);
  history.push({
    user: userName,
    message: message,
    timestamp: new Date()
  });
  
  // 只保留最近50則對話
  if (history.length > 50) {
    history.shift();
  }
}

// 獲取群組對話上下文
function getConversationContext(groupId) {
  const history = conversationHistory.get(groupId) || [];
  if (history.length === 0) return "這是對話的開始。";
  
  return "最近的對話內容：\n" + 
    history.slice(-10).map(item => `${item.user}: ${item.message}`).join('\n');
}

// 檢查是否被@
function isMentioned(text, userId) {
  return text.includes(`@${userId}`) || text.includes('@查查') || text.includes('@chacha');
}

// 查查與Claude API的對話函數
async function getChatResponse(userMessage, context, userName) {
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${CHACHA_PERSONALITY}

${context}

${userName}對你說：${userMessage}

請以查查的身份回應，記住：
1. 使用你的特色口頭禪
2. 保持溫和專業的態度  
3. 如果對話中有其他人的訊息，適當地參考上下文
4. 回應要簡潔有用，不要太長篇大論`
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
        const userId = event.source.userId;
        const groupId = event.source.groupId || event.source.roomId || userId;
        const replyToken = event.replyToken;
        
        // 獲取用戶名稱
        let userName = '朋友';
        try {
          if (event.source.type === 'group') {
            const profile = await client.getGroupMemberProfile(groupId, userId);
            userName = profile.displayName;
          } else {
            const profile = await client.getProfile(userId);
            userName = profile.displayName;
          }
        } catch (e) {
          console.log('無法獲取用戶名稱，使用預設值');
        }
        
        // 儲存這則訊息到對話記錄
        saveMessage(groupId, userName, userMessage);
        
        // 檢查是否為群組且是否被@
        if (event.source.type === 'group' || event.source.type === 'room') {
          // 群組中只有被@才回應
          if (!isMentioned(userMessage, userId)) {
            continue; // 跳過，不回應
          }
        }
        
        // 獲取對話上下文
        const context = getConversationContext(groupId);
        
        // 獲取查查的回應
        const chachaResponse = await getChatResponse(userMessage, context, userName);
        
        // 儲存查查的回應到對話記錄
        saveMessage(groupId, '查查', chachaResponse);
        
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
  res.send('查查已經醒來了！沒問題，都能解決的！在群組中記得要@我哦～');
});

// 健康檢查路由
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '查查運作正常！',
    activeConversations: conversationHistory.size 
  });
});

// 啟動服務器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`查查正在港口 ${port} 等候服務！記得在群組中@我哦～`);
});
