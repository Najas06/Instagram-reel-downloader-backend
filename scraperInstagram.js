import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

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

const isProd = !!(process.env.AWS_REGION || process.env.RENDER);

export async function scrapeInstagramVideo(url) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: iPhone13ProMax.viewport,
    executablePath: isProd ? await chromium.executablePath : undefined,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.emulate(iPhone13ProMax);

    let videoUrl = null;

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (
        request.resourceType() === "media" &&
        (request.url().includes(".mp4?") ||
          request.url().includes(".m3u8") ||
          request.url().includes(".mpd"))
      ) {
        videoUrl = request.url();
      }
      request.continue();
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    if (!videoUrl) {
      try {
        await page.waitForSelector("video", { timeout: 10000 });
        videoUrl = await page.$eval("video", (video) => video.src);
      } catch (_) {}
    }

    return videoUrl;
  } finally {
    await browser.close();
  }
}
