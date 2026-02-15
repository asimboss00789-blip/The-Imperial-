// simple Express server to proxy requests to OpenAI (or other AI provider)
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/chat', async (req, res) => {
  const prompt = req.body.prompt || '';
  const history = req.body.history || [];

  // If no API key is configured, return a simple fallback response
  if (!process.env.OPENAI_API_KEY) {
    // rule-based engine with some free intelligence
    const p = prompt.trim();
    const lower = p.toLowerCase();
    // greetings - varied responses with emoji
    const greetingMatch = lower.match(/^(hi|hello|hey|yo|howdy|greetings|sup|good (morning|afternoon|evening))\b/);
    if (greetingMatch) {
      const replies = [
        "Hello there! 😊",
        "Hey! How's it going? 👋",
        "Hiya! 👋 What's up?",
        "Greetings! 🤖",
        "Yo! Ready to chat? 😄",
        "Howdy partner! 🤠",
        "Hi! Hope you're having a great day! 🌟"
      ];
      // include the matched word to personalize
      let base = replies[Math.floor(Math.random()*replies.length)];
      // sometimes mirror the greeting
      if (Math.random() < 0.3) {
        base += ` You said "${greetingMatch[0]}".`;
      }
      return res.json({ reply: base });
    }
    if (/(how are you|how's it going)/.test(lower)) {
      const replies = [
        "I'm just a bit of code, but I'm doing fine! ⚙️",
        "Great, thanks for asking! ✨",
        "Running smoothly – how about you? 😄",
        "All systems operational. ✅"
      ];
      return res.json({ reply: replies[Math.floor(Math.random()*replies.length)] });
    }
    // time/date
    if (/time/.test(lower)) {
      return res.json({ reply: `The current time is ${new Date().toLocaleTimeString()}.` });
    }
    if (/date/.test(lower)) {
      return res.json({ reply: `Today's date is ${new Date().toLocaleDateString()}.` });
    }
    // simple calculation (digits and operators only)
    const calcMatch = lower.match(/(?:calculate|what is) ([0-9\s+\-*/().^]+)/);
    if (calcMatch) {
      try {
        const result = require('mathjs').evaluate(calcMatch[1]);
        return res.json({ reply: `Result: ${result}` });
      } catch(err) {
        // fall through to other logic
      }
    }
    // handle requests like "tell me a poem" or "give me 3 songs" or "tell me a horror story"
    {
      const tellMatch = p.match(/(?:tell me|give me|suggest)(?: a| an)?(?: (\d+))? (.+)/i);
      if (tellMatch) {
        let count = tellMatch[1] ? parseInt(tellMatch[1], 10) : 1;
        let topic = tellMatch[2].trim().replace(/[?]$/,'');
        const lowerTopic = topic.toLowerCase();
        const isRandom = /\brandom\b/.test(lower);
        const isHorror = /horror|scary|ghost|haunt/.test(lowerTopic);
        let sourcesUsed = [];
        let accumulated = [];
        // if topic is horror/story and random requested, occasionally fetch random wiki
        if (isHorror && isRandom) {
          // try to get a random horror-related wiki page
          for (let i=0;i<5 && accumulated.length<count;i++) {
            try {
              const resr = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
              const jr = await resr.json();
              if (jr && jr.extract && /horror|ghost|death|scary/.test(jr.extract.toLowerCase())) {
                accumulated.push(`(wiki) ${jr.title}: ${jr.extract.split('.').slice(0,2).join('.')}...`);
                sourcesUsed.push('wiki');
              }
            } catch{};
          }
        }
        // fetch reddit results either top or new depending on isRandom
        try {
          const q = encodeURIComponent(topic);
          let url = `https://www.reddit.com/search.json?q=${q}&limit=50`;
          if (isHorror) url += `&sort=${isRandom?'new':'top'}`;
          const r = await fetch(url, { headers: { 'User-Agent': 'TheImperialBot/1.0' } });
          const json = await r.json();
          if (json && json.data && json.data.children && json.data.children.length) {
            let items = json.data.children.map(c=>{
              const d=c.data;
              let line=d.title;
              if(d.selftext) line += `\n  ${d.selftext.slice(0,200).replace(/\n/g,' ')}${d.selftext.length>200?'...':''}`;
              if(d.subreddit) line=`r/${d.subreddit}: `+line;
              return line;
            });
            if (isRandom) {
              // pick random entries
              for (let i=0;i<count && items.length;i++) {
                const idx = Math.floor(Math.random()*items.length);
                accumulated.push(`(reddit) ${items.splice(idx,1)[0]}`);
              }
            } else {
              accumulated.push(...items.slice(0,count).map(it=>`(reddit) ${it}`));
            }
            sourcesUsed.push('reddit');
          }
        } catch(e) {
          // ignore
        }
        if (accumulated.length) {
          const reply = `Here ${count>1?'are':'is'} ${Math.min(accumulated.length,count)} item${accumulated.length>1?'s':''} for "${topic}" (searched ${[...new Set(sourcesUsed)].join(', ')}):\n${accumulated.slice(0,count).join('\n---\n')}`;
          return res.json({ reply });
        }
      }
    }
    // Stock lookup via Yahoo Finance when user mentions stock or price
    if (/\b(price of|stock)\b/.test(lower)) {
      const m = lower.match(/\b(?:price of|stock)\s+([A-Za-z\.]+)\b/);
      if (m) {
        const symbol = m[1].toUpperCase();
        try {
          const yf = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
          const yj = await yf.json();
          if (yj.quoteResponse && yj.quoteResponse.result && yj.quoteResponse.result.length) {
            const q = yj.quoteResponse.result[0];
            const price = q.regularMarketPrice;
            const pct = q.regularMarketChangePercent ? q.regularMarketChangePercent.toFixed(2) : '';
            return res.json({ reply: `${q.shortName||q.symbol}: $${price}${pct?` (${pct}% )`:''}` });
          }
        } catch(e){ /* continue */ }
      }
    }
    // explicit news queries: search r/news subreddit for top posts
    if (/\bnews\b/.test(lower)) {
      try {
        const q = encodeURIComponent(p);
        const r = await fetch(`https://www.reddit.com/r/news/search.json?q=${q}&restrict_sr=1&sort=top&limit=3`, { headers: { 'User-Agent': 'TheImperialBot/1.0' } });
        const json = await r.json();
        if (json && json.data && json.data.children && json.data.children.length) {
          const lines = json.data.children.map(c=>c.data.title).join('\n');
          return res.json({ reply: `News results:\n${lines}` });
        }
      } catch(e){ /* continue */ }
    }
    // OpenStreetMap geocode for location questions
    if (/\bwhere (is|are)\b/.test(lower) || /\bcoordinates of\b/.test(lower)) {
      try {
        const location = encodeURIComponent(p.replace(/.*where (?:is|are)\s*/i,'').replace(/[?]$/,'').trim());
        const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${location}&format=json&limit=1`,{headers:{'User-Agent':'TheImperialBot/1.0'}});
        const gj = await geo.json();
        if (gj && gj.length) {
          const item = gj[0];
          return res.json({ reply: `${item.display_name} (lat: ${item.lat}, lon: ${item.lon})` });
        }
      } catch(e){ /* continue */ }
    }
    // Automatic wiki search for questions (ends with ? or starts with interrogative)
    if (/[?]$/.test(p) || /^(who|what|when|where|why|how)\b/.test(lower)) {
      try {
        const query = encodeURIComponent(p.replace(/[?]$/,'').trim());
        const info = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`);
        const json = await info.json();
        if (json && json.extract) {
          let replyText = json.extract;
          // also try to enrich with a reddit snippet or review if available
          try {
            const r = await fetch(`https://www.reddit.com/search.json?q=${query}&sort=top&limit=3`, { headers: { 'User-Agent': 'TheImperialBot/1.0' } });
            const rj = await r.json();
            if (rj && rj.data && rj.data.children && rj.data.children.length) {
              // pick first post with selftext if possible
              let snippet = '';
              for (let c of rj.data.children) {
                const d = c.data;
                if (d.selftext && d.selftext.trim()) {
                  snippet = d.selftext.trim().split('\n').slice(0,3).join(' ');
                  break;
                }
              }
              if (!snippet) {
                snippet = rj.data.children.map(c=>c.data.title).join(' | ');
              }
              replyText += `\n\n(reddit: ${snippet.replace(/\n/g,' ').slice(0,200)}${snippet.length>200?'...':''})`;
            }
          } catch(e){/* ignore reddit fail */}
          return res.json({ reply: replyText });
        }
      } catch (e) {
        // ignore and continue
      }
    }
    // OpenLibrary book lookup if query mentions book/novel/author
    if (/\b(book|novel|author|isbn)\b/.test(lower)) {
      try {
        const searchTerm = encodeURIComponent(p.replace(/[?]$/,'').trim());
        const resol = await fetch(`https://openlibrary.org/search.json?q=${searchTerm}&limit=3`);
        const json = await resol.json();
        if (json && json.docs && json.docs.length) {
          const lines = json.docs.slice(0,3).map(d => {
            let line = d.title;
            if (d.author_name) line += ` by ${d.author_name.join(', ')}`;
            if (d.first_publish_year) line += ` (${d.first_publish_year})`;
            return line;
          }).join('\n');
          return res.json({ reply: `Book results:\n${lines}` });
        }
      } catch(e){ /* continue */ }
    }
    // Reddit search if user asks or as a fallback for non-wiki queries
    if (lower.startsWith('search reddit') || lower.startsWith('reddit') || lower.startsWith('r/')) {
      // Allow various forms: "reddit <query>" or "search reddit <query>" or include r/subreddit
      let raw = p;
      if (lower.startsWith('search reddit')) raw = p.slice(13).trim();
      else if (lower.startsWith('reddit')) raw = p.slice(6).trim();

      // look for r/subreddit pattern
      let subreddit = '';
      const subMatch = raw.match(/r\/(\w+)/);
      if (subMatch) {
        subreddit = subMatch[1];
        raw = raw.replace(subMatch[0], '').trim();
      }

      const q = encodeURIComponent(raw || subreddit || '');
      let url = `https://www.reddit.com/search.json?q=${q}&limit=5`;
      if (subreddit && !raw) {
        url = `https://www.reddit.com/r/${subreddit}.json?limit=5`;
      }
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'TheImperialBot/1.0' } });
        const json = await r.json();
        if (json && json.data && json.data.children) {
          const summaries = json.data.children.map(c=>{
            const d = c.data;
            let line = d.title;
            if (d.selftext) {
              // include first 200 chars of selftext
              line += `\n  ${d.selftext.slice(0,200).replace(/\n/g,' ')}${d.selftext.length>200?'...':''}`;
            }
            if (d.subreddit) line = `r/${d.subreddit}: ` + line;
            return line;
          }).join('\n---\n');
          return res.json({ reply: `Reddit results:\n${summaries}` });
        }
      } catch(e){ /* continue to other logic */ }
    }
    // echo fallback if nothing else
    return res.json({ reply: `Echo: ${p}` });
  }

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
