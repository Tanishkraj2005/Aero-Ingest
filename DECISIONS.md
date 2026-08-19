# Engineering & Design Decisions — Aero Ingest Dashboard

### 1. Ingestion Strategy Choices
We rejected the obvious alternative of **scraping job listings via headless browser instances (like Puppeteer or Playwright)**. While headless browsers bypass basic fingerprint checks, they consume large amounts of CPU/RAM and are difficult to deploy on lightweight server nodes (such as free-tier Render or Railway hosting).

Instead, we built a **Node.js HTTP scraping engine using Axios and Cheerio**. Our strategy focuses on mimicking a real browser through headers and timing:
- **Header Customization**: We send complete standard request headers (Accept, Referer, Accept-Language) and rotate through a list of modern desktop User-Agents.
- **Pacing**: We add a randomized delay (our slider setting + 0-1000ms random offset) between fetching runs to prevent IP request spike blocks.
- **SQLite vs. JSON Cache**: We chose a local JSON file cache (`data/jobs.json`) instead of an SQLite database. It has zero installation overhead, enables sub-millisecond loads, is completely readable, and works instantly in any development sandbox.
- **Plan B**: If the target platform (We Work Remotely) shifts its markup or bans our host IP, the server falls back to parsing their public RSS feed endpoint (`https://weworkremotely.com/remote-jobs.rss`), which contains identical job listings but is hosted behind less aggressive bot protection.

---

### 2. Time-Limit Trade-offs & Future Roadmaps
* **Selected Architecture**: We chose a **Vanilla HTML/CSS/JS** client and **Express.js** backend. We avoided complex single-page app frameworks (React/Vue) or state management libraries. The vanilla approach let us build a fast, responsive dashboard under 60 minutes with zero bundler setup.
* **With a Real Week**:
  1. **Proxy Rotation Network**: Integrate a commercial proxy service (like ScraperAPI or residential rotating proxies) to distribute requests across multiple IPs.
  2. **Markup Monitoring**: Write a background check that alerts us if We Work Remotely changes their class names (e.g. `.company` or `.title`), preventing silent extraction errors.
  3. **Visual Ingestion Flow**: Render a mini dashboard showing a visual map of crawler steps, successful pages, and current retry cycles.
  4. **Detailed Analytics**: Add tracking for job category distributions, average remote salary scales (where listed), and trends over time.

---

### 3. AI Collaboration & Verification
* **AI Assistance**:
  - Bootstrapped the Cheerio selector iteration logic for We Work Remotely article lists.
  - Setup the CSS design system layout properties for the metrics cards and log terminal rows.
* **Manual Engineering & Adjustments**:
  - **Live Log stream**: Hand-crafted the backend logging array caching and frontend log polling (`/api/logs`) to show a live stream of debug console outputs inside the terminal pane.
  - **Form Validation**: Wrote manual verification boundaries for settings updates (preventing negative pacing delays or retry counts).
  - **CORS Handling**: Enabled Express CORS routing to support remote queries, and configured static index path redirects to serve the frontend directly.
