const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')

const app = express()
app.use(bodyParser.json())

// ===== APIキーを設定（GitHubにプッシュする前に必ず削除する！） =====
const LINE_ACCESS_TOKEN = '+7L52SeF0516khcX8iF6Od9nyQRDumxddUNDtHQZ6kTGsy2J5XLnDPIaAVBcrNDblSBYOFDGEegaKoAaL9MO54Zz3s9PcBiCwrh26MzbpFwVzgrzV9qgbxR2AbmgCXbNqXWnUm5lYnW7/T1ojDdX3gdB04t89/1O/w1cDnyilFU=';
const SWITCHBOT_TOKEN = 'febf9039bbd130fced0856e89d11d14de7bead2b60e15bc2fac3e7e17c94635cfeb39644c2c0591f7c6441cf578e18f7';
const DEVICE_ID = 'C13635300732';
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // `.env` から読み込むように修正
// ==================================================================

// LINE Webhookエンドポイント
app.post('/webhook', async (req, res) => {
    const events = req.body.events;

    for (const event of events) {
        if (event.message && event.message.type === 'text') {
            const userMessage = event.message.text;

            console.log(`📩 受信したメッセージ: ${userMessage}`);

            // 🔹 ChatGPT API を使ってメッセージを解析
            const shouldTurnOnBath = await analyzeMessageWithChatGPT(userMessage);

            if (shouldTurnOnBath) {
                try {
                    console.log(`🚀 Sending turnOn command to SwitchBot...`);
                    const response = await axios.post(
                        `https://api.switch-bot.com/v1.0/devices/${DEVICE_ID}/commands`,
                        {
                            command: 'turnOn',
                            parameter: 'default',
                            commandType: 'command'
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${SWITCHBOT_TOKEN}`
                            }
                        }
                    );
                    console.log("✅ SwitchBot API Response:", response.data);
                    await replyMessage(event.replyToken, 'お湯張りを開始しました！');
                } catch (error) {
                    console.error("🚨 SwitchBot API Error:", error.response ? error.response.data : error.message);
                    await replyMessage(event.replyToken, 'エラーが発生しました。');
                }
            } else {
                await replyMessage(event.replyToken, '「お風呂を準備して」「お風呂を入れて」などと送ると起動します。');
            }
        }
    }

    res.sendStatus(200);
})

// 🔹 ChatGPT API を使ってメッセージを解析
async function analyzeMessageWithChatGPT(userMessage) {
    try {
        console.log(`🤖 ChatGPT にリクエスト: ${userMessage}`);
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "あなたは家庭用スマートホームアシスタントです。ユーザーの意図を分析し、お風呂を沸かすべきかを判断してください。" },
                    { role: "user", content: userMessage }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
            console.error("🚨 ChatGPT API のレスポンスが無効です。");
            return false;
        }

        const aiResponse = response.data.choices[0].message.content;
        console.log(`🤖 ChatGPT Response: ${aiResponse}`);

        return aiResponse.includes("沸かす") || aiResponse.includes("準備する") || aiResponse.includes("お風呂");
    } catch (error) {
        console.error("🚨 ChatGPT API Error:", error.response ? error.response.data : error.message);
        return false; // エラーが出た場合は何もしない
    }
}

// LINEに返信する関数
async function replyMessage(replyToken, text) {
    try {
        const response = await axios.post(
            'https://api.line.me/v2/bot/message/reply',
            {
                replyToken: replyToken,
                messages: [{ type: 'text', text: text }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
                }
            }
        );
        console.log("✅ LINEに返信成功");
    } catch (error) {
        console.error("🚨 LINE API Error:", error.response ? error.response.data : error.message);
    }
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

