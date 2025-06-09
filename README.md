# Universal Car Deal rater 🚗

Scrape and analyze car listings from many dealership websites with stealth and human-like browsing.

## Features
- Headless browser simulation (stealth mode)
- Random mouse movements and keypresses
- Bypasses basic bot detection
- Supports most car dealership websites by trying multiple common selector patterns
- Outputs clean listing titles, prices, links, and a color-coded deal rating

Listings are rated based on their price relative to the page average:
**green** indicates a great deal, **yellow** is around average, and **red**
means the price is above average.

## How to Use
1. Extract ZIP file.
2. Run `start_scraper.bat` (installs dependencies automatically). The app runs
   in headless mode by default; set `HEADLESS=false` if you want to see the
   browser.
3. Open `http://localhost:3001` in your browser.
4. Enter a car listing page URL and scrape!

## Requirements
- Node.js 18+
- Windows 10/11
