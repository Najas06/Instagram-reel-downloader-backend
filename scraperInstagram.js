import puppeteer, { executablePath, devices } from "puppeteer";

export async function scrapeInstagramVideo(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage"
    ]
  });

  try {
    const page = await browser.newPage();

    const iPhone = devices["iPhone 13 Pro Max"];
    if (iPhone) {
      await page.emulate(iPhone);
    }

    await page.setRequestInterception(true);

    let videoUrl = null;

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
