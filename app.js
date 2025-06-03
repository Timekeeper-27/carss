const express = require('express');
const app = express();
const { chromium } = require('playwright');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════╗
║ 🚗 Universal Car Deal Scraper - Gibson EK Edition 🐾 ║
╚════════════════════════════════════════════════════╝
`);

app.use(express.static('public'));

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Scrape route
app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        const listings = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('div, li, article').forEach(el => {
                const price = el.innerText.match(/\$\d{1,3}(,\d{3})*(\.\d{2})?/);
                const title = el.querySelector('h2, h3, a, span')?.innerText;
                const link = el.querySelector('a')?.href;
                if (price && title && link) {
                    items.push({
                        title: title.trim(),
                        price: price[0].replace('$', '').replace(',', ''),
                        link: link.startsWith('http') ? link : (window.location.origin + link)
                    });
                }
            });
            return items;
        });

        await browser.close();

        res.json({ listings: listings || [] });  // ✅ ALWAYS send valid JSON
    } catch (error) {
        console.error('Scrape error:', error);
        if (browser) {
            await browser.close();
        }
        // ✅ Send fallback valid JSON even on error
        res.status(500).json({ listings: [] });
    }
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
