const { chromium } = require("playwright");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");
const fs = require("fs");
const path = require("path");
const SITE_ROOT = "https://www.unipegaso.it";
const SITEMAP_URL = `${SITE_ROOT}/sitemap.xml`;
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|doc|docx|xls|xlsx|mp4|mp3)$/i;
const CONCURRENCY = 3;
const DELAY_MS = 500;
const MAX_RETRIES = 2;
const parser = new XMLParser({ ignoreAttributes: false });
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getUrlsFromSitemap(sitemapUrl, seen = new Set()) {
    if (seen.has(sitemapUrl)) return [];
    seen.add(sitemapUrl);
    console.log(`Fetching sitemap: ${sitemapUrl}`);
    const { data: xml } = await axios.get(sitemapUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; UnipegasoBot/1.0)" },
        timeout: 15000,
    });
    const parsed = parser.parse(xml);
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
        const entries = Array.isArray(parsed.sitemapindex.sitemap)
            ? parsed.sitemapindex.sitemap
            : [parsed.sitemapindex.sitemap];
        let urls = [];
        for (const entry of entries) {
            const childUrl = entry.loc;
            if (!childUrl) continue;
            try {
                const childUrls = await getUrlsFromSitemap(childUrl, seen);
                urls = urls.concat(childUrls);
            } catch (err) {
                console.warn(
                    `Failed to fetch child sitemap ${childUrl}: ${err.message}`,
                );
            }
        }
        return urls;
    }
    if (parsed.urlset && parsed.urlset.url) {
        const entries = Array.isArray(parsed.urlset.url)
            ? parsed.urlset.url
            : [parsed.urlset.url];
        return entries.map((e) => e.loc).filter(Boolean);
    }
    console.warn(`Unrecognized sitemap format at ${sitemapUrl}`);
    return [];
}
async function discoverAllUrls() {
    const rawUrls = await getUrlsFromSitemap(SITEMAP_URL);
    const seen = new Set();
    const clean = [];
    for (const u of rawUrls) {
        if (!u) continue;
        if (!u.startsWith(SITE_ROOT)) continue;
        if (SKIP_EXTENSIONS.test(u)) continue;
        const normalized = u.split("#")[0].replace(/\/$/, "");
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        clean.push(normalized);
    }
    console.log(`Discovered ${clean.length} unique page URLs from the sitemap.`);
    return clean;
}
async function scrapePage(browser, url, attempt = 1) {
    let page;
    try {
        page = await browser.newPage({
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });
        await page.route("**/*", (route) => {
            const type = route.request().resourceType();
            if (["image", "media", "font"].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });
        await page.goto(url, { waitUntil: "load", timeout: 15000 });
        await page.waitForTimeout(800);
        const pageTitle = await page.title();
        const bodyText = await page.evaluate(() => {
            const junkSelectors = [
                "script",
                "style",
                "nav",
                "footer",
                "header",
                "noscript",
                "iframe",
                ".menu",
                ".site-header",
                ".site-footer",
                ".cookie-banner",
                ".navbar",
                ".breadcrumb",
                "[class*='cookie']",
                "[class*='popup']",
            ];
            junkSelectors.forEach((sel) => {
                document.querySelectorAll(sel).forEach((el) => el.remove());
            });
            const main =
                document.querySelector("article") ||
                document.querySelector("main") ||
                document.querySelector(".content") ||
                document.body;
            return main.innerText.replace(/\s+/g, " ").trim();
        });
        await page.close();
        const text = `URL: ${url}\nPage Title: ${pageTitle}\n\n${bodyText}`;
        return { url, text };
    } catch (err) {
        if (page) {
            try {
                await page.close();
            } catch (_) { }
        }
        if (attempt <= MAX_RETRIES) {
            console.warn(`Retry ${attempt}/${MAX_RETRIES} for ${url}`);
            await sleep(1000);
            return scrapePage(browser, url, attempt + 1);
        }
        console.error(
            `Failed to scrape ${url} after ${MAX_RETRIES} retries:`,
            err.message,
        );
        return { url, text: null, failed: true };
    }
}
async function getBrowser() {
    return chromium.launch({ headless: true });
}
async function main() {
    const outDir = path.join(__dirname, "scraped_data");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const urlsToScrape = await discoverAllUrls();
    if (urlsToScrape.length === 0) {
        console.error(
            "No URLs discovered from the sitemap — aborting. Check SITEMAP_URL / network access.",
        );
        process.exit(1);
    }
    fs.writeFileSync(
        path.join(__dirname, "discovered_urls.json"),
        JSON.stringify(urlsToScrape, null, 2),
    );
    let browser = await getBrowser();
    const failedUrls = [];
    let scrapedCount = 0;
    for (let i = 0; i < urlsToScrape.length; i += CONCURRENCY) {
        const batch = urlsToScrape.slice(i, i + CONCURRENCY);
        if (!browser.isConnected()) {
            console.warn("Browser disconnected — relaunching...");
            browser = await getBrowser();
        }
        const results = await Promise.all(
            batch.map((url) => scrapePage(browser, url)),
        );
        for (const result of results) {
            if (!result) continue;
            if (result.failed || !result.text || result.text.length <= 50) {
                console.warn(`Empty/thin/failed, skipped: ${result.url}`);
                failedUrls.push(result.url);
                continue;
            }
            const filename =
                result.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "_") +
                ".txt";
            fs.writeFileSync(path.join(outDir, filename), result.text);
            scrapedCount++;
            console.log(`Saved ${filename} (${result.text.length} chars)`);
        }
        console.log(
            `Progress: ${Math.min(i + CONCURRENCY, urlsToScrape.length)}/${urlsToScrape.length}`,
        );
        await sleep(DELAY_MS);
    }
    await browser.close();
    if (failedUrls.length > 0) {
        fs.writeFileSync(
            path.join(__dirname, "failed_urls.json"),
            JSON.stringify(failedUrls, null, 2),
        );
        console.log(
            `\n${failedUrls.length} URLs failed — saved to failed_urls.json for re-run.`,
        );
    }
    console.log(
        `\nScraping complete. ${scrapedCount}/${urlsToScrape.length} pages saved to scraped_data/.`,
    );
}
main();
