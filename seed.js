/**
 * Seed script — starts the server, captures the 3 initial prototypes, then exits.
 * Usage: node seed.js
 */

const { exec } = require('child_process');
const http = require('http');

const URLS = [
  'https://deep-r-odin.replit.app',
  'http://lab.odinz.net/lab/mc/',
  'http://lab.odinz.net/lab/nuvi/',
];

function waitForServer(url, retries = 30) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(url, (res) => {
        resolve();
      }).on('error', () => {
        if (n <= 0) return reject(new Error('Server did not start'));
        setTimeout(() => attempt(n - 1), 500);
      });
    };
    attempt(retries);
  });
}

async function addPrototype(url) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ url });
    const req = http.request('http://localhost:3000/api/prototypes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Starting server...');
  const server = exec('node server.js', { cwd: __dirname });
  server.stdout.pipe(process.stdout);
  server.stderr.pipe(process.stderr);

  await waitForServer('http://localhost:3000');
  console.log('Server is ready!\n');

  for (const url of URLS) {
    console.log(`\n📸 Capturing: ${url}`);
    try {
      const result = await addPrototype(url);
      console.log(`   ✓ "${result.title}" — ${result.description.substring(0, 80)}...`);
    } catch (err) {
      console.error(`   ✗ Failed: ${err.message}`);
    }
  }

  console.log('\n✅ Seeding complete! Stopping server...');
  server.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
