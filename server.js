// simple Express server to proxy requests to OpenAI (or other AI provider)
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const prompt = req.body.prompt || '';
  const history = req.body.history || [];
  try {
    // build conversation array for OpenAI using provided history + new prompt
    const messages = [];
    history.forEach(msg => {
      messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
    });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 150,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    res.json({ reply: reply || '[no reply]' });
  } catch (err) {
    console.error('chat error', err);
    res.status(500).json({ error: 'failed to contact AI' });
  }
});

// (Optional) You could also add a proxy endpoint for the bookmarks page if necessary
// e.g. app.post('/bookmarks', ...)


// serve static files
app.use(express.static('.'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
