const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

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
        browser = await puppeteer.launch({
            headless: false,
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
        await page.waitForTimeout(500);
        await page.mouse.move(200, 300);
        await page.waitForTimeout(500);
        await page.mouse.move(300, 500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(1000);

        const listings = await page.evaluate(() => {
            const results = [];
            const cars = document.querySelectorAll('a[data-qaid="cntnr-invCard"]');
            cars.forEach(car => {
                const titleElement = car.querySelector('span[data-qaid="cntnr-title"]');
                const priceElement = car.querySelector('div[data-qaid="cntnr-price"]');
                if (titleElement && priceElement) {
                    results.push({
                        title: titleElement.innerText.trim(),
                        price: priceElement.innerText.trim(),
                        link: car.href
                    });
                }
            });
            return results;
        });


        console.log(`Scraping complete. Listings found: ${listings.length}`);
        res.json({ listings });

    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Scraping failed. Please check the URL and try again.' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));