const express = require('express');
const app = express();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════╗
║   🚗 Universal Car Deal Scraper                           ║
║   Gibson EK High School Edition 🐾                        ║
║   Powered by Node.js + Playwright + Bootstrap             ║
╚══════════════════════════════════════════════════════════╝
`);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    const listings = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('div, li, article').forEach(el => {
            const price = el.innerText.match(/\$[\d,]+/);
            const title = el.querySelector('a, h2, h3, span')?.innerText;
            const link = el.querySelector('a')?.href;
            if (price && title && link) {
                items.push({
                    title: title.trim(),
                    price: price[0].replace('$', '').replace(',', ''),
                    link: link
                });
            }
        });
        return items;
    });

    await browser.close();

    res.json({ listings });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));