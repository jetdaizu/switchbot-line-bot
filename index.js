require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// ✅ 環境変数を使うように変更！
const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const SWITCHBOT_TOKEN = process.env.SWITCHBOT_TOKEN;
const DEVICE_ID = process.env.DEVICE_ID;

if (!SWITCHBOT_TOKEN || !LINE_ACCESS_TOKEN || !DEVICE_ID) {
    console.error("🚨 ERROR: 環境変数が設定されていません！");
    process.exit(1);
}

// LINE Webhookエンドポイント
app.post('/webhook', async (req, res) => {
    const events = req.body.events;

    for (const event of events) {
        if (event.message && event.message.type === 'text') {
            const userMessage = event.message.text;

            // 「お風呂入れて」と送信されたらSwitchBotをONにする
            if (userMessage === 'お風呂入れて') {
                try {
                    console.log(`🚀 Sending turnOn command to SwitchBot...`);
                    const response = await axios.post(
                        `https://api.switch-bot.com/v1.0/devices/${DEVICE_ID}/commands`, // ✅ `v1.0` に修正！
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
                await replyMessage(event.replyToken, '「お風呂入れて」と送ると起動します。');
            }
        }
    }

    res.sendStatus(200);
});

// LINEに返信する関数
function replyMessage(replyToken, text) {
    return axios.post(
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
}

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

