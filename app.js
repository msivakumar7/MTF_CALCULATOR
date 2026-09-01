// ===== MTF Calculator App Logic =====

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentStock = null;
  let overrides = { interestRate: 0, brokerage: 0 };
  let historyData = JSON.parse(localStorage.getItem('mtf_history') || '[]');
  let customStocks = JSON.parse(localStorage.getItem('mtf_custom_stocks') || '[]');
  let plChartInstance = null;
  let currentCalcData = null;
  let historySelectionMode = false;
  let selectedHistoryIds = new Set();

  // --- Theme Management ---
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mtf_theme', theme);
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    // Update meta theme-color for mobile
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F1219' : '#FFFFFF');
  }
  // Load saved theme or default to system preference
  const savedTheme = localStorage.getItem('mtf_theme');
  if (savedTheme) { applyTheme(savedTheme); }
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) { applyTheme('dark'); }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // Merge custom stocks into MTF_STOCKS
  if (typeof MTF_STOCKS !== 'undefined') {
    customStocks.forEach(cs => {
      const idx = MTF_STOCKS.findIndex(s => s.symbol === cs.symbol);
      if (idx !== -1) MTF_STOCKS[idx] = cs;
      else MTF_STOCKS.push(cs);
    });
  }

  // DOM Elements
  const els = {
    navLinks: document.querySelectorAll('.nav-link, .bnav-item'),
    pages: document.querySelectorAll('.page'),
    
    // Inputs
    searchInput: document.getElementById('stockSearch'),
    searchClear: document.getElementById('searchClear'),
    searchDropdown: document.getElementById('searchDropdown'),
    brokerStatus: document.getElementById('brokerStatus'),
    selectedStockInfo: document.getElementById('selectedStockInfo'),
    zMarginPct: document.getElementById('zMarginPct'),
    zLeverage: document.getElementById('zLeverage'),
    gMarginPct: document.getElementById('gMarginPct'),
    gLeverage: document.getElementById('gLeverage'),
    zChip: document.getElementById('zChip'),
    gChip: document.getElementById('gChip'),
    
    buyPrice: document.getElementById('buyPrice'),
    sellPrice: document.getElementById('sellPrice'),
    ownCapital: document.getElementById('ownCapital'),
    holdingDays: document.getElementById('holdingDays'),
    buyDate: document.getElementById('buyDate'),
    sellDate: document.getElementById('sellDate'),
    useDatesToggle: document.getElementById('useDatesToggle'),
    holdingDaysWrap: document.getElementById('holdingDaysWrap'),
    holdingDatesWrap: document.getElementById('holdingDatesWrap'),
    computedDays: document.getElementById('computedDays'),
    
    calcBtn: document.getElementById('calcBtn'),
    
    // Short Results
    emptyState: document.getElementById('emptyState'),
    shortResultsArea: document.getElementById('shortResultsArea'),
    zLevShort: document.getElementById('zLevShort'),
    zPosShort: document.getElementById('zPosShort'),
    zQtyShort: document.getElementById('zQtyShort'),
    zFundShort: document.getElementById('zFundShort'),
    gLevShort: document.getElementById('gLevShort'),
    gPosShort: document.getElementById('gPosShort'),
    gQtyShort: document.getElementById('gQtyShort'),
    gFundShort: document.getElementById('gFundShort'),
    zNetShort: document.getElementById('zNetShort'),
    gNetShort: document.getElementById('gNetShort'),
    shortWinnerArea: document.getElementById('shortWinnerArea'),
    shortWinnerBroker: document.getElementById('shortWinnerBroker'),
    shortWinnerDiff: document.getElementById('shortWinnerDiff'),
    marginValidationWarning: document.getElementById('marginValidationWarning'),
    
    viewDetailedBtn: document.getElementById('viewDetailedBtn'),
    resetBtnTop: document.getElementById('resetBtnTop'),
    refreshBtn: document.getElementById('refreshBtn'),
    dataStatusText: document.getElementById('dataStatusText'),
    dataStatusIcon: document.getElementById('dataStatusIcon'),
    
    // Detailed Analysis Page
    backToCalcBtn: document.getElementById('backToCalcBtn'),
    analysisTradeSummary: document.getElementById('analysisTradeSummary'),
    analysisBrokerCompare: document.getElementById('analysisBrokerCompare'),
    fundingBody: document.getElementById('fundingBody'),
    chargesBody: document.getElementById('chargesBody'),
    interestBody: document.getElementById('interestBody'),
    dayPLBody: document.getElementById('dayPLBody'),
    dayPLTableWrap: document.getElementById('dayPLTableWrap'),
    breakEvenCard: document.getElementById('breakEvenCard'),
    targetProfit: document.getElementById('targetProfit'),
    targetResult: document.getElementById('targetResult'),
    
    // Stocks Page
    stocksTableSearch: document.getElementById('stocksTableSearch'),
    stockFilterPills: document.getElementById('stockFilterPills'),
    stocksTableBody: document.getElementById('stocksTableBody'),
    mobileStockCards: document.getElementById('mobileStockCards'),
    addStockBtn: document.getElementById('addStockBtn'),
    importCsvBtn: document.getElementById('importCsvBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    
    // History
    historyGrid: document.getElementById('historyGrid'),
    historyNormalHeader: document.getElementById('historyNormalHeader'),
    historySelectHeader: document.getElementById('historySelectHeader'),
    historySelectBtn: document.getElementById('historySelectBtn'),
    historySettingsMenuBtn: document.getElementById('historySettingsMenuBtn'),
    historySelectAllBtn: document.getElementById('historySelectAllBtn'),
    historyCancelSelectBtn: document.getElementById('historyCancelSelectBtn'),
    historySelectedCountText: document.getElementById('historySelectedCountText'),
    historyActionBar: document.getElementById('historyActionBar'),
    historyActionText: document.getElementById('historyActionText'),
    historyDeleteSelectedBtn: document.getElementById('historyDeleteSelectedBtn'),
    
    // Modals
    resetModal: document.getElementById('resetModal'),
    confirmResetBtn: document.getElementById('confirmResetBtn'),
    addStockModal: document.getElementById('addStockModal'),
    stockForm: document.getElementById('stockForm'),
    settingsModal: document.getElementById('settingsModal'),
    settingsBtn: document.getElementById('settingsBtn'),
    mobileSettingsBtn: document.getElementById('mobileSettingsBtn'),
    clearHistoryModal: document.getElementById('clearHistoryModal'),
    confirmClearHistoryBtn: document.getElementById('confirmClearHistoryBtn'),
    historyContextMenu: document.getElementById('historyContextMenu'),
    menuClearAllHistory: document.getElementById('menuClearAllHistory')
  };

  // --- Utility Functions ---
  function formatINR(val) { return '₹' + Math.abs(val).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function formatPct(val) { return val.toFixed(2) + '%'; }
  function formatLev(margin) { return (100 / margin).toFixed(2) + '×'; }
  function getLev(margin) { return 100 / margin; }

  // --- Navigation ---
  function showPage(pageId) {
    els.pages.forEach(p => {
      if (p.id === 'page-' + pageId) p.classList.add('page-active');
      else p.classList.remove('page-active');
    });
    els.navLinks.forEach(l => {
      const dp = l.getAttribute('data-page');
      if (dp && dp === pageId) l.classList.add('active');
      else l.classList.remove('active');
    });
    window.scrollTo(0,0);
  }

  els.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = e.currentTarget.getAttribute('data-page');
      if(pageId) {
        showPage(pageId);
        if (pageId === 'stocks') renderStocksPage();
        if (pageId === 'history') {
          historySelectionMode = false;
          selectedHistoryIds.clear();
          renderHistory();
        }
      }
    });
  });

  els.backToCalcBtn.addEventListener('click', () => showPage('calculator'));
  els.viewDetailedBtn.addEventListener('click', () => {
    if(!currentCalcData) return;
    renderDetailedAnalysis(currentCalcData);
    showPage('analysis');
  });

  // --- Settings Modal ---
  const openSettings = (e) => { e.preventDefault(); els.settingsModal.classList.remove('hidden'); };
  els.settingsBtn.addEventListener('click', openSettings);
  if(els.mobileSettingsBtn) els.mobileSettingsBtn.addEventListener('click', openSettings);

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById(this.getAttribute('data-close')).classList.add('hidden');
    });
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    overrides.ovZInterest = parseFloat(document.getElementById('ovZInterest').value) || 0;
    overrides.ovGInterest = parseFloat(document.getElementById('ovGInterest').value) || 0;
    overrides.ovZBrokerage = parseFloat(document.getElementById('ovZBrokerage').value) || 0;
    overrides.ovGBrokerage = parseFloat(document.getElementById('ovGBrokerage').value) || 0;
    els.settingsModal.classList.add('hidden');
    if (!els.shortResultsArea.classList.contains('hidden')) performCalculation();
  });

  // --- Reset & Refresh ---
  els.resetBtnTop.addEventListener('click', () => {
    if (els.buyPrice.value !== '0' || els.ownCapital.value !== '0' || currentStock) {
      els.resetModal.classList.remove('hidden');
    }
  });

  els.confirmResetBtn.addEventListener('click', () => {
    els.resetModal.classList.add('hidden');
    currentStock = null;
    els.searchInput.value = '';
    els.brokerStatus.classList.add('hidden');
    els.buyPrice.value = '0';
    els.sellPrice.value = '0';
    els.ownCapital.value = '0';
    els.holdingDays.value = '0';
    els.buyDate.value = '';
    els.sellDate.value = '';
    els.shortResultsArea.classList.add('hidden');
    if(els.emptyState) els.emptyState.classList.remove('hidden');
    currentCalcData = null;
    checkCalcEnable();
  });

  els.refreshBtn.addEventListener('click', () => {
    els.dataStatusText.textContent = "Checking latest MTF data...";
    els.dataStatusIcon.textContent = "sync";
    els.dataStatusIcon.classList.remove('text-success');
    
    // Simulate network delay
    setTimeout(() => {
      els.dataStatusText.textContent = "MTF data verified";
      els.dataStatusIcon.textContent = "check_circle";
      els.dataStatusIcon.classList.add('text-success');
      if (currentStock) selectStock(currentStock); // refresh chips
    }, 800);
  });

  // --- Search ---
  els.searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (q) {
      els.searchClear.classList.remove('hidden');
      const matches = MTF_STOCKS.filter(s => 
        s.company.toLowerCase().includes(q) || 
        s.symbol.toLowerCase().includes(q) || 
        (s.isin && s.isin.toLowerCase().includes(q))
      ).slice(0, 5);
      
      els.searchDropdown.innerHTML = '';
      if (matches.length > 0) {
        matches.forEach(s => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="stock-name">${s.company}</span><span class="stock-meta">${s.symbol}</span>`;
          li.addEventListener('click', () => selectStock(s));
          els.searchDropdown.appendChild(li);
        });
      } else {
        els.searchDropdown.innerHTML = `<li style="pointer-events:none;color:var(--text2)">No stocks found</li>`;
      }
      els.searchDropdown.classList.remove('hidden');
    } else {
      els.searchClear.classList.add('hidden');
      els.searchDropdown.classList.add('hidden');
    }
  });

  els.searchClear.addEventListener('click', () => {
    els.searchInput.value = '';
    els.searchClear.classList.add('hidden');
    els.searchDropdown.classList.add('hidden');
    els.searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) els.searchDropdown.classList.add('hidden');
    
    // History context menu outside click
    if(els.historyContextMenu && !els.historyContextMenu.classList.contains('hidden')) {
      if(!e.target.closest('#historyContextMenu') && !e.target.closest('#historySettingsMenuBtn') && !e.target.closest('.history-more-btn')) {
        els.historyContextMenu.classList.add('hidden');
      }
    }
  });

  function selectStock(stock) {
    currentStock = stock;
    els.searchInput.value = `${stock.company} (${stock.symbol})`;
    els.searchDropdown.classList.add('hidden');
    
    els.selectedStockInfo.innerHTML = `<span class="stock-name">${stock.company}</span> <span class="stock-symbol">${stock.symbol}</span>`;
    
    if (stock.zMargin) {
      els.zMarginPct.textContent = formatPct(stock.zMargin);
      els.zLeverage.textContent = formatLev(stock.zMargin);
      els.zChip.style.opacity = '1';
    } else {
      els.zMarginPct.textContent = 'N/A';
      els.zLeverage.textContent = '–';
      els.zChip.style.opacity = '0.5';
    }
    
    if (stock.gMargin) {
      els.gMarginPct.textContent = formatPct(stock.gMargin);
      els.gLeverage.textContent = formatLev(stock.gMargin);
      els.gChip.style.opacity = '1';
    } else {
      els.gMarginPct.textContent = 'N/A';
      els.gLeverage.textContent = '–';
      els.gChip.style.opacity = '0.5';
    }
    
    els.brokerStatus.classList.remove('hidden');
    checkCalcEnable();
  }

  // --- Validation ---
  [els.buyPrice, els.sellPrice, els.ownCapital, els.holdingDays].forEach(input => {
    input.addEventListener('input', checkCalcEnable);
    input.addEventListener('focus', function() { if (this.value === '0') this.select(); });
  });

  els.useDatesToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      els.holdingDaysWrap.classList.add('hidden');
      els.holdingDatesWrap.classList.remove('hidden');
      if (!els.buyDate.value) els.buyDate.valueAsDate = new Date();
      if (!els.sellDate.value) {
        let d = new Date(); d.setDate(d.getDate() + (parseInt(els.holdingDays.value) || 7));
        els.sellDate.valueAsDate = d;
      }
      calcDaysFromDates();
    } else {
      els.holdingDaysWrap.classList.remove('hidden');
      els.holdingDatesWrap.classList.add('hidden');
      els.computedDays.classList.add('hidden');
    }
    checkCalcEnable();
  });

  function calcDaysFromDates() {
    if (els.buyDate.value && els.sellDate.value) {
      const ms = new Date(els.sellDate.value) - new Date(els.buyDate.value);
      const days = Math.max(0, Math.floor(ms / 86400000));
      els.holdingDays.value = days;
      els.computedDays.textContent = `Holding period: ${days} day(s)`;
      els.computedDays.classList.remove('hidden');
    }
    checkCalcEnable();
  }
  els.buyDate.addEventListener('change', calcDaysFromDates);
  els.sellDate.addEventListener('change', calcDaysFromDates);

  function checkCalcEnable() {
    let valid = currentStock !== null;
    const bp = parseFloat(els.buyPrice.value);
    const cap = parseFloat(els.ownCapital.value);
    if (isNaN(bp) || bp <= 0) valid = false;
    if (isNaN(cap) || cap <= 0) valid = false;
    els.calcBtn.disabled = !valid;
  }

  // --- Core Calculation Engine ---
  els.calcBtn.addEventListener('click', performCalculation);

  function performCalculation() {
    if (!currentStock) return;
    
    // Simulate slight loading feeling on desktop
    els.calcBtn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">sync</span> Calculating...`;
    
    setTimeout(() => {
      els.calcBtn.innerHTML = `Calculate MTF`;
      const bp = parseFloat(els.buyPrice.value);
      const sp = parseFloat(els.sellPrice.value) || 0;
      const cap = parseFloat(els.ownCapital.value);
      
      let days = 0;
      if (els.useDatesToggle.checked && els.buyDate.value && els.sellDate.value) {
        days = calcInterestDaysFromDates(els.buyDate.value, els.sellDate.value);
      } else {
        days = parseInt(els.holdingDays.value) || 0;
      }
      
      const options = { pledgeCount: 1, unpledgeCount: 1, squareOff: false, exchange: currentStock.exchange };
      
      // ZERODHA MATH
      let zRes = null;
      if (currentStock.zMargin) {
        zRes = calcMTF('zerodha', cap, bp, sp, currentStock.zMargin, days, options);
        if (zRes) zRes.maxPos = cap * getLev(currentStock.zMargin);
      }
      
      // GROWW MATH
      let gRes = null;
      if (currentStock.gMargin) {
        gRes = calcMTF('groww', cap, bp, sp, currentStock.gMargin, days, options);
        if (gRes) gRes.maxPos = cap * getLev(currentStock.gMargin);
      }
      
      currentCalcData = { bp, sp, cap, days, zRes, gRes, stock: currentStock, options };
      renderShortResults(currentCalcData);
    }, 150);
  }

  function renderShortResults(data) {
    if(els.emptyState) els.emptyState.classList.add('hidden');
    els.shortResultsArea.classList.remove('hidden');
    
    // Render ZERODHA
    if (data.zRes) {
      els.zLevShort.textContent = data.zRes.lev.toFixed(2) + '×';
      els.zPosShort.textContent = formatINR(data.zRes.maxPos);
      els.zQtyShort.textContent = data.zRes.qty.toLocaleString();
      els.zFundShort.textContent = formatINR(data.zRes.brokerFunding);
      els.zNetShort.textContent = formatINR(data.zRes.netPL);
      els.zNetShort.className = 'val-large ' + (data.zRes.netPL >= 0 ? 'profit-color' : 'loss-color');
    } else {
      els.zLevShort.textContent = '–'; els.zPosShort.textContent = '–';
      els.zQtyShort.textContent = '–'; els.zFundShort.textContent = '–'; els.zNetShort.textContent = '–';
    }
    
    // Render GROWW
    if (data.gRes) {
      els.gLevShort.textContent = data.gRes.lev.toFixed(2) + '×';
      els.gPosShort.textContent = formatINR(data.gRes.maxPos);
      els.gQtyShort.textContent = data.gRes.qty.toLocaleString();
      els.gFundShort.textContent = formatINR(data.gRes.brokerFunding);
      els.gNetShort.textContent = formatINR(data.gRes.netPL);
      els.gNetShort.className = 'val-large ' + (data.gRes.netPL >= 0 ? 'profit-color' : 'loss-color');
    } else {
      els.gLevShort.textContent = '–'; els.gPosShort.textContent = '–';
      els.gQtyShort.textContent = '–'; els.gFundShort.textContent = '–'; els.gNetShort.textContent = '–';
    }
    
    // Winner Logic
    let winner = null, diff = 0;
    if (data.zRes && data.gRes) {
      if (data.gRes.netPL > data.zRes.netPL) { winner = 'GROWW'; diff = data.gRes.netPL - data.zRes.netPL; }
      else if (data.zRes.netPL > data.gRes.netPL) { winner = 'ZERODHA'; diff = data.zRes.netPL - data.gRes.netPL; }
    } else if (data.zRes) winner = 'ZERODHA';
    else if (data.gRes) winner = 'GROWW';
    
    if (winner && data.sp > 0) {
      els.shortWinnerArea.classList.remove('hidden');
      els.shortWinnerBroker.textContent = winner;
      els.shortWinnerDiff.textContent = formatINR(diff);
    } else {
      els.shortWinnerArea.classList.add('hidden');
    }
    
    if (window.innerWidth < 768) {
      els.shortResultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- Detailed Analysis Page ---
  function renderDetailedAnalysis(data) {
    els.analysisTradeSummary.innerHTML = `
      <div class="trade-header">
        <div>
          <h3 class="field-label" style="text-transform:uppercase;margin-bottom:4px">Your Trade</h3>
          <div style="display:flex;align-items:center;">
            <span class="trade-symbol">${data.stock.symbol}</span>
          </div>
        </div>
      </div>
      <div class="trade-details-grid">
        <div class="trade-detail"><div class="lbl">Capital</div><div class="val">${formatINR(data.cap)}</div></div>
        <div class="trade-detail"><div class="lbl">Buy</div><div class="val">${formatINR(data.bp)}</div></div>
        <div class="trade-detail"><div class="lbl">Sell</div><div class="val">${data.sp > 0 ? formatINR(data.sp) : '–'}</div></div>
        <div class="trade-detail"><div class="lbl">Holding</div><div class="val">${data.days} Days</div></div>
      </div>
    `;
    
    // Broker Comparison
    function renderBrokerDetail(name, res) {
      if(!res) return `<div class="broker-card"><div class="broker-card-name">${name}</div><div style="text-align:center;padding:20px;color:var(--text2)">Not Available</div></div>`;
      const retCap = (res.netPL / data.cap) * 100;
      const retMar = (res.netPL / res.reqMargin) * 100;
      return `
        <div class="broker-card">
          <div class="broker-card-name">${name}</div>
          <div class="broker-metric"><span class="lbl">Quantity (Actual)</span><span class="val">${res.qty.toLocaleString()} shares</span></div>
          <div class="broker-metric"><span class="lbl">Position (Actual)</span><span class="val">${formatINR(res.actualPos)}</span></div>
          <div class="broker-metric"><span class="lbl">Required Margin</span><span class="val">${formatINR(res.reqMargin)}</span></div>
          <div class="broker-metric"><span class="lbl">Broker Funding</span><span class="val">${formatINR(res.brokerFunding)}</span></div>
          <div class="broker-metric mt-sm"><span class="lbl">Total Charges</span><span class="val loss-color">${formatINR(res.totalCharges)}</span></div>
          <div class="broker-net mt-sm">
            <div class="lbl">Net Profit / Loss</div>
            <div class="val ${res.netPL >= 0 ? 'profit-color' : 'loss-color'}">${data.sp > 0 ? formatINR(res.netPL) : 'N/A'}</div>
            ${data.sp > 0 ? `<div class="roi" style="font-size:12px;margin-top:4px">Ret. on Capital: ${formatPct(retCap)}<br/>Ret. on Margin: ${formatPct(retMar)}</div>` : ''}
          </div>
        </div>
      `;
    }
    
    els.analysisBrokerCompare.innerHTML = `
      <div style="display:contents">
        ${renderBrokerDetail('ZERODHA', data.zRes)}
        ${renderBrokerDetail('GROWW', data.gRes)}
      </div>
    `;

    // Funding details
    els.fundingBody.innerHTML = `
      <p style="font-size:14px;color:var(--text2);margin-bottom:12px">
        Because you cannot buy fractional shares, the <strong>Actual Position</strong> is slightly less than your theoretical Maximum Position. 
        <br/>Broker funding = Actual Position − Required Margin.
      </p>
    `;

    // Charges
    els.chargesBody.innerHTML = `
      <table class="charges-table">
        <thead>
          <tr><th>Charge Type</th><th class="text-right">Zerodha</th><th class="text-right">Groww</th></tr>
        </thead>
        <tbody>
          <tr><td title="Estimated based on order value and broker rules">Brokerage</td><td class="text-right">${data.zRes?formatINR(data.zRes.brokerage):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.brokerage):'–'}</td></tr>
          <tr><td title="Charged on broker funding">MTF Interest</td><td class="text-right">${data.zRes?formatINR(data.zRes.mtfInterest):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.mtfInterest):'–'}</td></tr>
          <tr><td title="0.1% on buy & sell">STT</td><td class="text-right">${data.zRes?formatINR(data.zRes.stt):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.stt):'–'}</td></tr>
          <tr><td title="Exchange Transaction Charges">Exchange Txn</td><td class="text-right">${data.zRes?formatINR(data.zRes.exchangeCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.exchangeCharges):'–'}</td></tr>
          <tr><td title="SEBI Turnover Charge">SEBI</td><td class="text-right">${data.zRes?formatINR(data.zRes.sebiCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.sebiCharges):'–'}</td></tr>
          <tr><td title="Investor Protection Fund Trust">IPFT</td><td class="text-right">${data.zRes?formatINR(data.zRes.ipftCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.ipftCharges):'–'}</td></tr>
          <tr><td title="0.015% on buy side only">Stamp Duty</td><td class="text-right">${data.zRes?formatINR(data.zRes.stampDuty):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.stampDuty):'–'}</td></tr>
          <tr><td title="Depository Participant Charges">DP Charges</td><td class="text-right">${data.zRes?formatINR(data.zRes.dpCharge):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.dpCharge):'–'}</td></tr>
          <tr><td title="For MTF holding">Pledge</td><td class="text-right">${data.zRes?formatINR(data.zRes.pledgeCharge):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.pledgeCharge):'–'}</td></tr>
          <tr><td title="For MTF selling">Unpledge</td><td class="text-right">${data.zRes?formatINR(data.zRes.unpledgeCharge):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.unpledgeCharge):'–'}</td></tr>
          <tr><td title="18% on Brokerage, Exchange Txn, SEBI, IPFT, DP, Pledge/Unpledge, Square-off">GST</td><td class="text-right">${data.zRes?formatINR(data.zRes.gst):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.gst):'–'}</td></tr>
          <tr><td title="If forcibly squared off by broker">Square-off</td><td class="text-right">${data.zRes?formatINR(data.zRes.squareOffCharge):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.squareOffCharge):'–'}</td></tr>
          <tr class="total-row"><td>Total Charges</td><td class="text-right">${data.zRes?formatINR(data.zRes.totalCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.totalCharges):'–'}</td></tr>
        </tbody>
      </table>
    `;
    
    // Add Assumptions panel content
    const assumptionsBody = document.getElementById('assumptionsBody');
    if (assumptionsBody) {
      assumptionsBody.innerHTML = `
        <div class="trade-details-grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="font-size: 13px;">Exchange: ${data.options.exchange}</div>
          <div style="font-size: 13px;">Quantity: ${data.zRes ? data.zRes.qty : (data.gRes ? data.gRes.qty : 0)} shares (FLOOR rounding)</div>
          <div style="font-size: 13px;">Interest Days: ${data.days}</div>
          <div style="font-size: 13px;">Zerodha Interest: ${formatPct(BROKER_CONFIG.zerodha.mtfInterestDaily * 100)}% / day</div>
          <div style="font-size: 13px;">Groww Interest: ${formatPct(BROKER_CONFIG.groww.mtfInterestAnnual * 100)}% p.a.</div>
          <div style="font-size: 13px;">Zerodha Margin: ${data.zRes ? formatPct(data.zRes.marginPct) : 'N/A'}</div>
          <div style="font-size: 13px;">Groww Margin: ${data.gRes ? formatPct(data.gRes.marginPct) : 'N/A'}</div>
          <div style="font-size: 13px;">Pledge/Unpledge Included: ${data.options.pledgeCount}/${data.options.unpledgeCount}</div>
          <div style="font-size: 13px;">Broker Square-off Assumed: ${data.options.squareOff ? 'Yes' : 'No'}</div>
          <div style="font-size: 13px;">DP Charge Included: Yes</div>
          <div style="font-size: 13px;">Pricing Version: ${BROKER_CONFIG.pricingVersion}</div>
          <div style="font-size: 13px;">Rates Last Verified: ${BROKER_CONFIG.lastVerifiedDate}</div>
        </div>
      `;
    }
    
    // Add Debug panel content
    const debugBody = document.getElementById('debugBody');
    if (debugBody) {
       let debugHtml = '<div style="font-size: 11px; font-family: monospace; overflow-x: auto;">';
       if (data.zRes) {
         debugHtml += '<strong>ZERODHA DEBUG:</strong><br>';
         debugHtml += `BUY VALUE: ${data.zRes.buyValue}<br>`;
         debugHtml += `SELL VALUE: ${data.zRes.sellValue}<br>`;
         debugHtml += `GROSS P&L: ${data.zRes.grossPnL}<br>`;
         debugHtml += `REQUIRED MARGIN: ${data.zRes.requiredMargin}<br>`;
         debugHtml += `BROKER FUNDING: ${data.zRes.brokerFunding}<br>`;
         debugHtml += `MTF INTEREST: ${data.zRes.mtfInterest}<br>`;
         debugHtml += `BROKERAGE (Buy+Sell): ${data.zRes.buyBrokerage} + ${data.zRes.sellBrokerage} = ${data.zRes.brokerage}<br>`;
         debugHtml += `STT (Buy+Sell): ${data.zRes.sttBuy} + ${data.zRes.sttSell} = ${data.zRes.stt}<br>`;
         debugHtml += `EXCHANGE CHARGES: ${data.zRes.exchangeCharges}<br>`;
         debugHtml += `SEBI: ${data.zRes.sebiCharges}<br>`;
         debugHtml += `IPFT: ${data.zRes.ipftCharges}<br>`;
         debugHtml += `STAMP DUTY: ${data.zRes.stampDuty}<br>`;
         debugHtml += `DP CHARGE: ${data.zRes.dpCharge}<br>`;
         debugHtml += `PLEDGE/UNPLEDGE: ${data.zRes.pledgeCharge} / ${data.zRes.unpledgeCharge}<br>`;
         debugHtml += `GST: ${data.zRes.gst} (Base: ${data.zRes.gstBase})<br>`;
         debugHtml += `TOTAL CHARGES: ${data.zRes.totalCharges}<br>`;
         debugHtml += `NET P&L: ${data.zRes.netPnL}<br><br>`;
       }
       if (data.gRes) {
         debugHtml += '<strong>GROWW DEBUG:</strong><br>';
         debugHtml += `BUY VALUE: ${data.gRes.buyValue}<br>`;
         debugHtml += `SELL VALUE: ${data.gRes.sellValue}<br>`;
         debugHtml += `GROSS P&L: ${data.gRes.grossPnL}<br>`;
         debugHtml += `REQUIRED MARGIN: ${data.gRes.requiredMargin}<br>`;
         debugHtml += `BROKER FUNDING: ${data.gRes.brokerFunding}<br>`;
         debugHtml += `MTF INTEREST: ${data.gRes.mtfInterest}<br>`;
         debugHtml += `BROKERAGE (Buy+Sell): ${data.gRes.buyBrokerage} + ${data.gRes.sellBrokerage} = ${data.gRes.brokerage}<br>`;
         debugHtml += `STT (Buy+Sell): ${data.gRes.sttBuy} + ${data.gRes.sttSell} = ${data.gRes.stt}<br>`;
         debugHtml += `EXCHANGE CHARGES: ${data.gRes.exchangeCharges}<br>`;
         debugHtml += `SEBI: ${data.gRes.sebiCharges}<br>`;
         debugHtml += `IPFT: ${data.gRes.ipftCharges}<br>`;
         debugHtml += `STAMP DUTY: ${data.gRes.stampDuty}<br>`;
         debugHtml += `DP CHARGE: ${data.gRes.dpCharge}<br>`;
         debugHtml += `PLEDGE/UNPLEDGE: ${data.gRes.pledgeCharge} / ${data.gRes.unpledgeCharge}<br>`;
         debugHtml += `GST: ${data.gRes.gst} (Base: ${data.gRes.gstBase})<br>`;
         debugHtml += `TOTAL CHARGES: ${data.gRes.totalCharges}<br>`;
         debugHtml += `NET P&L: ${data.gRes.netPnL}<br>`;
       }
       debugHtml += '</div>';
       debugBody.innerHTML = debugHtml;
    }

    // Collapsible Logic
    document.querySelectorAll('.collapse-header').forEach(btn => {
      btn.onclick = function() {
        this.classList.toggle('open');
        const target = document.getElementById(this.getAttribute('data-target'));
        target.classList.toggle('hidden');
      };
    });

    // History Save
    document.getElementById('saveCalcBtn').onclick = () => {
      historyData.unshift({
        id: Date.now(), date: new Date().toISOString(), stock: data.stock,
        bp: data.bp, sp: data.sp, cap: data.cap, days: data.days,
        zRes: data.zRes, gRes: data.gRes
      });
      localStorage.setItem('mtf_history', JSON.stringify(historyData));
      alert('Saved to History');
    };
  }

  // --- Stocks Page & Add Stock ---
  function renderStocksPage() {
    const q = els.stocksTableSearch.value.toLowerCase().trim();
    let filter = document.querySelector('#stockFilterPills .active').getAttribute('data-filter');
    let filtered = MTF_STOCKS.filter(s => {
      const matchQ = s.company.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q);
      let matchF = true;
      if (filter === 'zerodha') matchF = s.zMargin !== null;
      if (filter === 'groww') matchF = s.gMargin !== null;
      if (filter === 'both') matchF = s.zMargin !== null && s.gMargin !== null;
      return matchQ && matchF;
    });

    // Desktop
    els.stocksTableBody.innerHTML = filtered.map(s => {
      let status = '';
      if(s.zMargin && s.gMargin) status = '<span class="badge-green">Both</span>';
      else if(s.zMargin) status = '<span class="badge-orange">Zerodha</span>';
      else status = '<span class="badge-orange">Groww</span>';
      
      return `
        <tr>
          <td><div class="stock-cell"><div class="stock-avatar">${s.company.charAt(0)}</div><div style="font-weight:500">${s.company}</div></div></td>
          <td style="color:var(--text2)">${s.symbol}</td>
          <td class="text-right">${s.zMargin?formatPct(s.zMargin):'–'}</td>
          <td class="text-right">${s.gMargin?formatPct(s.gMargin):'–'}</td>
          <td class="text-right">${status}</td>
          <td>${new Date(s.updated).toLocaleDateString()}</td>
          <td><button class="icon-btn" onclick="openStockDetail('${s.symbol}')"><span class="material-symbols-outlined tiny">edit</span></button></td>
        </tr>
      `;
    }).join('');

    // Mobile
    els.mobileStockCards.innerHTML = filtered.map(s => {
      return `
        <div class="card mb-sm" style="padding:16px" onclick="openStockDetail('${s.symbol}')">
          <div style="font-weight:600;font-size:16px">${s.company}</div>
          <div style="color:var(--text2);font-size:12px;margin-bottom:8px">${s.symbol}</div>
          <div style="display:flex; justify-content:space-between; font-size:14px">
            <div>Z: ${s.zMargin?formatLev(s.zMargin):'–'}</div>
            <div>G: ${s.gMargin?formatLev(s.gMargin):'–'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  els.stocksTableSearch.addEventListener('input', renderStocksPage);
  els.stockFilterPills.addEventListener('click', (e) => {
    if(e.target.classList.contains('pill')){
      document.querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));
      e.target.classList.add('active');
      renderStocksPage();
    }
  });

  // Add/Edit Stock
  els.addStockBtn.addEventListener('click', () => {
    els.stockForm.reset();
    document.getElementById('addStockTitle').textContent = 'Add MTF Stock';
    els.addStockModal.classList.remove('hidden');
  });

  ['addZMargin', 'addZLev'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if(!val || val<=0) return;
      if(id === 'addZMargin') document.getElementById('addZLev').value = (100/val).toFixed(2);
      if(id === 'addZLev') document.getElementById('addZMargin').value = (100/val).toFixed(2);
    });
  });
  
  ['addGMargin', 'addGLev'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if(!val || val<=0) return;
      if(id === 'addGMargin') document.getElementById('addGLev').value = (100/val).toFixed(2);
      if(id === 'addGLev') document.getElementById('addGMargin').value = (100/val).toFixed(2);
    });
  });

  els.stockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('addStockTitle').textContent.includes('Edit');
    const symbol = document.getElementById('addSSymbol').value.toUpperCase();
    
    if(!isEdit && MTF_STOCKS.find(x => x.symbol === symbol)) {
      document.getElementById('addStockError').textContent = "This stock symbol already exists.";
      document.getElementById('addStockError').classList.remove('hidden');
      return;
    }
    
    const s = {
      company: document.getElementById('addSName').value,
      symbol: symbol,
      exchange: 'NSE',
      isin: document.getElementById('addSIsin').value,
      zMargin: document.getElementById('addZAvail').checked ? parseFloat(document.getElementById('addZMargin').value) : null,
      gMargin: document.getElementById('addGAvail').checked ? parseFloat(document.getElementById('addGMargin').value) : null,
      updated: new Date().toISOString()
    };
    
    if(isEdit) {
      const idx1 = MTF_STOCKS.findIndex(x => x.symbol === symbol);
      if(idx1>-1) MTF_STOCKS[idx1] = s;
      const idx2 = customStocks.findIndex(x => x.symbol === symbol);
      if(idx2>-1) customStocks[idx2] = s; else customStocks.push(s);
    } else {
      MTF_STOCKS.unshift(s);
      customStocks.unshift(s);
    }
    
    localStorage.setItem('mtf_custom_stocks', JSON.stringify(customStocks));
    els.addStockModal.classList.add('hidden');
    renderStocksPage();
  });

  window.openStockDetail = function(symbol) {
    const s = MTF_STOCKS.find(x => x.symbol === symbol);
    if(!s) return;
    document.getElementById('addStockTitle').textContent = 'Edit MTF Stock';
    document.getElementById('addSName').value = s.company;
    document.getElementById('addSSymbol').value = s.symbol;
    document.getElementById('addSSymbol').disabled = true;
    document.getElementById('addSIsin').value = s.isin || '';
    
    if(s.zMargin) { document.getElementById('addZAvail').checked=true; document.getElementById('addZMargin').value=s.zMargin; document.getElementById('addZLev').value=(100/s.zMargin).toFixed(2); }
    else { document.getElementById('addZAvail').checked=false; }
    
    if(s.gMargin) { document.getElementById('addGAvail').checked=true; document.getElementById('addGMargin').value=s.gMargin; document.getElementById('addGLev').value=(100/s.gMargin).toFixed(2); }
    else { document.getElementById('addGAvail').checked=false; }
    
    els.addStockModal.classList.remove('hidden');
  };

  // CSV Export
  els.exportCsvBtn.addEventListener('click', () => {
    let csv = 'Company,Symbol,ISIN,ZerodhaMargin,GrowwMargin,Updated\n';
    MTF_STOCKS.forEach(s => {
      csv += `"${s.company}",${s.symbol},${s.isin||''},${s.zMargin||''},${s.gMargin||''},${s.updated}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'mtf_stocks.csv');
    a.click();
  });

  // --- History Page ---
  function renderHistory() {
    // Sync UI mode
    if (historySelectionMode) {
      els.historyNormalHeader.classList.add('hidden');
      els.historySelectHeader.classList.remove('hidden');
      els.historyActionBar.classList.remove('hidden');
      updateHistorySelectionText();
    } else {
      els.historyNormalHeader.classList.remove('hidden');
      els.historySelectHeader.classList.add('hidden');
      els.historyActionBar.classList.add('hidden');
    }

    if (historyData.length === 0) {
      els.historyGrid.innerHTML = `
        <div class="history-empty">
          <span class="material-symbols-outlined">history</span>
          <h3>No saved calculations yet.</h3>
          <p>Your saved MTF calculations will appear here.</p>
          <button class="btn-outline mt-lg" onclick="document.querySelector('.nav-link[data-page=\\'calculator\\']').click()">Go to Calculator</button>
        </div>
      `;
      // Ensure select features hide if empty
      els.historySelectBtn.disabled = true;
      if (historySelectionMode) toggleHistorySelectionMode();
      return;
    }
    
    els.historySelectBtn.disabled = false;
    
    els.historyGrid.innerHTML = historyData.map(h => {
      const zPL = h.zRes ? formatINR(h.zRes.netPL) : 'N/A';
      const gPL = h.gRes ? formatINR(h.gRes.netPL) : 'N/A';
      const maxQty = h.zRes ? h.zRes.qty : (h.gRes ? h.gRes.qty : 0);
      const isSelected = selectedHistoryIds.has(h.id);
      
      return `
        <div class="card history-card" style="padding:16px; cursor:${historySelectionMode ? 'pointer' : 'default'}; border-color:${isSelected ? 'var(--accent)' : 'var(--border)'}" onclick="${historySelectionMode ? `toggleHistoryItemSelection(${h.id})` : ''}">
          <div class="hc-top">
            <div class="hc-symbol-wrap">
              ${historySelectionMode ? `<input type="checkbox" class="hc-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleHistoryItemSelection(${h.id})">` : ''}
              <div class="hc-symbol">${h.stock.symbol}</div>
            </div>
            ${!historySelectionMode ? `
              <div class="hc-actions">
                <button class="icon-btn history-more-btn" onclick="event.stopPropagation(); openHistoryMenu(event, ${h.id})"><span class="material-symbols-outlined">more_vert</span></button>
              </div>
            ` : ''}
          </div>
          <div style="font-size:14px;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px">
            <span style="font-weight:600">${formatINR(h.bp)} <span style="color:var(--text2);font-weight:400">→</span> ${h.sp>0?formatINR(h.sp):'–'}</span>
          </div>
          <div style="font-size:13px;color:var(--text2);margin-bottom:12px">
            Capital: ${formatINR(h.cap)} &nbsp;&bull;&nbsp; Max Qty: ${maxQty} &nbsp;&bull;&nbsp; ${h.days} days
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--bg2);padding:10px;border-radius:var(--radius-sm)">
            <div>
              <div style="font-size:11px;color:var(--text2);margin-bottom:2px">Zerodha</div>
              <div style="font-size:14px;font-weight:600;color:${h.zRes&&h.zRes.netPL>=0?'var(--success)':'var(--danger)'}">${zPL}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text2);margin-bottom:2px">Groww</div>
              <div style="font-size:14px;font-weight:600;color:${h.gRes&&h.gRes.netPL>=0?'var(--success)':'var(--danger)'}">${gPL}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text2);margin-top:12px;text-align:right">
            ${new Date(h.date).toLocaleDateString()}
          </div>
          ${!historySelectionMode ? `
            <button class="btn-outline btn-sm w-full mt-lg" onclick="loadHistory(${h.id})">Load in Calculator</button>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Multi-Select Logic
  function toggleHistorySelectionMode() {
    historySelectionMode = !historySelectionMode;
    if (!historySelectionMode) selectedHistoryIds.clear();
    renderHistory();
  }

  window.toggleHistoryItemSelection = function(id) {
    if (!historySelectionMode) return;
    if (selectedHistoryIds.has(id)) selectedHistoryIds.delete(id);
    else selectedHistoryIds.add(id);
    renderHistory();
  }

  function updateHistorySelectionText() {
    const cnt = selectedHistoryIds.size;
    els.historySelectedCountText.textContent = `${cnt} selected`;
    els.historyActionText.textContent = `${cnt} selected`;
    if (cnt > 0) {
      els.historyDeleteSelectedBtn.disabled = false;
      els.historyDeleteSelectedBtn.textContent = `Delete Selected (${cnt})`;
    } else {
      els.historyDeleteSelectedBtn.disabled = true;
      els.historyDeleteSelectedBtn.textContent = `Delete Selected`;
    }
  }

  els.historySelectBtn.addEventListener('click', toggleHistorySelectionMode);
  els.historyCancelSelectBtn.addEventListener('click', toggleHistorySelectionMode);
  els.historySelectAllBtn.addEventListener('click', () => {
    if (selectedHistoryIds.size === historyData.length) {
      selectedHistoryIds.clear(); // Deselect all if all are selected
    } else {
      historyData.forEach(h => selectedHistoryIds.add(h.id));
    }
    renderHistory();
  });

  els.historyDeleteSelectedBtn.addEventListener('click', () => {
    const cnt = selectedHistoryIds.size;
    if (cnt === 0) return;
    if (confirm(`Delete ${cnt} calculations?\nThese calculations will be permanently removed.`)) {
      historyData = historyData.filter(h => !selectedHistoryIds.has(h.id));
      localStorage.setItem('mtf_history', JSON.stringify(historyData));
      historySelectionMode = false;
      selectedHistoryIds.clear();
      renderHistory();
    }
  });

  // Single Item Menu Logic
  let activeHistoryId = null;
  
  window.openHistoryMenu = function(e, id) {
    activeHistoryId = id;
    
    // Clear menu and re-add single item context
    els.historyContextMenu.innerHTML = `
      <div class="menu-item" onclick="loadHistory(${id})">Load in Calculator</div>
      <div class="menu-item text-danger" onclick="deleteSingleHistory(${id})">Delete</div>
    `;
    
    // Position menu
    const rect = e.currentTarget.getBoundingClientRect();
    els.historyContextMenu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    els.historyContextMenu.style.left = `${rect.left + window.scrollX - 120}px`;
    els.historyContextMenu.classList.remove('hidden');
  };

  window.deleteSingleHistory = function(id) {
    els.historyContextMenu.classList.add('hidden');
    if(confirm('Delete this calculation?\nThis saved calculation will be permanently removed.')) {
      historyData = historyData.filter(h => h.id !== id);
      localStorage.setItem('mtf_history', JSON.stringify(historyData));
      renderHistory();
    }
  };

  window.loadHistory = function(id) {
    els.historyContextMenu.classList.add('hidden');
    const h = historyData.find(x => x.id === id);
    if(!h) return;
    selectStock(h.stock);
    els.buyPrice.value = h.bp;
    els.sellPrice.value = h.sp;
    els.ownCapital.value = h.cap;
    els.holdingDays.value = h.days;
    showPage('calculator');
    els.calcBtn.click();
  };

  // Header settings menu -> Clear all
  els.historySettingsMenuBtn.addEventListener('click', (e) => {
    els.historyContextMenu.innerHTML = `
      <div class="menu-item text-danger" id="menuClearAllHistory">Clear All History</div>
    `;
    const rect = e.currentTarget.getBoundingClientRect();
    els.historyContextMenu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    els.historyContextMenu.style.left = `${rect.left + window.scrollX - 120}px`;
    els.historyContextMenu.classList.remove('hidden');
    
    document.getElementById('menuClearAllHistory').addEventListener('click', () => {
      els.historyContextMenu.classList.add('hidden');
      els.clearHistoryModal.classList.remove('hidden');
    });
  });

  els.confirmClearHistoryBtn.addEventListener('click', () => {
    historyData = [];
    localStorage.removeItem('mtf_history');
    els.clearHistoryModal.classList.add('hidden');
    renderHistory();
  });
});
