# Aero Ingest — Full-Stack Job Scraper & Monitoring Dashboard

Aero Ingest is a professional, production-ready **Full-Stack Job Ingestion Engine & Telemetry Monitoring Dashboard**. It implements a Node.js scraper backend (using Axios and Cheerio) alongside a premium, responsive dashboard (built with HSL variables, glassmorphism, and live logs polling).

This project demonstrates systems thinking (avoidance tactics, retries, and local caching) and UI/UX craft (fluid grids, light/dark themes, log terminals, and custom range sliders).

---

## 📂 Project Directory Structure

```text
.
├── data/                 # Data cache directory (auto-created)
│   ├── jobs.json         # Scraped opportunities database cache
│   └── settings.json     # Saved scraper config settings
├── .env.example          # Template for backend server ports
├── app.js                # Frontend client logic (API requests, UI filters, theme)
├── scraper.js            # Ingestion engine class (HTML crawler, UA rotation, pacing)
├── server.js             # Express.js REST API server & static asset host
├── styles.css            # Custom CSS themes & responsive dashboard grids
├── DECISIONS.md          # Briefing on ingestion strategy & tech decisions
├── testing_instructions.md # Step-by-step verification and manual test suite
├── package.json          # Node.js server dependencies
└── README.md             # This document
```

---

## ⚙️ How the Ingestion Pipeline Works

1. **Target Ingestion**: Parses We Work Remotely's Remote Programming category page.
2. **Detection Avoidance**:
   - **Header Rotation**: Sequentially cycles user-agent strings representing major desktop platforms.
   - **Organic Pacing**: Adds a randomized jitter (between 0 and 1000ms) on top of the configured delay value.
   - **Standard Sequencing**: Sends request headers mimicking organic client browsers.
3. **Resilience & Fallbacks**:
   - Executes retry loops (up to 3 times by default) with exponential backoff on connection timeouts.
   - Caches scraped listings in `data/jobs.json`. In the event of a blocking event, it serves cached contents, keeping the system up.
4. **Settings Synchronization**:
   - Changes made to the delay slider or retry configurations are written to `data/settings.json`, surviving server restarts.

---

## 🚀 Installation & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 16 or higher recommended)
- npm (comes bundled with Node.js)

### Step 1: Clone and Install Dependencies
In your terminal, navigate to the project directory and run:
```bash
npm install
```
This installs the routing, parsing, and request libraries (`express`, `axios`, `cheerio`, `cors`, `dotenv`).

### Step 2: Configure Environment Variables
Rename the `.env.example` file to `.env`:
```bash
# Windows Command Prompt
rename .env.example .env

# PowerShell
Rename-Item .env.example .env
```
Ensure your configuration file contains:
```text
PORT=3000
```

### Step 3: Run the Server
Start the local application:
```bash
npm start
```
The server will boot up and automatically check for cached data. If no cache file is found, it starts an initial background scraping run.

### Step 4: Open in Web Browser
Open your browser and visit:
[http://localhost:3000](http://localhost:3000)

---

## ☁️ Deployment Instructions

The backend is built as an Express.js server, making it compatible with cloud container or serverless platforms.

### Deploying to Render (Free Web Service)
1. Commit this workspace to a public GitHub repository.
2. Log in to [Render Console](https://dashboard.render.com/) and click **New** -> **Web Service**.
3. Link your GitHub repository.
4. Set the following build properties:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Under Environment variables, add:
   - `PORT` = `10000` (or leave it blank; Render sets this automatically).
6. Click **Deploy**. Render will host the server and serve the static dashboard.

### Deploying to Railway
1. Push this folder to a GitHub repository.
2. In [Railway](https://railway.app/), click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository. Railway will detect the Node.js project and deploy it.
4. Go to service **Settings** -> **Public Networking** -> **Generate Domain** to get your public URL.
