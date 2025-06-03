const express = require('express');
const app = express();
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scrape', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--lang=en-US,en;q=0.9',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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

        res.json({ listings: listings || [] });
    } catch (error) {
        console.error('Scrape error:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({ listings: [] });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
