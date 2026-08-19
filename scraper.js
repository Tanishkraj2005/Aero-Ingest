const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class JobScraper {
  constructor() {
    this.cacheDir = path.join(__dirname, 'data');
    this.cacheFile = path.join(this.cacheDir, 'jobs.json');
    this.settingsFile = path.join(this.cacheDir, 'settings.json');

    this.config = {
      delay: 2000,
      retries: 3,
      userAgentType: 'rotate'
    };

    this.status = {
      isRunning: false,
      lastRun: null,
      scrapedCount: 0,
      errorsCount: 0,
      healthRate: 100
    };

    this.logs = [];
    this.rotatedUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76'
    ];

    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir);
      }

      if (fs.existsSync(this.settingsFile)) {
        const savedSettings = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
        this.config = { ...this.config, ...savedSettings };
      }

      if (fs.existsSync(this.cacheFile)) {
        const cachedJobs = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        this.status.scrapedCount = cachedJobs.length;
        this.status.lastRun = fs.statSync(this.cacheFile).mtime.toISOString();
      }

      this.log("Aero Scraper Engine initialized. Ready for ingestion tasks.");
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const logString = `[${timestamp}] ${message}`;
    console.log(logString);
    this.logs.push(logString);

    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  getLogs() {
    return this.logs;
  }

  getStatus() {
    return {
      ...this.status,
      config: this.config
    };
  }

  updateSettings(newSettings) {
    if (newSettings.delay !== undefined) {
      this.config.delay = Math.max(500, parseInt(newSettings.delay));
    }
    if (newSettings.retries !== undefined) {
      this.config.retries = Math.max(0, parseInt(newSettings.retries));
    }
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.config, null, 2));
      this.log(`Settings updated: Delay = ${this.config.delay}ms, Retries = ${this.config.retries}`);
    } catch (e) {
      this.log(`Error saving settings: ${e.message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getHeaders() {
    const randomUAIndex = Math.floor(Math.random() * this.rotatedUserAgents.length);
    const userAgent = this.rotatedUserAgents[randomUAIndex];

    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://google.com',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    };
  }

  async scrapeJobs() {
    if (this.status.isRunning) {
      this.log("Ingestion run blocked: Scraper already running.");
      return;
    }

    this.status.isRunning = true;
    this.log("Ingestion pipeline started...");

    const targetUrl = 'https://weworkremotely.com/categories/remote-programming-jobs';
    let attempts = 0;
    let success = false;
    let htmlContent = '';

    while (attempts < this.config.retries && !success) {
      attempts++;
      try {
        const headers = this.getHeaders();
        this.log(`Fetching page structure from target (Attempt ${attempts}/${this.config.retries})...`);
        this.log(`Simulated User-Agent: "${headers['User-Agent'].slice(0, 45)}..."`);

        const variance = Math.round(Math.random() * 1000);
        const currentDelay = this.config.delay + variance;
        this.log(`Ingestion pacing active. Sleeping for ${currentDelay}ms before fetch...`);
        await this.sleep(currentDelay);

        const response = await axios.get(targetUrl, {
          headers,
          timeout: 8000
        });

        if (response.status === 200) {
          htmlContent = response.data;
          success = true;
          this.log(`Successfully downloaded page source (Bytes: ${htmlContent.length}).`);
        } else {
          throw new Error(`Unexpected Status Code: ${response.status}`);
        }

      } catch (error) {
        this.status.errorsCount++;
        this.log(`Network error: ${error.message}`);
        if (attempts < this.config.retries) {
          const backoff = Math.pow(2, attempts) * 1000;
          this.log(`Retrying after exponential backoff. Sleeping for ${backoff}ms...`);
          await this.sleep(backoff);
        }
      }
    }

    const jobs = [];

    if (success && htmlContent) {
      try {
        this.log("Parsing HTML markup elements...");
        const $ = cheerio.load(htmlContent);

        $('li').each((i, el) => {
          const $el = $(el);
          const jobLink = $el.find('a[href*="/remote-jobs/"]');
          if (jobLink.length === 0) return;

          const relativeLink = jobLink.attr('href');
          if (!relativeLink || relativeLink.includes('/bookmark')) return;

          const link = relativeLink.startsWith('http') ? relativeLink : `https://weworkremotely.com${relativeLink}`;

          let title = $el.find('span.title').text().trim();
          if (!title) {
            title = jobLink.find('span.title').text().trim() || jobLink.text().trim();
          }

          let company = $el.find('span.company').first().text().trim();
          if (!company) {
            company = $el.find('.company').text().trim() || 'Remote Company';
          }

          if (title.includes('\n')) {
            title = title.split('\n')[0].trim();
          }

          const region = $el.find('span.region').text().trim() || 'Remote / Worldwide';
          const type = $el.find('span.company').eq(1).text().trim() || 'Full-Time';

          let logoUrl = '';
          const logoDiv = $el.find('div.flag-logo, .logo');
          if (logoDiv.length > 0) {
            const style = logoDiv.attr('style') || '';
            const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match && match[1]) {
              logoUrl = match[1];
            }
          }

          const datePosted = $el.find('span.date, time').text().trim() || 'Today';

          if (title && company && title.length > 2) {
            if (!jobs.some(j => j.link === link)) {
              jobs.push({
                id: relativeLink.split('/').pop().replace(/[^a-zA-Z0-9-]/g, '') || `job-${i}`,
                title,
                company,
                link,
                region,
                type,
                logoUrl,
                datePosted,
                scrapedAt: new Date().toISOString()
              });
            }
          }
        });

        this.log(`HTML Parser extracted ${jobs.length} jobs.`);

      } catch (parseError) {
        this.log(`HTML parsing error: ${parseError.message}`);
      }
    }

    if (jobs.length === 0) {
      this.log("HTML parsing yielded 0 listings. Activating Plan B: RSS Feed Ingestion Endpoint...");
      try {
        const rssRes = await axios.get('https://weworkremotely.com/remote-jobs.rss', {
          headers: this.getHeaders(),
          timeout: 8000
        });

        if (rssRes.status === 200) {
          const $xml = cheerio.load(rssRes.data, { xmlMode: true });
          $xml('item').each((i, el) => {
            const $item = $xml(el);
            const titleRaw = $item.find('title').text().trim();
            const link = $item.find('link').text().trim();
            const pubDate = $item.find('pubDate').text().trim();
            const category = $item.find('category').text().trim() || 'Programming';

            let company = 'Remote Org';
            let title = titleRaw;
            if (titleRaw.includes(':')) {
              const parts = titleRaw.split(':');
              company = parts[0].trim();
              title = parts.slice(1).join(':').trim();
            }

            if (title && link) {
              jobs.push({
                id: `rss-${i}-${Date.now()}`,
                title,
                company,
                link,
                region: category,
                type: 'Full-Time',
                logoUrl: '',
                datePosted: pubDate ? pubDate.slice(0, 16) : 'Recently',
                scrapedAt: new Date().toISOString()
              });
            }
          });
          this.log(`Plan B RSS Parser extracted ${jobs.length} remote opportunities.`);
        }
      } catch (rssError) {
        this.log(`Plan B RSS fallback error: ${rssError.message}`);
      }
    }

    if (jobs.length > 0) {
      fs.writeFileSync(this.cacheFile, JSON.stringify(jobs, null, 2));
      this.status.scrapedCount = jobs.length;
      this.status.lastRun = new Date().toISOString();
      this.status.healthRate = Math.min(100, this.status.healthRate + 5);
      this.log(`Jobs list cached successfully (${jobs.length} records).`);
    } else {
      this.log("FATAL: Both HTML and Plan B RSS ingestion failed.");
      this.status.errorsCount++;
      this.status.healthRate = Math.max(0, this.status.healthRate - 15);
    }

    this.status.isRunning = false;
    this.log("Ingestion run finished. Scraper is IDLE.");
  }

  getCachedJobs() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      }
    } catch (e) {
      this.log(`Error reading cache file: ${e.message}`);
    }
    return [];
  }
}

module.exports = JobScraper;
