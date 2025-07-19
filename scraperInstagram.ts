import puppeteer from "puppeteer";

export async function scrapeInstagramVideo(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    );

    let videoUrl: string | null = null;
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.resourceType() === "media" && req.url().includes(".mp4")) {
        videoUrl = req.url();
      }
      req.continue();
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    return videoUrl;
  } finally {
    await browser.close();
  }
}
