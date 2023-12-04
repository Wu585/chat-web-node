const express = require('express')
const cors = require('cors')

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

    const stream = await openai.chat.completions.create({
        messages: [{role: 'assistant', content: '讲一个50字故事'}],
        model: 'gpt-3.5-turbo',
        stream: true
    });

    for await (const part of stream) {
        const message = part.choices[0]?.delta?.content || ''
        const data = {message};
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
})

app.listen(port, () => {
    console.log('Listen on port 3000')
})
