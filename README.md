# The-Imperial-

This project is a simple multi‑page static site with a dark-themed AI chat interface. The AI page is designed to call a backend service that you need to run locally or host in order for the assistant to behave intelligently.

## Running locally

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

You can deploy the static files anywhere (GitHub Pages, Netlify, etc.). For the AI functionality you need a server component like `server.js` running on a host that supports Node.js and has your API key set. Adjust the fetch URL in `ai.html` accordingly if the API is hosted on a different domain.

---

All other changes are tracked in git; push to `main` to update the live site.  
Be sure not to commit your `OPENAI_API_KEY` or other secrets.
