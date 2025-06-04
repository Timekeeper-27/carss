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
    const keyword = req.query.keyword?.toLowerCase() || '';
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;

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
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForTimeout(5000);  // let JavaScript load

        const potentialSelectors = [
            'div.vehicle-card-details',
            'div.inventory-item',
            'div.search-result',
            'li.result-row',
            'div.listing-row__details',
            'article'
        ];

        let foundListings = [];

        for (const selector of potentialSelectors) {
            const exists = await page.$(selector);
            if (exists) {
                foundListings = await page.$$eval(selector, elements => {
                    return elements.map(el => {
                        const priceMatch = el.innerText.match(/\$\d{1,3}(,\d{3})*(\.\d{2})?/);
                        const titleTag = el.querySelector('h2, h3, a, span');
                        const linkTag = el.querySelector('a');
                        if (titleTag && priceMatch && linkTag) {
                            let price = priceMatch[0].replace('$', '').replace(/,/g, '');
                            if (!isNaN(price)) {
                                return {
                                    title: titleTag.innerText.trim(),
                                    price: parseInt(price),
                                    link: linkTag.href.startsWith('http') ? linkTag.href : window.location.origin + linkTag.getAttribute('href')
                                };
                            }
                        }
                        return null;
                    }).filter(item => item !== null);
                });
                if (foundListings.length > 0) break;
            }
        }

        const filtered = foundListings.filter(car => {
            return car.price >= minPrice &&
                   car.price <= maxPrice &&
                   car.title.toLowerCase().includes(keyword);
        });

        const prices = filtered.map(car => car.price);
        const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

        const ratedListings = filtered.map(car => {
            let rating = 5;
            if (avgPrice > 0) {
                const diff = ((avgPrice - car.price) / avgPrice) * 100;
                if (diff >= 20) rating = 10;
                else if (diff >= 10) rating = 8;
                else if (diff >= 0) rating = 7;
                else if (diff >= -10) rating = 5;
                else rating = 3;
            }
            return { ...car, rating };
        });

        await browser.close();
        res.json({ listings: ratedListings });
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