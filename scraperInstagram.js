import puppeteer from "puppeteer";

require("dotenv").config();

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
  let browser; // Declare browser outside try for finally block
  try {
    browser = await puppeteer.launch({
      headless: "new", // or true
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu", // Good for environments without a GPU
        "--disable-dev-shm-usage", // Important for Docker/container environments
        // Add more args if experiencing issues with stealth/bot detection
        // '--incognito', // Use incognito mode
        // '--disable-features=site-per-process', // Sometimes helps with older puppeteer versions
        // '--disable-setuid-sandbox', // Already there, but emphasized
      ],
      executablePath : process.env.NODE_ENV === "production" ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath()
    });

    const page = await browser.newPage();
    await page.emulate(iPhone13ProMax);

    let videoUrl = null;

    // Use a Promise to resolve when the video URL is found or a timeout occurs
    const videoPromise = new Promise((resolve) => {
      const requestHandler = (request) => {
        if (
          request.resourceType() === "media" &&
          (request.url().includes(".mp4?") ||
            request.url().includes(".m3u8") ||
            request.url().includes(".mpd"))
        ) {
          videoUrl = request.url();
          // console.log("Video URL intercepted:", videoUrl); // For debugging
          page.off("request", requestHandler); // Stop listening once found
          resolve(videoUrl);
        }
        request.continue();
      };
      page.on("request", requestHandler);

      // Set a timeout for the interception itself
      setTimeout(() => {
        if (!videoUrl) {
          page.off("request", requestHandler); // Remove listener if timed out
          resolve(null); // Resolve with null if not found within a certain time
        }
      }, 15000); // Give it up to 15 seconds to find the media request
    });

    await page.setRequestInterception(true);

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    } catch (gotoError) {
      console.error(`Error navigating to ${url}:`, gotoError.message);
      // It's possible the video URL was intercepted even if goto failed partially
      // but if the page didn't load at all, then it won't be found.
      return null;
    }


    // Wait for the video URL to be found or for the timeout
    const interceptedVideoUrl = await videoPromise;

    if (interceptedVideoUrl) {
      return interceptedVideoUrl;
    }

    // Fallback if request interception didn't catch it
    try {
      // Give it a bit more time if networkidle2 was not enough
      await page.waitForSelector("video", { timeout: 10000 });
      videoUrl = await page.$eval("video", (video) => video.src);
      // console.log("Video URL from selector:", videoUrl); // For debugging
    } catch (selectorError) {
      console.warn("Fallback selector failed or video element not found.", selectorError.message);
    }

    return videoUrl;

  } catch (error) {
    console.error("Scraping error:", error);
    return null; // Return null on any unhandled error
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}