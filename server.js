const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const JobScraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const scraper = new JobScraper();

app.get('/api/status', (req, res) => {
  res.json(scraper.getStatus());
});

app.get('/api/jobs', (req, res) => {
  const jobs = scraper.getCachedJobs();
  res.json(jobs);
});

app.post('/api/scrape', (req, res) => {
  if (scraper.status.isRunning) {
    return res.status(409).json({ error: "Scraper is already active." });
  }
  scraper.scrapeJobs();
  res.json({ message: "Scraper task successfully queued." });
});

app.post('/api/settings', (req, res) => {
  const { delay, retries } = req.body;
  if (delay === undefined && retries === undefined) {
    return res.status(400).json({ error: "No settings provided. Send 'delay' or 'retries'." });
  }
  scraper.updateSettings({ delay, retries });
  res.json({ message: "Scraper settings updated.", config: scraper.config });
});

app.get('/api/logs', (req, res) => {
  res.json(scraper.getLogs());
});

const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use(express.static(__dirname));
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  const cachePath = path.join(__dirname, 'data', 'jobs.json');
  if (!fs.existsSync(cachePath)) {
    scraper.scrapeJobs();
  }
});
