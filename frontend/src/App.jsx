import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('aero-theme') || 'dark');
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [scraperRunning, setScraperRunning] = useState(false);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [healthRate, setHealthRate] = useState(100);
  const [pacingDelay, setPacingDelay] = useState(2000);
  const [retries, setRetries] = useState(3);
  const [delaySliderVal, setDelaySliderVal] = useState(2000);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [serverOnline, setServerOnline] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const [easterEggActive, setEasterEggActive] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [matrixLogs, setMatrixLogs] = useState([]);
  const [matrixInput, setMatrixInput] = useState('');

  const terminalEndRef = useRef(null);
  const matrixEndRef = useRef(null);
  const sequenceRef = useRef([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    fetchInitialData();

    const logsInterval = setInterval(fetchLogs, 1500);
    const statusInterval = setInterval(fetchStatus, 3000);

    return () => {
      clearInterval(logsInterval);
      clearInterval(statusInterval);
    };
  }, [theme]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (matrixEndRef.current) {
      matrixEndRef.current.scrollTop = matrixEndRef.current.scrollHeight;
    }
  }, [matrixLogs]);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    const result = jobs.filter(job => {
      const matchesSearch = 
        job.title.toLowerCase().includes(query) || 
        job.company.toLowerCase().includes(query);
      
      let matchesRegion = true;
      if (regionFilter !== 'all') {
        const regionText = job.region.toLowerCase();
        if (regionFilter === 'usa') {
          matchesRegion = regionText.includes('usa') || regionText.includes('us ') || regionText.includes('united states');
        } else if (regionFilter === 'europe') {
          matchesRegion = regionText.includes('europe') || regionText.includes('eu ') || regionText.includes('uk') || regionText.includes('germany');
        } else if (regionFilter === 'americas') {
          matchesRegion = regionText.includes('americas') || regionText.includes('us') || regionText.includes('canada') || regionText.includes('brazil');
        } else if (regionFilter === 'anywhere') {
          matchesRegion = regionText.includes('anywhere') || regionText.includes('worldwide');
        }
      }

      return matchesSearch && matchesRegion;
    });

    setFilteredJobs(result);
  }, [searchQuery, regionFilter, jobs]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

      if (e.ctrlKey && e.key === 'Enter') {
        if (!isInput) {
          e.preventDefault();
          triggerScraper();
        }
      }

      if (e.key === 'Escape' && easterEggActive) {
        closeEasterEgg();
      }
    };

    const handleKeyPress = (e) => {
      const isInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
      if (isInput) return;

      const char = e.key.toLowerCase();
      sequenceRef.current.push(char);
      if (sequenceRef.current.length > 4) {
        sequenceRef.current.shift();
      }

      const matches = ['a', 'e', 'r', 'o'].every((val, idx) => val === sequenceRef.current[idx]);
      if (matches) {
        triggerEasterEgg();
        sequenceRef.current = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [scraperRunning, easterEggActive]);

  const fetchInitialData = async () => {
    setListLoading(true);
    await Promise.all([
      fetchStatus(),
      fetchJobs(),
      fetchLogs()
    ]);
    setListLoading(false);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      setServerOnline(true);
      setScraperRunning(data.isRunning);
      setScrapedCount(data.scrapedCount);
      setHealthRate(data.healthRate);
      setPacingDelay(data.config.delay);
      setRetries(data.config.retries);
      
      if (document.activeElement !== document.getElementById('delay-slider')) {
        setDelaySliderVal(data.config.delay);
      }
    } catch (err) {
      setServerOnline(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setJobs(data);
    } catch (e) {
      appendLocalLog("Network Error: Could not sync scraped listings.");
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error();
      const logsData = await res.json();
      setLogs(logsData);
    } catch (e) {}
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('aero-theme', nextTheme);
  };

  const triggerScraper = async () => {
    if (scraperRunning) return;
    
    appendLocalLog("Sending crawler start instruction... [WAITING]");
    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      appendLocalLog(data.message);
      fetchStatus();
    } catch (e) {
      appendLocalLog(`Engine Trigger Error: ${e.message}`);
    }
  };

  const saveSettings = async () => {
    appendLocalLog(`Applying settings: Pacing = ${delaySliderVal}ms, Retries = ${retries}...`);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delay: delaySliderVal, retries })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      appendLocalLog(data.message);
      fetchStatus();
    } catch (e) {
      appendLocalLog(`Settings update failure: ${e.message}`);
    }
  };

  const appendLocalLog = (message) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const logLine = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logLine]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getTechTags = (title) => {
    const tags = [];
    const t = title.toLowerCase();
    
    if (t.includes('react') || t.includes('frontend')) tags.push({ label: 'React.js', class: 'react' });
    if (t.includes('node') || t.includes('backend')) tags.push({ label: 'Node.js', class: 'node' });
    if (t.includes('python') || t.includes('django')) tags.push({ label: 'Python', class: 'python' });
    if (t.includes('ai') || t.includes('ml') || t.includes('learning')) tags.push({ label: 'AI/ML', class: 'ai' });
    if (t.includes('fullstack') || t.includes('full-stack') || t.includes('engineer')) {
      if (tags.length === 0) tags.push({ label: 'Fullstack', class: 'general' });
    }
    if (tags.length === 0) tags.push({ label: 'Software', class: 'general' });
    
    return tags;
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);
    if (nextClicks >= 5) {
      triggerEasterEgg();
      setLogoClicks(0);
    } else {
      console.log(`Logo click count: ${nextClicks}/5.`);
    }
  };

  const triggerEasterEgg = () => {
    setEasterEggActive(true);
    setMatrixLogs([
      "Backdoor accessed successfully...",
      "AERO INGEST REACT CORE CONSOLE",
      "Checking host variables... [OK]",
      `Total jobs available: ${jobs.length}`,
      "Type 'help' to review console triggers, or 'exit' to quit."
    ]);
  };

  const closeEasterEgg = () => {
    setEasterEggActive(false);
    setMatrixInput('');
  };

  const handleMatrixCommand = (e) => {
    e.preventDefault();
    const command = matrixInput.trim().toLowerCase();
    setMatrixInput('');

    if (!command) return;

    setMatrixLogs(prev => [...prev, `$ ${command}`]);

    if (command === 'exit' || command === 'close') {
      closeEasterEgg();
    } else if (command === 'clear') {
      setMatrixLogs([]);
    } else if (command === 'help') {
      setMatrixLogs(prev => [...prev, "Available Commands: help, clear, ping, jobs, exit"]);
    } else if (command === 'ping') {
      setMatrixLogs(prev => [...prev, "PING localhost (127.0.0.1): 56 data bytes", "64 bytes from 127.0.0.1: seq=0 time=0.03ms (Express React interface)"]);
    } else if (command === 'jobs') {
      setMatrixLogs(prev => [...prev, `Listing cached jobs database index...`]);
      if (jobs.length === 0) {
        setMatrixLogs(prev => [...prev, "No jobs scraped. Trigger scrape task."]);
      } else {
        jobs.slice(0, 5).forEach((j, i) => {
          setMatrixLogs(prev => [...prev, ` [${i+1}] ${j.company} - ${j.title}`]);
        });
      }
    } else {
      setMatrixLogs(prev => [...prev, `Command not recognized: ${command}`]);
    }
  };

  return (
    <>
      <header className="navbar">
        <div className="nav-container">
          <a href="#" className="logo-link" onClick={handleLogoClick} id="logo-link" aria-label="Aero Home">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22L12 17L22 22L12 2Z" stroke="currentColor" strokeWidth="2" strokeJoin="round" />
              <path d="M12 2V17" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="logo-text">aero<span className="logo-subtext">ingest</span></span>
          </a>
          
          <div className="nav-actions">
            <div className={`system-status-indicator ${!serverOnline ? 'error' : ''}`}>
              <span className={`status-dot ${serverOnline ? 'green' : 'red'}`}></span>
              <span className="status-text">{serverOnline ? 'Server Connected' : 'Server Offline'}</span>
            </div>
            
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme (Light/Dark)">
              <svg className="theme-icon moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <svg className="theme-icon sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <section className="dashboard-header">
        <div className="container header-container">
          <div className="header-badge animate-fade-in">
            <span className="badge-text">Ingestion Console</span>
            <span className="badge-separator">|</span>
            <span className="badge-source">Source: We Work Remotely</span>
          </div>
          
          <h1 className="header-title animate-slide-up">
            System Control Center
          </h1>
          <p className="header-description animate-slide-up-delayed">
            Manage crawling frequencies, examine real-time network request pacing logs, and monitor scraped listings.
          </p>
        </div>
      </section>

      <main className="dashboard-main">
        <div className="container">
          <section className="metrics-grid animate-slide-up-delayed2">
            <div className="metric-card">
              <div className="metric-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="metric-icon">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="metric-details">
                <span className="metric-label">Jobs Scraped</span>
                <h3 className="metric-value">{scrapedCount}</h3>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="metric-icon">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <div className="metric-details">
                <span className="metric-label">Engine Uptime</span>
                <h3 className="metric-value">{healthRate}%</h3>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="metric-icon">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="metric-details">
                <span className="metric-label">Pacing Interval</span>
                <h3 className="metric-value">{pacingDelay}ms</h3>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="metric-icon">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                  <line x1="7" y1="2" x2="7" y2="22"></line>
                  <line x1="17" y1="2" x2="17" y2="22"></line>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
              </div>
              <div className="metric-details">
                <span className="metric-label">Scraper State</span>
                <h3 className={`metric-value ${scraperRunning ? 'warning-text pulse-text' : 'success-text'}`}>
                  {scraperRunning ? 'CRAWLING' : 'IDLE'}
                </h3>
              </div>
            </div>
          </section>

          <div className="dashboard-grid">
            <div className="dashboard-col left-col">
              <div className="panel-card">
                <div className="panel-header">
                  <h2 className="panel-title">Ingestion Configuration</h2>
                </div>
                <div className="panel-body">
                  <div className="slider-group">
                    <div className="slider-labels">
                      <label htmlFor="delay-slider" className="input-label">Request Pacing Delay</label>
                      <span className="slider-val-display">{delaySliderVal} ms</span>
                    </div>
                    <input 
                      type="range" 
                      id="delay-slider" 
                      min="500" 
                      max="5000" 
                      step="250" 
                      value={delaySliderVal} 
                      onChange={(e) => setDelaySliderVal(parseInt(e.target.value))}
                      className="range-slider" 
                    />
                    <p className="input-hint">Adds random variance (+0 to 1000ms) to bypass basic threshold patterns.</p>
                  </div>

                  <div className="form-row margin-top-md">
                    <div className="form-group flex-1">
                      <label htmlFor="retries-input" className="input-label">Max Request Retries</label>
                      <input 
                        type="number" 
                        id="retries-input" 
                        min="0" 
                        max="5" 
                        value={retries} 
                        onChange={(e) => setRetries(parseInt(e.target.value) || 0)}
                        className="number-input" 
                      />
                    </div>
                    <button className="cta-button outline small margin-top-lg" onClick={saveSettings}>Apply Settings</button>
                  </div>

                  <div className="config-divider"></div>

                  <button 
                    id="trigger-scrape-btn" 
                    className="cta-button primary large full-width" 
                    onClick={triggerScraper}
                    disabled={scraperRunning}
                  >
                    <span>{scraperRunning ? 'Crawling Target...' : 'Trigger Scraper Crawl'}</span>
                    {scraperRunning && (
                      <svg className="btn-spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                        <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="panel-card margin-top-lg">
                <div className="terminal-window-header">
                  <div className="window-dots">
                    <span className="window-dot red"></span>
                    <span className="window-dot yellow"></span>
                    <span className="window-dot green"></span>
                  </div>
                  <div className="indicator-group">
                    <span className="live-pulse"></span>
                    <h2 className="panel-title" style={{ fontSize: '0.8rem' }}>Live Ingestion Stream</h2>
                  </div>
                  <button className="btn-text-action" onClick={clearLogs}>Reset Display</button>
                </div>
                
                <div className="terminal-container">
                  <div className="terminal-body" ref={terminalEndRef}>
                    {logs.length === 0 ? (
                      <p className="terminal-log-line init">[00:00:00] Terminal logs reset. Awaiting events...</p>
                    ) : (
                      logs.map((log, index) => {
                        let logClass = "terminal-log-line";
                        if (log.includes("Successfully") || log.includes("SUCCESS")) {
                          logClass += " success";
                        } else if (log.includes("error") || log.includes("FATAL") || log.includes("failed")) {
                          logClass += " error";
                        } else if (log.includes("pacing") || log.includes("Sleeping") || log.includes("Attempt")) {
                          logClass += " warning";
                        } else if (log.includes("local") || log.includes("Aero")) {
                          logClass += " local";
                        }
                        return <p key={index} className={logClass}>{log}</p>;
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-col right-col">
              <div className="panel-card full-height">
                <div className="panel-header search-filter-header">
                  <h2 className="panel-title">Ingested Postings</h2>
                  
                  <div className="search-filter-controls">
                    <div className="search-input-wrapper">
                      <label htmlFor="search-input" className="sr-only">Search Jobs</label>
                      <input 
                        type="text" 
                        id="search-input" 
                        placeholder="Search title or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                    
                    <div className="select-wrapper">
                      <label htmlFor="region-filter" className="sr-only">Filter by Region</label>
                      <select id="region-filter" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                        <option value="all">Any Region</option>
                        <option value="usa">USA Only</option>
                        <option value="europe">Europe Only</option>
                        <option value="americas">Americas Only</option>
                        <option value="anywhere">Anywhere (Worldwide)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="job-list-container">
                  {listLoading && (
                    <div className="list-loader">
                      <div className="spinner"></div>
                      <p>Loading database cached jobs...</p>
                    </div>
                  )}

                  {!listLoading && filteredJobs.length === 0 && (
                    <div className="jobs-empty-state" id="jobs-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <h3>No jobs found</h3>
                      <p>Try clearing your filters or click 'Trigger Scraper Crawl' to ingest remote opportunities from the target.</p>
                    </div>
                  )}

                  {!listLoading && filteredJobs.length > 0 && (
                    <div className="jobs-list">
                      {filteredJobs.map((job) => {
                        const cleanCompany = job.company ? job.company.replace(/[^a-zA-Z0-9 ]/g, '').trim() : 'Org';
                        const words = cleanCompany.split(' ').filter(w => w.length > 0);
                        let initials = 'WW';
                        if (words.length >= 2) {
                          initials = (words[0][0] + words[1][0]).toUpperCase();
                        } else if (words.length === 1) {
                          initials = words[0].slice(0, 2).toUpperCase();
                        }

                        const techBadges = getTechTags(job.title);
                        const isNew = job.datePosted.toLowerCase().includes('today') || 
                                      job.datePosted.toLowerCase().includes('1d') || 
                                      job.datePosted.toLowerCase().includes('2d');
                        
                        return (
                          <div key={job.id} className="job-card">
                            <div className="job-card-main">
                              <div className="job-logo-container">
                                {job.logoUrl ? (
                                  <img 
                                    src={job.logoUrl} 
                                    alt={`${job.company} Logo`} 
                                    className="job-company-logo" 
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="job-logo-fallback" style={{ display: job.logoUrl ? 'none' : 'flex' }}>
                                  <span>{initials}</span>
                                </div>
                              </div>
                              <div className="job-card-details">
                                <span className="job-company-name">{cleanCompany}</span>
                                <h4 className="job-title">{job.title}</h4>
                                <div className="job-metadata">
                                  {techBadges.map((badge, bIdx) => (
                                    <span key={bIdx} className={`tech-badge ${badge.class}`}>
                                      #{badge.label}
                                    </span>
                                  ))}
                                  <span className="job-tag-meta region">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="meta-icon">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    {job.region}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="job-card-actions">
                              <span className={`tag-date ${isNew ? 'new' : ''}`}>{job.datePosted}</span>
                              <a href={job.link} target="_blank" rel="noopener noreferrer" className="apply-link-btn" aria-label={`Apply to ${job.title} at ${job.company}`}>
                                <span>Details</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="apply-icon">
                                  <line x1="7" y1="17" x2="17" y2="7" />
                                  <polyline points="7 7 17 7 17 17" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-container">
          <div className="footer-left">
            <div className="footer-logo">
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22L12 17L22 22L12 2Z" stroke="currentColor" strokeWidth="2" strokeJoin="round" />
                <path d="M12 2V17" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>aero</span>
            </div>
            <p className="footer-tagline">Build it like you mean it.</p>
            <p className="copyright-text">&copy; 2026 Aero Technologies. All rights reserved. Open-source under MIT License.</p>
          </div>

          <div className="footer-right">
            <div className="footer-links-group">
              <h5>Documentation</h5>
              <a href="DECISIONS.md" target="_blank">DECISIONS.md</a>
              <a href="testing_instructions.md" target="_blank">Testing Instructions</a>
              <a href="README.md" target="_blank">System README</a>
            </div>
            <div className="footer-links-group">
              <h5>Actions</h5>
              <button className="footer-easter-egg-btn" onClick={triggerEasterEgg} id="easter-egg-trigger" aria-label="Secret Trigger">Easter Egg Hint</button>
            </div>
          </div>
        </div>
      </footer>

      {easterEggActive && (
        <div className="retro-overlay" role="dialog" aria-modal="true" aria-labelledby="retro-title">
          <div className="retro-terminal">
            <div className="terminal-bar">
              <span className="terminal-title" id="retro-title">AERO // BACKDOOR_ACCESS_GRANTED</span>
              <button className="terminal-close" onClick={closeEasterEgg} aria-label="Close Terminal">&times;</button>
            </div>
            <div className="terminal-body" ref={matrixEndRef}>
              {matrixLogs.map((logStr, idx) => (
                <p key={idx} className="matrix-text green-text">{logStr}</p>
              ))}
              <form onSubmit={handleMatrixCommand} className="matrix-text-prompt">
                <span className="green-text">$ </span>
                <input 
                  type="text" 
                  value={matrixInput} 
                  onChange={(e) => setMatrixInput(e.target.value)}
                  className="green-text"
                  autoFocus 
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    flexGrow: '1',
                    caretColor: '#14aa14'
                  }}
                />
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
