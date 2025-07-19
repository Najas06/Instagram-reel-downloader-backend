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
    console.error("Scraping error:", err);
    res.status(500).json({ error: "Scraping failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
