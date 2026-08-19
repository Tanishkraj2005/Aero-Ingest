/**
 * Aero Ingest - Dashboard Orchestrator Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- LOCAL STATE ---
  const state = {
    theme: localStorage.getItem('aero-theme') || 'dark',
    jobs: [],          // Cache list of fetched jobs
    filteredJobs: [],  // Filtered subset
    logsCount: 0,      // Number of logs currently rendered
    scraperRunning: false,
    settings: {
      delay: 2000,
      retries: 3
    }
  };

  // --- SELECTORS ---
  // Theme Toggle
  const themeToggle = document.getElementById('theme-toggle');

  // Stats Elements
  const statScrapedCount = document.getElementById('stat-scraped-count');
  const statHealthRate = document.getElementById('stat-health-rate');
  const statPacingDelay = document.getElementById('stat-pacing-delay');
  const statScraperState = document.getElementById('stat-scraper-state');
  const systemStatusPill = document.getElementById('system-status-pill');

  // Config Elements
  const delaySlider = document.getElementById('delay-slider');
  const delayValueDisplay = document.getElementById('delay-value-display');
  const retriesInput = document.getElementById('retries-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const triggerScrapeBtn = document.getElementById('trigger-scrape-btn');

  // Log Terminal Elements
  const terminalLogs = document.getElementById('terminal-logs');
  const clearTerminalBtn = document.getElementById('clear-terminal-btn');

  // Job List Elements
  const jobsList = document.getElementById('jobs-list');
  const jobsEmpty = document.getElementById('jobs-empty');
  const listLoader = document.getElementById('list-loader');
  const searchInput = document.getElementById('search-input');
  const regionFilter = document.getElementById('region-filter');

  // Easter Egg Elements
  const logoLink = document.getElementById('logo-link');
  const easterEggHint = document.getElementById('easter-egg-trigger');
  const retroOverlay = document.getElementById('retro-overlay');
  const retroCloseBtn = document.getElementById('retro-close-btn');
  const retroTerminalBody = document.getElementById('retro-terminal-body');

  let logoClickCount = 0;
  let easterEggSequence = [];
  const secretCode = ['a', 'e', 'r', 'o'];

  // --- INITIALIZATION ---
  initTheme();
  fetchInitialData();
  startSyncLoops();
  initEventListeners();

  // --- THEME ---
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('aero-theme', state.theme);
  }

  // --- API SYNC CHANNELS ---

  async function fetchInitialData() {
    listLoader.style.display = 'flex';
    jobsList.style.opacity = '0.3';
    
    await Promise.all([
      fetchStatus(),
      fetchJobs(),
      fetchLogs()
    ]);

    listLoader.style.display = 'none';
    jobsList.style.opacity = '1';
  }

  // Starts short polling for status updates and log monitoring
  function startSyncLoops() {
    // Poll logs frequently (every 1.5 seconds) for real-time output stream
    setInterval(fetchLogs, 1500);

    // Poll server health and run state (every 3 seconds)
    setInterval(fetchStatus, 3000);
  }

  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error("Status endpoint error");
      const data = await res.json();

      // Update Local State
      const previousState = state.scraperRunning;
      state.scraperRunning = data.isRunning;
      state.settings = data.config;

      // Update UI Stats Cards
      statScrapedCount.innerText = data.scrapedCount;
      statHealthRate.innerText = `${data.healthRate}%`;
      statPacingDelay.innerText = `${data.config.delay}ms`;

      if (data.isRunning) {
        statScraperState.innerText = 'CRAWLING';
        statScraperState.className = 'metric-value warning-text pulse-text';
        triggerScrapeBtn.disabled = true;
        triggerScrapeBtn.querySelector('span').innerText = 'Crawling Target...';
        triggerScrapeBtn.querySelector('.btn-spinner-icon').style.display = 'inline-block';
      } else {
        statScraperState.innerText = 'IDLE';
        statScraperState.className = 'metric-value success-text';
        triggerScrapeBtn.disabled = false;
        triggerScrapeBtn.querySelector('span').innerText = 'Trigger Scraper Crawl';
        triggerScrapeBtn.querySelector('.btn-spinner-icon').style.display = 'none';
        
        // If crawler just finished, sync job board list
        if (previousState === true) {
          fetchJobs();
          appendLocalLog("Ingestion run finalized. Local cache synchronized.");
        }
      }

      // Sync settings values back to inputs (only if user is not active)
      if (document.activeElement !== delaySlider) {
        delaySlider.value = data.config.delay;
        delayValueDisplay.innerText = `${data.config.delay} ms`;
      }
      if (document.activeElement !== retriesInput) {
        retriesInput.value = data.config.retries;
      }

      // Connectivity Pill
      systemStatusPill.className = 'system-status-indicator';
      systemStatusPill.querySelector('.status-text').innerText = 'Server Connected';
      systemStatusPill.querySelector('.status-dot').className = 'status-dot green';

    } catch (err) {
      // Show connection lost states
      systemStatusPill.className = 'system-status-indicator error';
      systemStatusPill.querySelector('.status-text').innerText = 'Server Offline';
      systemStatusPill.querySelector('.status-dot').className = 'status-dot red';
    }
  }

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error("Jobs list endpoint error");
      const data = await res.json();
      state.jobs = data;
      filterAndRenderJobs();
    } catch (e) {
      appendLocalLog(`Error fetching opportunities list: ${e.message}`);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error("Logs stream error");
      const logs = await res.json();

      // Only re-render if log counts grow or are cleared
      if (logs.length !== state.logsCount) {
        renderTerminalLogs(logs);
        state.logsCount = logs.length;
      }
    } catch (e) {
      // Silence network logging issues
    }
  }

  // --- RENDER LOG TERMINAL ---
  function renderTerminalLogs(logs) {
    if (!terminalLogs) return;
    
    // Clear terminal
    terminalLogs.innerHTML = '';
    
    if (logs.length === 0) {
      terminalLogs.innerHTML = '<p class="terminal-log-line init">[00:00:00] Terminal logs reset. Awaiting events...</p>';
      return;
    }

    logs.forEach(log => {
      const p = document.createElement('p');
      p.className = 'terminal-log-line';
      
      // Highlights specific terms inside terminal for visual aesthetics
      if (log.includes('Successfully') || log.includes('SUCCESS')) {
        p.className += ' success';
      } else if (log.includes('error') || log.includes('FATAL') || log.includes('failed')) {
        p.className += ' error';
      } else if (log.includes('pacing') || log.includes('Sleeping') || log.includes('Attempt')) {
        p.className += ' warning';
      }

      p.innerText = log;
      terminalLogs.appendChild(p);
    });

    // Scroll to bottom
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  function appendLocalLog(message) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const p = document.createElement('p');
    p.className = 'terminal-log-line local';
    p.innerText = `[${timestamp}] ${message}`;
    terminalLogs.appendChild(p);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  // --- RENDER JOB GRID ---
  function filterAndRenderJobs() {
    const query = searchInput.value.toLowerCase().trim();
    const region = regionFilter.value;

    state.filteredJobs = state.jobs.filter(job => {
      // Match Title or Company name
      const matchesSearch = job.title.toLowerCase().includes(query) || 
                            job.company.toLowerCase().includes(query);
      
      // Match region categories
      let matchesRegion = true;
      if (region !== 'all') {
        const regionText = job.region.toLowerCase();
        if (region === 'usa') {
          matchesRegion = regionText.includes('usa') || regionText.includes('us ') || regionText.includes('united states');
        } else if (region === 'europe') {
          matchesRegion = regionText.includes('europe') || regionText.includes('eu ') || regionText.includes('uk') || regionText.includes('germany');
        } else if (region === 'americas') {
          matchesRegion = regionText.includes('americas') || regionText.includes('us') || regionText.includes('canada') || regionText.includes('brazil');
        } else if (region === 'anywhere') {
          matchesRegion = regionText.includes('anywhere') || regionText.includes('worldwide');
        }
      }

      return matchesSearch && matchesRegion;
    });

    renderJobsList();
  }

  function renderJobsList() {
    jobsList.innerHTML = '';
    
    if (state.filteredJobs.length === 0) {
      jobsEmpty.style.display = 'flex';
      return;
    }
    
    jobsEmpty.style.display = 'none';

    state.filteredJobs.forEach(job => {
      const card = document.createElement('div');
      card.className = 'job-card';
      
      // Resolve Logo image or fallback placeholder
      let logoMarkup = '';
      if (job.logoUrl) {
        logoMarkup = `<img src="${job.logoUrl}" alt="${job.company} Logo" class="job-company-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
      }
      
      // Short text icon backup
      const shortName = job.company ? job.company.slice(0, 2).toUpperCase() : 'JR';
      const fallbackLogo = `<div class="job-logo-fallback" style="${job.logoUrl ? 'display:none;' : ''}"><span>${shortName}</span></div>`;

      // Posting date badge colorization
      let dateClass = 'tag-date';
      if (job.datePosted.toLowerCase().includes('today') || job.datePosted.toLowerCase().includes('1d') || job.datePosted.toLowerCase().includes('2d')) {
        dateClass += ' new';
      }

      card.innerHTML = `
        <div class="job-card-main">
          <div class="job-logo-container">
            ${logoMarkup}
            ${fallbackLogo}
          </div>
          <div class="job-card-details">
            <span class="job-company-name">${escapeHtml(job.company)}</span>
            <h4 class="job-title">${escapeHtml(job.title)}</h4>
            <div class="job-metadata">
              <span class="job-tag-meta region">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                ${escapeHtml(job.region)}
              </span>
              <span class="job-tag-meta contract-type">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="meta-icon"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                ${escapeHtml(job.type)}
              </span>
            </div>
          </div>
        </div>
        <div class="job-card-actions">
          <span class="${dateClass}">${escapeHtml(job.datePosted)}</span>
          <a href="${job.link}" target="_blank" rel="noopener noreferrer" class="apply-link-btn" aria-label="Apply to ${job.title} at ${job.company}">
            <span>Details</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="apply-icon"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </a>
        </div>
      `;

      jobsList.appendChild(card);
    });
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  // --- ACTIONS ---

  async function triggerScraper() {
    if (state.scraperRunning) return;
    
    appendLocalLog("Sending crawler start instruction... [WAITING]");
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      if (!res.ok) throw new Error("Trigger request blocked.");
      const data = await res.json();
      
      appendLocalLog(data.message);
      fetchStatus(); // Immediately update status UI
    } catch (e) {
      appendLocalLog(`Engine Trigger Error: ${e.message}`);
    }
  }

  async function saveScraperSettings() {
    const delay = parseInt(delaySlider.value);
    const retries = parseInt(retriesInput.value);

    appendLocalLog(`Applying engine updates: Pacing = ${delay}ms, Retries = ${retries}...`);
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay, retries })
      });
      if (!res.ok) throw new Error("Settings API failed");
      const data = await res.json();

      appendLocalLog(data.message);
      fetchStatus();
    } catch (e) {
      appendLocalLog(`Settings update failure: ${e.message}`);
    }
  }

  // --- SHORTCUTS & TERMINAL EASTER EGG ---
  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 1. Ctrl + Enter manually triggers scraping
      if (e.ctrlKey && e.key === 'Enter') {
        // Prevent trigger if input focused
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        triggerScraper();
      }

      // 2. Escape closes backdoor terminal
      if (e.key === 'Escape' && retroOverlay.style.display === 'flex') {
        closeEasterEgg();
      }
    });

    document.addEventListener('keypress', (e) => {
      // Listen to backdoor spelling sequence 'aero'
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      handleEasterEggInput(e.key);
    });
  }

  function handleEasterEggInput(char) {
    easterEggSequence.push(char.toLowerCase());
    if (easterEggSequence.length > secretCode.length) {
      easterEggSequence.shift();
    }
    const matches = secretCode.every((val, index) => val === easterEggSequence[index]);
    if (matches) {
      triggerEasterEgg();
      easterEggSequence = [];
    }
  }

  function triggerEasterEgg() {
    if (!retroOverlay) return;
    retroOverlay.style.display = 'flex';
    retroOverlay.setAttribute('aria-hidden', 'false');
    
    const pElement = retroTerminalBody.querySelector('.matrix-text-prompt');
    if (pElement) {
      pElement.innerHTML = '$ <span class="matrix-input-text green-text"></span><span class="cursor">_</span>';
    }
    
    logTerminalMsg("Backdoor accessed successfully...");
    logTerminalMsg("AERO INGEST CORE CONSOLE");
    logTerminalMsg("Checking host variables... [OK]");
    logTerminalMsg("Active cached listings: " + state.jobs.length);
    logTerminalMsg("Type 'exit' to close or 'help' to audit commands.");

    document.addEventListener('keydown', terminalInputListener);
  }

  function terminalInputListener(e) {
    if (retroOverlay.style.display === 'none') {
      document.removeEventListener('keydown', terminalInputListener);
      return;
    }

    const inputSpan = retroTerminalBody.querySelector('.matrix-input-text');
    if (!inputSpan) return;

    if (e.key === 'Escape') {
      closeEasterEgg();
    } else if (e.key === 'Enter') {
      const command = inputSpan.innerText.trim().toLowerCase();
      inputSpan.innerText = '';
      
      if (command === 'exit' || command === 'close') {
        closeEasterEgg();
      } else if (command === 'clear') {
        const messages = retroTerminalBody.querySelectorAll('.matrix-text');
        messages.forEach(m => m.remove());
      } else if (command === 'help') {
        logTerminalMsg("Aero Console Commands: help, clear, ping, jobs, exit");
      } else if (command === 'ping') {
        logTerminalMsg("PING localhost (127.0.0.1): 56 data bytes");
        logTerminalMsg("64 bytes from 127.0.0.1: seq=1 time=0.04ms (Express node active)");
      } else if (command === 'jobs') {
        logTerminalMsg(`Listing cached jobs database index...`);
        if (state.jobs.length === 0) {
          logTerminalMsg("Empty database cache. Trigger scrape task.");
        } else {
          state.jobs.slice(0, 5).forEach((j, i) => {
            logTerminalMsg(` [${i+1}] ${j.company} - ${j.title}`);
          });
          if (state.jobs.length > 5) {
            logTerminalMsg(` ... and ${state.jobs.length - 5} more elements.`);
          }
        }
      } else if (command) {
        logTerminalMsg(`Command not recognized: ${command}`);
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      inputSpan.innerText = inputSpan.innerText.slice(0, -1);
    } else if (e.key.length === 1) {
      e.preventDefault();
      inputSpan.innerText += e.key;
    }
  }

  function logTerminalMsg(text) {
    const p = document.createElement('p');
    p.className = 'matrix-text green-text';
    p.innerText = text;
    const prompt = retroTerminalBody.querySelector('.matrix-text-prompt');
    retroTerminalBody.insertBefore(p, prompt);
    retroTerminalBody.scrollTop = retroTerminalBody.scrollHeight;
  }

  function closeEasterEgg() {
    if (retroOverlay) {
      retroOverlay.style.display = 'none';
      retroOverlay.setAttribute('aria-hidden', 'true');
    }
    document.removeEventListener('keydown', terminalInputListener);
  }

  // --- LISTENERS ---
  function initEventListeners() {
    // Theme Toggle
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    // Delay slider live update
    if (delaySlider) {
      delaySlider.addEventListener('input', (e) => {
        delayValueDisplay.innerText = `${e.target.value} ms`;
      });
    }

    // Trigger Scraper Run
    if (triggerScrapeBtn) {
      triggerScrapeBtn.addEventListener('click', triggerScraper);
    }

    // Apply Settings
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveScraperSettings);
    }

    // Reset Terminal view logs
    if (clearTerminalBtn) {
      clearTerminalBtn.addEventListener('click', () => {
        renderTerminalLogs([]);
      });
    }

    // Search filtration input
    if (searchInput) {
      searchInput.addEventListener('input', filterAndRenderJobs);
    }

    // Region filtration dropdown selector
    if (regionFilter) {
      regionFilter.addEventListener('change', filterAndRenderJobs);
    }

    // Setup physical keyboard hooks
    setupShortcuts();

    // Logo Click Hint & counts
    if (logoLink) {
      logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        logoClickCount++;
        if (logoClickCount >= 5) {
          triggerEasterEgg();
          logoClickCount = 0;
        } else {
          console.log(`Logo clicked ${logoClickCount}/5. Trigger matrix backdoor console.`);
        }
      });
    }

    // Footer secret button
    if (easterEggHint) {
      easterEggHint.addEventListener('click', () => {
        alert("Backdoor Hint: Type the word 'aero' sequentially outside input text boxes, or click the AERO logo in the header 5 times to gain matrix terminal access.");
      });
    }

    if (retroCloseBtn) {
      retroCloseBtn.addEventListener('click', closeEasterEgg);
    }
  }
});
