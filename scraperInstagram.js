import puppeteer from "puppeteer";

const iPhone13ProMax = {
  name: "iPhone 13 Pro Max",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  viewport: {
    width: 428,
    height: 926,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
};

export async function scrapeInstagramVideo(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new", // Use 'new' for latest Puppeteer versions
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Set device emulation and headers
    await page.emulate(iPhone13ProMax);
    await page.setUserAgent(iPhone13ProMax.userAgent);
    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    // Check for media requests
    let videoUrl = null;
    const videoPromise = new Promise((resolve) => {
      const requestHandler = (request) => {
        if (
          request.resourceType() === "media" &&
          (request.url().includes(".mp4") ||
            request.url().includes(".m3u8") ||
            request.url().includes(".mpd"))
        ) {
          videoUrl = request.url();
          page.off("request", requestHandler);
          resolve(videoUrl);
        }
        request.continue();
      };

      page.on("request", requestHandler);

      // Timeout fallback
      setTimeout(() => {
        page.off("request", requestHandler);
        resolve(null);
      }, 15000);
    });

    await page.setRequestInterception(true);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // Check if redirected to login
      if (page.url().includes("/accounts/login")) {
        console.error("❌ Instagram redirected to login page.");
        return null;
      }
    } catch (gotoError) {
      console.error(`❌ Navigation failed: ${gotoError.message}`);
      return null;
    }

    const intercepted = await videoPromise;
    if (intercepted) return intercepted;

    // Fallback if media request not intercepted
    try {
      await page.waitForSelector("video", { timeout: 10000 });
      videoUrl = await page.$eval("video", (video) => video.src);
    } catch (_) {
      console.warn("⚠️ Video selector not found.");
    }

    return videoUrl;
  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
