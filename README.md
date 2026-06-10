# Conveyor Calculator — LINE Chatbot

A LINE chatbot that asks for **every** conveyor-calculator input one by one
(showing each default value), then sends you a **browser link** that opens the
full HTML calculator with all your data pre-filled and already calculated.

```
You (LINE)            Bot
  start          →    "Handling rate (Qt) [t/h]  (default: 18000 — reply '-')"
  -              →    "Bulk density (ρ) [kg/m³]  (default: 970 — reply '-')"
  1396           →    "Surcharge angle (β) [°]   (default: 20 …)"
  …                   … (46 global inputs)
  3              →    "How many segments?" → 3 → asks L, ΔH, l₀, l_u, trough × 3
  (done)         →    https://yoursite/conveyor_calculator.html?state=…  ← tap to open
```

---

## How the pieces fit

| Piece | What it is | Where it lives |
|-------|-----------|----------------|
| `conveyor_calculator.html` | the full calculator UI | static hosting (GitHub Pages, Netlify, S3…) |
| `index.js` (this bot) | asks questions, builds the link | Node.js server (Render, Railway, Fly.io, a VPS…) |
| LINE Messaging API | the chat channel | LINE Developers console |

The bot encodes all answers into a `?state=<base64>` URL the HTML already knows
how to read (it auto-fills and auto-calculates on load).

---

## 1. Host the calculator HTML

Upload `conveyor_calculator.html` somewhere public over **HTTPS**. Easiest:

- **GitHub Pages**: push the file to a repo, enable Pages → URL like
  `https://USER.github.io/REPO/conveyor_calculator.html`
- **Netlify / Vercel**: drag-drop the file → get a URL
- Any web server you control

Copy that final URL — you'll set it as `CALCULATOR_URL`.

> The HTML was updated to accept `?state=<base64-json>`. Make sure you deploy the
> updated file (the one that contains the comment "URL state (from LINE bot…)").

---

## 2. Create a LINE Messaging API channel

1. Go to <https://developers.line.biz/console/>
2. Create a **Provider** → create a **Messaging API channel**
3. From the channel's **Basic settings** copy the **Channel secret**
4. From **Messaging API** tab issue & copy a **Channel access token (long-lived)**
5. In the **Messaging API** tab:
   - Turn **Use webhook** = ON
   - Set **Webhook URL** = `https://YOUR-SERVER/webhook` (filled after step 3)
   - Turn **Auto-reply messages / Greeting** = OFF (so the bot controls replies)

---

## 3. Deploy the bot server

```bash
cd line-bot
npm install
# set env vars (example for local run)
export CHANNEL_ACCESS_TOKEN="paste-token"
export CHANNEL_SECRET="paste-secret"
export CALCULATOR_URL="https://USER.github.io/REPO/conveyor_calculator.html"
npm start
```

The server listens on `PORT` (default 3000) and exposes:
- `POST /webhook` — the LINE webhook
- `GET /` — health check

### Hosting options (pick one)

**Render.com (free tier, simplest)**
1. Push this `line-bot` folder to a GitHub repo
2. New → Web Service → connect the repo
3. Build command `npm install`, start command `node index.js`
4. Add env vars `CHANNEL_ACCESS_TOKEN`, `CHANNEL_SECRET`, `CALCULATOR_URL`
5. Deploy → copy the public URL → set LINE Webhook URL to `https://…onrender.com/webhook`

**Railway / Fly.io / a VPS with HTTPS** — same idea: set the 3 env vars, run `node index.js`, point the LINE webhook at `/webhook`.

> LINE **requires HTTPS** for the webhook. Render/Railway/Fly give you HTTPS
> automatically. On a bare VPS use a reverse proxy (Caddy/Nginx) with a cert.

---

## 4. Test it

1. Add the bot as a friend (QR code in the LINE console)
2. Send **start**
3. Answer each prompt with a number, or **-** to accept the default
4. After the segments, tap the link → the calculator opens, fully filled, results shown

### Commands
| Type | Does |
|------|------|
| `start` | begin a new calculation |
| `-` | accept the shown default |
| `back` | re-ask the previous field |
| `cancel` | stop |
| `help` | show help |

---

## Notes & limits

- **Sessions are in memory.** If the server restarts mid-conversation the user
  must `start` again. For production, store `sessions` in Redis or a database.
- The bot fills the global **input profile**; per-case Lift overrides aren't asked
  (the calculator still computes all 7 cases from the segments you give).
- The link can get long (~1–2 KB) because it carries every value. LINE handles it
  fine. If you ever hit URL-length issues, host a tiny "save state, return short id"
  endpoint and link to `?id=abc` instead.
- Want a button instead of a raw link? Replace the final text message with a LINE
  **Flex/Button template** whose URI action is the link (see LINE SDK docs).

---

## File list

```
line-bot/
  index.js        ← the bot server (question flow + link builder)
  fields.js       ← every input + default, and the segment fields
  package.json    ← dependencies (@line/bot-sdk, express)
  README.md       ← this file
```
