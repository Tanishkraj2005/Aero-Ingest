# Aero Ingest — Verification & Testing Protocol

This walkthrough outlines the manual verification steps to test all full-stack scraper actions, settings controls, real-time logging, jobs list filtration, dark/light themes, and responsive rendering.

---

## ⚡ 1. Initial Backend Startup & Cache Verification
1. Open a terminal inside the project directory.
2. Install the Express/Cheerio dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Verify the terminal outputs:
   - Confirm server starts on port `3000`.
   - If starting for the first time, confirm it outputs: `No cached data found. Starting initial scraper crawl in the background...`
5. Open your file explorer. Confirm that the application has automatically created a `data/` subdirectory containing:
   - `jobs.json` (populated with scraped job listings).
   - `settings.json` (populated with active configurations).

---

## 🖥️ 2. Frontend Interface Synchronization
1. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).
2. Look at the top-right header. Confirm that the status pill reads **Server Connected** with a pulsing green dot.
3. Look at the **System Control Center** stats grid:
   - **Jobs Scraped**: Displays the total count of jobs cached (e.g. `50`).
   - **Engine Uptime**: Defaults to `100%`.
   - **Pacing Interval**: Defaults to `2000ms`.
   - **Scraper State**: Reads `IDLE`.
4. Inspect the **Live Ingestion Terminal**. Confirm it is streaming the initial server setup logs.

---

## ⚙️ 3. Settings Control & Live Logging
1. Locate the **Request Pacing Delay** range slider in the settings panel.
2. Drag the slider to the right (e.g. to `3250 ms`). Confirm that the value display updates dynamically.
3. Set the **Max Request Retries** text input to `4`.
4. Click the **Apply Settings** button.
5. In the **Live Ingestion Terminal**, confirm a new log line appears:
   `[hh:mm:ss] Settings updated: Delay = 3250ms, Retries = 4`
6. Look at the stats card row. Confirm that **Pacing Interval** stats card has updated to reflect the new delay configuration.

---

## 📡 4. Triggering a Manual Scraper Run
1. Click the primary **Trigger Scraper Crawl** button on the settings card.
2. Observe the interface state transitions:
   - The button disables, the label changes to `Crawling Target...`, and an indigo loading spinner activates.
   - The **Scraper State** card transitions to `CRAWLING` (color codes to pulsing yellow).
   - The **Live Ingestion Terminal** starts printing crawler steps:
     - `Ingestion pipeline started...`
     - `Fetching page structure from target (Attempt 1/4)...`
     - `Simulated User-Agent: "Mozilla/5.0..."`
     - `Ingestion pacing active. Sleeping for 3250ms before fetch...`
     - `Successfully downloaded page source...`
     - `Parsing HTML markup elements...`
     - `Scraper successfully extracted X jobs.`
     - `Jobs list written to cache file...`
     - `Ingestion run finished. Scraper is IDLE.`
3. Once completed, the button enables again, state returns to `IDLE` (emerald green), and the **Jobs Scraped** count card updates.

---

## 🔍 5. Search, Filter, and Job Board Rendering
1. Scroll down the **Ingested Postings** list on the right column.
2. Confirm that each job card renders:
   - Company Logo (or a colored fallback circle with the company's initials if no logo is available).
   - Company Name.
   - Job Title (in bold white/black text).
   - Metadata tags (Location/Region and Contract Type) with micro-icons.
   - Date posted tag (if "Today", the tag displays in bright green background).
   - A clickable **Details** button.
3. Click the **Details** button on any card. Confirm it opens the target We Work Remotely posting in a new browser tab.
4. Go to the Search bar. Type a company name from the list (e.g. `Automattic`). Confirm the list filters in real-time.
5. Select a Region filter (e.g., `USA Only`). Confirm that only jobs containing US designations are displayed.
6. Type a gibberish string in search. Confirm the list displays a clean **No jobs found** empty state box with a troubleshooting recommendation.

---

## 🌓 6. Theme Switching & Accessibility
1. Click the Sun/Moon theme toggle in the top navigation bar.
2. Verify that the dashboard transitions from dark Obsidian slate to high-contrast warm white.
3. Check the **Live Ingestion Terminal** logs text. Ensure all log lines (green success, yellow pacing, red errors) remain highly readable.
4. Refresh the browser page. Confirm that the page remains in light mode (validating LocalStorage persistence). Toggle it back to dark mode.

---

## 💻 7. Breakpoints & Responsiveness Audit
1. Open Chrome DevTools (`F12`), and click the **Device Toggle** toolbar.
2. Set viewport to **390px** width (iPhone mobile portrait).
   - Confirm that the header nav links and brand elements stack vertically.
   - Confirm **no horizontal overflow or scrollbar** occurs.
   - Confirm the 4 stats metrics cards stack into a single column.
   - Confirm the main dashboard columns (Scraper Controls, Terminal, Job Board) stack vertically.
   - Confirm the parameter adjustments inside settings stack neatly.
3. Resize viewport to **1440px** width (Desktop scale).
   - Confirm the page locks to a centered `1200px` container.
   - Confirm the side-by-side split grid (Scraper Controls/Terminal logs on the left, Job board listings on the right) renders correctly.

---

## 🎁 8. Backdoor Easter Egg Terminal
1. Click on any neutral area of the dashboard (outside of search inputs or settings boxes).
2. Type `aero` sequentially on your physical keyboard.
3. Verify that the Matrix-green console dialogue pops up.
4. Type `help` and press `Enter` to see commands.
5. Type `ping` and press `Enter` to verify backend connection.
6. Type `jobs` and press `Enter` to output database records.
7. Type `exit` and press `Enter` (or press `Escape`, or click the `×` button) to return to the dashboard.
8. Alternatively, click the main header logo 5 times. Verify the console activates identically.
