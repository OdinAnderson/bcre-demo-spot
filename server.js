const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/snapshots', express.static('snapshots'));

const DATA_FILE = path.join(__dirname, 'prototypes.json');
const SNAP_DIR = path.join(__dirname, 'snapshots');

// Ensure directories exist
if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

function loadPrototypes() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function savePrototypes(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get all prototypes
app.get('/api/prototypes', (req, res) => {
  res.json(loadPrototypes());
});

// Add a new prototype by URL
app.post('/api/prototypes', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    console.log(`Processing: ${url}`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a moment for any animations to settle
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot
    const slug = url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
    const snapFile = `${slug}_${Date.now()}.png`;
    const snapPath = path.join(SNAP_DIR, snapFile);
    await page.screenshot({ path: snapPath, type: 'png' });

    // Extract page info
    const title = await page.title();
    const html = await page.content();
    const $ = cheerio.load(html);

    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';

    // Grab visible text snippets for description generation
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 500);

    // Build a description
    let description = metaDesc || ogDesc || '';
    if (!description) {
      // Auto-generate from page content
      const h1 = $('h1').first().text().trim();
      const h2 = $('h2').first().text().trim();
      const firstP = $('p').first().text().trim();
      const parts = [h1, h2, firstP].filter(Boolean);
      if (parts.length) {
        description = parts.join(' — ');
      } else {
        description = bodyText.substring(0, 200) || 'An interactive prototype';
      }
    }

    if (description.length > 300) description = description.substring(0, 297) + '...';

    const displayTitle = ogTitle || title || url.replace(/https?:\/\//, '').split('/').filter(Boolean).join(' / ') || 'Untitled Prototype';

    await browser.close();

    const prototype = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      url,
      title: displayTitle,
      description,
      snapshot: `/snapshots/${snapFile}`,
      addedAt: new Date().toISOString()
    };

    const prototypes = loadPrototypes();
    prototypes.push(prototype);
    savePrototypes(prototypes);

    console.log(`✓ Added: ${displayTitle}`);
    res.json(prototype);
  } catch (err) {
    console.error(`Error processing ${url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a prototype
app.delete('/api/prototypes/:id', (req, res) => {
  let prototypes = loadPrototypes();
  const proto = prototypes.find(p => p.id === req.params.id);
  if (proto) {
    // Remove snapshot file
    const snapPath = path.join(__dirname, proto.snapshot);
    if (fs.existsSync(snapPath)) fs.unlinkSync(snapPath);
    prototypes = prototypes.filter(p => p.id !== req.params.id);
    savePrototypes(prototypes);
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n🚀 BCRE Demo Spot running at http://localhost:${PORT}\n`);
});
