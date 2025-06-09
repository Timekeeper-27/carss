const express = require('express');
let puppeteer;
let StealthPlugin;

function initPuppeteer() {
    if (!puppeteer) {
        puppeteer = require('puppeteer-extra');
        StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());
    }
    return puppeteer;
}
const path = require('path');


// Common selector sets for various dealership websites
const SELECTOR_SETS = [
    {
        container: 'a[data-qaid="cntnr-invCard"]',
        title: 'span[data-qaid="cntnr-title"]',
        price: 'div[data-qaid="cntnr-price"]'
    },
    {
        container: '.vehicle-card',
        title: '.title',
        price: '.first-price'
    },
    {
        container: '.inventory-listing',
        title: '.title',
        price: '.primary-price'
    },
    {
        container: '.listing',
        title: '.title',
        price: '.price'
    },
    {
        container: '.vehicle-item',
        title: '.vehicle-title',
        price: '.vehicle-price'
    }
];

// Helper to parse price text like "$25,000" to a number (25000)
function parsePrice(text) {
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
}

// Simple promise-based delay helper
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Try scraping listings using a specific set of selectors
async function scrapeWithSelectors(page, selectors) {
    try {
        return await page.$$eval(selectors.container, (nodes, sel) => {
            return nodes.map(node => {
                const titleEl = node.querySelector(sel.title);
                const priceEl = node.querySelector(sel.price);
                const linkEl = node.querySelector('a');
                return {
                    title: titleEl ? titleEl.textContent.trim() : '',
                    price: priceEl ? priceEl.textContent.trim() : '',
                    link: linkEl ? linkEl.href : ''
                };
            });
        }, selectors);
    } catch (err) {
        return [];
    }
}



const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.urlencoded({ extended: true }));

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    let browser;

    try {
        console.log(`Navigating to ${url}...`);
        const puppeteer = initPuppeteer();
        browser = await puppeteer.launch({
            headless: process.env.HEADLESS === 'false' ? false : 'new',
            slowMo: 50,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1280,800'
            ]
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

        // Human-like actions
        await page.mouse.move(100, 100);
        await delay(500);
        await page.mouse.move(200, 300);
        await delay(500);
        await page.mouse.move(300, 500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');


        let listings = [];
        for (const sel of SELECTOR_SETS) {
            listings = await scrapeWithSelectors(page, sel);
            if (listings.length) break;
        }

        listings.forEach(l => {
            l.numPrice = parsePrice(l.price);
        });

        const avgPrice = listings.reduce((sum, l) => sum + l.numPrice, 0) /
            (listings.length || 1);

        listings = listings.map(l => {
            let rating, reason;
            if (l.numPrice <= avgPrice * 0.9) {
                rating = 'green';
                reason = 'Below average price';
            } else if (l.numPrice <= avgPrice * 1.1) {
                rating = 'yellow';
                reason = 'Around average price';
            } else {
                rating = 'red';
                reason = 'Above average price';
            }
            return {
                title: l.title,
                price: l.price,
                link: l.link,
                rating,
                reason
            };
        });

        await browser.close();
        console.log(`Scraping complete. Listings found: ${listings.length}`);
        res.json({ listings });

    } catch (error) {
        console.error('Scraping error:', error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({ error: 'Scraping failed. Please check the URL and try again.' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;
