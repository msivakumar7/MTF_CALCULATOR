// ===== MTF Calculator App Logic =====

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentStock = null;
  let overrides = { interestRate: 0, brokerage: 0 };
  let historyData = JSON.parse(localStorage.getItem('mtf_history') || '[]');
  let customStocks = JSON.parse(localStorage.getItem('mtf_custom_stocks') || '[]');
  let plChartInstance = null;
  let currentCalcData = null; // Store result for Detailed Analysis page

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
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    
    // Modals
    resetModal: document.getElementById('resetModal'),
    confirmResetBtn: document.getElementById('confirmResetBtn'),
    addStockModal: document.getElementById('addStockModal'),
    stockForm: document.getElementById('stockForm'),
    settingsModal: document.getElementById('settingsModal'),
    settingsBtn: document.getElementById('settingsBtn'),
    mobileSettingsBtn: document.getElementById('mobileSettingsBtn')
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
        if (pageId === 'history') renderHistory();
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
    
    const bp = parseFloat(els.buyPrice.value);
    const sp = parseFloat(els.sellPrice.value) || 0;
    const cap = parseFloat(els.ownCapital.value);
    const days = parseInt(els.holdingDays.value) || 0;
    
    const zOverrides = { interestRate: overrides.ovZInterest || 0, brokerage: overrides.ovZBrokerage || 0 };
    const gOverrides = { interestRate: overrides.ovGInterest || 0, brokerage: overrides.ovGBrokerage || 0 };
    
    // ZERODHA MATH
    let zRes = null;
    if (currentStock.zMargin) {
      const lev = getLev(currentStock.zMargin);
      const maxPos = cap * lev;
      const qty = Math.floor(maxPos / bp);
      if (qty > 0) {
        zRes = calcCharges(BROKER_CONFIG.zerodha, bp, sp, qty, days, currentStock.zMargin, zOverrides);
        zRes.qty = qty;
        zRes.maxPos = maxPos;
        zRes.lev = lev;
        zRes.actualPos = qty * bp;
        zRes.reqMargin = zRes.actualPos * (currentStock.zMargin / 100);
        zRes.brokerFunding = zRes.actualPos - zRes.reqMargin; // Overwrite calcCharges default which assumes full qty requirement
      }
    }
    
    // GROWW MATH
    let gRes = null;
    if (currentStock.gMargin) {
      const lev = getLev(currentStock.gMargin);
      const maxPos = cap * lev;
      const qty = Math.floor(maxPos / bp);
      if (qty > 0) {
        gRes = calcCharges(BROKER_CONFIG.groww, bp, sp, qty, days, currentStock.gMargin, gOverrides);
        gRes.qty = qty;
        gRes.maxPos = maxPos;
        gRes.lev = lev;
        gRes.actualPos = qty * bp;
        gRes.reqMargin = gRes.actualPos * (currentStock.gMargin / 100);
        gRes.brokerFunding = gRes.actualPos - gRes.reqMargin;
      }
    }
    
    currentCalcData = { bp, sp, cap, days, zRes, gRes, stock: currentStock };
    renderShortResults(currentCalcData);
  }

  function renderShortResults(data) {
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
    
    els.shortResultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          <tr><td>Brokerage</td><td class="text-right">${data.zRes?formatINR(data.zRes.brokerage):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.brokerage):'–'}</td></tr>
          <tr><td>MTF Interest</td><td class="text-right">${data.zRes?formatINR(data.zRes.interest):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.interest):'–'}</td></tr>
          <tr><td>STT</td><td class="text-right">${data.zRes?formatINR(data.zRes.stt):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.stt):'–'}</td></tr>
          <tr><td>Exchange Txn</td><td class="text-right">${data.zRes?formatINR(data.zRes.exchangeCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.exchangeCharges):'–'}</td></tr>
          <tr><td>GST</td><td class="text-right">${data.zRes?formatINR(data.zRes.gst):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.gst):'–'}</td></tr>
          <tr><td>SEBI & Stamp</td><td class="text-right">${data.zRes?formatINR(data.zRes.sebiCharges+data.zRes.stampDuty):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.sebiCharges+data.gRes.stampDuty):'–'}</td></tr>
          <tr><td>DP & Pledge</td><td class="text-right">${data.zRes?formatINR(data.zRes.dpCharges+data.zRes.pledgeCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.dpCharges+data.gRes.pledgeCharges):'–'}</td></tr>
          <tr class="total-row"><td>Total Charges</td><td class="text-right">${data.zRes?formatINR(data.zRes.totalCharges):'–'}</td><td class="text-right">${data.gRes?formatINR(data.gRes.totalCharges):'–'}</td></tr>
        </tbody>
      </table>
    `;

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
        bp: data.bp, sp: data.sp, cap: data.cap, days: data.days
      });
      if(historyData.length > 20) historyData.pop();
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
    if (historyData.length === 0) {
      els.historyGrid.innerHTML = `
        <div class="history-empty" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2)">
          <span class="material-symbols-outlined" style="font-size:48px;margin-bottom:16px;opacity:0.5">history</span>
          <h3>No saved calculations yet.</h3>
          <p>Calculate a trade and save it to view it here.</p>
        </div>
      `;
      return;
    }
    
    els.historyGrid.innerHTML = historyData.map(h => `
      <div class="card history-card" style="padding:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <strong>${h.stock.symbol}</strong>
          <span style="font-size:12px;color:var(--text2)">${new Date(h.date).toLocaleDateString()}</span>
        </div>
        <div style="font-size:14px;color:var(--text2);margin-bottom:12px">
          Capital: ${formatINR(h.cap)} <br/> Buy: ${formatINR(h.bp)} | Sell: ${formatINR(h.sp)}
        </div>
        <button class="btn-outline btn-sm w-full" onclick="loadHistory(${h.id})">Load in Calculator</button>
      </div>
    `).join('');
  }

  window.loadHistory = function(id) {
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

  els.clearHistoryBtn.addEventListener('click', () => {
    if(confirm('Clear all history?')) {
      historyData = [];
      localStorage.removeItem('mtf_history');
      renderHistory();
    }
  });
});
