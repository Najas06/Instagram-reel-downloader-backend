import express from "express";
import cors from "cors";
import { scrapeInstagramVideo } from "./scraperInstagram.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  try {
    const videoUrl = await scrapeInstagramVideo(url);
    if (videoUrl) return res.json({ videoUrl });
    res.status(404).json({ error: "Video not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.listen(5000, () => console.log("🚀 Backend running on http://localhost:5000"));

export default app;