# BCRE Demo Spot

A fun, carousel-based showcase for interactive demos and prototypes. Drop in a URL and Demo Spot automatically captures a screenshot and generates a description.

## Quick Start

```bash
npm install
npm start          # → http://localhost:3000
```

## Adding Prototypes

**Via the UI:** Click **"Add Prototype"**, paste a URL, and hit **Capture**. Demo Spot launches a headless browser, screenshots the page, extracts a title & description, and adds it to the carousel.

**Via API:**
```bash
curl -X POST http://localhost:3000/api/prototypes \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

## Tech Stack

- **Express** — lightweight server
- **Puppeteer** — headless Chrome for screenshots
- **Cheerio** — HTML parsing for metadata extraction
- Vanilla JS carousel with keyboard & swipe support