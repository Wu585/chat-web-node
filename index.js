const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const url = require('url')
const uuid = require('uuid');
const queryString = require('querystring');

const WebSocket = require('ws')

const {HttpsProxyAgent} = require("https-proxy-agent")
const OpenAI = require("openai")
const agent = new HttpsProxyAgent('http://127.0.0.1:7890');

const openai = new OpenAI({
    apiKey: "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",
    httpAgent: agent
})

const app = express()
const port = 3000

app.use(cors())

app.get('/sse', async (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    })
    res.flushHeaders();
    const parsedUrl = url.parse(req.url);
    // 获取查询字符串参数对象
    const queryParams = queryString.parse(parsedUrl.query);
    const stream = await openai.chat.completions.create({
        messages: [{role: 'assistant', content: queryParams.prompt}],
        model: 'gpt-3.5-turbo',
        stream: true
    });

    for await (const part of stream) {
        const message = part.choices[0]?.delta?.content || ''
        const data = {message};
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
})

const wss = new WebSocket.WebSocketServer({port: 9527});

wss.on('connection', async (ws) => {
    ws.on('error', console.error);

    ws.on('message', function message(data) {
        const randomFileName = uuid.v4();
        const speechFile = path.resolve(`./${randomFileName}.mp3`);
        const message = data.toString()

        openai.chat.completions.create({
            messages: [{role: 'assistant', content: message}],
            model: 'gpt-3.5-turbo',
            // stream: true
        }).then(res => {
            const answer = res.choices[0].message.content
            openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: answer,
            }).then(async (mp3) => {
                const buffer = Buffer.from(await mp3.arrayBuffer());
                ws.send(buffer, {binary: true})
                console.log('File sent to client');
                /*await fs.promises.writeFile(speechFile, buffer);
                fs.readFile(speechFile, (err, data) => {
                    ws.send(data, {binary: true});
                    console.log('File sent to client');
                    fs.unlink(speechFile, () => {
                    })
                })*/
            })
        })
    });
});

app.listen(port, () => {
    console.log('Listen on port 3000')
})
