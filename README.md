# The-Imperial-

This project is a simple multi‑page static site with a dark-themed AI chat interface and a built‑in bookmark manager. The bookmarks page lets you search manga/manhwa via the Jikan API and save links locally; search results now include cover thumbnails that hide automatically if they fail to load.

The AI page is designed to call a backend service that you need to run locally or host in order for the assistant to behave intelligently.

## Running locally

The site now includes a persistent header with a **menu button on the top‑left** that opens a half‑screen overlay for navigation; it’s mobile‑friendly and works on small screens with the title shifted to the right. The overlay always uses half the viewport width, even on phones, so you can see part of the page behind it.

1. **Install dependencies** (Node.js is required):
   ```bash
   npm install express node-fetch
   ```

2. **Set your OpenAI API key** (or any compatible AI service) as an environment variable:
   ```bash
   export OPENAI_API_KEY="your_key_here"
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

   This will serve `index.html` and `ai.html`; the chat page will POST to `/chat` which forwards the prompt to the AI provider.

4. Open `http://localhost:3000` in a browser and click **AI Assistant** to use the chat. Messages are stored in `localStorage` so the conversation persists across reloads.

## Deployment

You can deploy the static files anywhere (GitHub Pages, Netlify, etc.). All pages share a consistent header and overlay navigation. For the AI functionality you need a server component like `server.js` running on a host that supports Node.js and has your API key set. Adjust the fetch URL in `ai.html` accordingly if the API is hosted on a different domain.

---

All other changes are tracked in git; push to `main` to update the live site.  
Be sure not to commit your `OPENAI_API_KEY` or other secrets.

### Built-in data sources

The server’s fallback engine can answer queries using public data. If you ask a question (either ending with a `?` or starting with words like who/what/when/where/why/how) it will automatically try to look up the subject on Wikipedia and return the summary.

**Friendly greetings:** The bot recognises many salutations (hi, hello, hey, yo, howdy, greetings, sup, good morning/afternoon/evening) and replies with a varied, emoji‑decorated response. It won’t just repeat the same line over and over.

You can also ask for recommendations directly: phrases like **"tell me a poem"**, **"give me 3 songs"**, or **"suggest 2 short stories"** trigger a Reddit search for the requested topic. The bot fetches the top (`sort=top`) posts and returns the requested number of results, including snippets of text when available. This means you don’t have to specify the word "reddit" – the engine figures out you want examples and pulls them for you.

Similarly, Reddit is treated as a general knowledge source – prompts beginning with **"reddit"**, **"search reddit"**, or **"r/…"** still work, and the assistant returns titles and snippets of matching posts (including story text if present). The logic will fall back to Reddit when Wikipedia doesn’t return a result.

The assistant now attempts to enrich answers by combining multiple sources when appropriate. For example, a Wikipedia lookup will automatically append a couple of relevant Reddit post titles to give you community context and the reply will note which sources were queried.  

On the client side, the chat input remains active while the bot thinks so typing doesn't feel stuck, and any reply that simply echoes the question is converted into a polite apology.

If the fallback engine doesn’t know an answer it will now perform a quick Wikipedia or Reddit search before giving up, and the default message is a polite "Sorry, I couldn't find an answer..." instead of simply echoing your input. The client also filters out any stray "Echo:" prefixes for a cleaner experience.

As part of this, recommendation requests ("tell me a horror story", "give me 2 songs", etc.) use multiple data feeds.  
- If you ask for popular items the bot will pull top Reddit posts or Wikipedia entries.  
- If you ask for something random the bot will select at random (e.g. a random horror wiki page or a newly posted Reddit story).  
- Source labels such as `(reddit)` or `(wiki)` are added to each result so you can see where it came from.  

You can add additional sources by editing `server.js` and adding similar conditional fetches for other open APIs. Examples of freely accessible data sources include:

* **Wikimedia family** – Wikipedia, Wiktionary, Wikiquote, etc. (use the same REST API with different domains)
* **Reddit** – public JSON endpoints for search and subreddit listings (no key required)
* **OpenStreetMap** – map data and location info via Nominatim API (the bot now answers "where is Paris?" with lat/long via this service)
* **OpenLibrary** – free book/author search; the bot will respond to queries mentioning books, novels or authors with top matches.
* **Yahoo Finance (unofficial)** – stock price lookup with queries like "price of AAPL" or "stock GOOG" (no API key required).
* **Reddit r/news** – news queries trigger a search of the r/news subreddit and return top headlines.
* **Project Gutenberg** – free public-domain books via FTP or APIs such as `gutenberg.org/cache/epub/`
* **News APIs** – e.g. [NewsAPI.org](https://newsapi.org/), [GDELT](https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/)
* **Public data portals** (data.gov, EU Open Data, etc.) offering CSV/JSON feeds
* **OMDb API** – movie information (free tier with API key)
* **Dictionary APIs** – e.g. [Free Dictionary API](https://dictionaryapi.dev/)

Each of these can be queried with `fetch` and their results incorporated into replies.  
You’re welcome to adapt the fallback logic to automatically decide which source suits a given question.


## Running on Replit

This repo includes a `.replit` file and `package.json` so you can drop it into Replit and have it work automatically.  
When you open it there, the editor will run `npm install && npm start`; the server listens on the `PORT` environment variable provided by Replit.  
Set your `OPENAI_API_KEY` via the Replit environment variables panel and the chat will function.  
The static pages (`index.html`, `ai.html`, `bookmarks.html`, `categories.html`) will be served from the root, and the bookmark search will work using the public Jikan API.

---
