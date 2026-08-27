// ===== MTF Calculator App Logic =====

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentStock = null;
  let calcMode = 'quantity'; // 'quantity' or 'capital'
  let overrides = { interestRate: 0, brokerage: 0 };
  let historyData = JSON.parse(localStorage.getItem('mtf_history') || '[]');
  let plChartInstance = null;

  // DOM Elements
  const els = {
    // Nav
    navLinks: document.querySelectorAll('.nav-link, .bnav-item'),
    pages: document.querySelectorAll('.page'),
    
    // Search
    searchInput: document.getElementById('stockSearch'),
    searchClear: document.getElementById('searchClear'),
    searchDropdown: document.getElementById('searchDropdown'),
    
    // Broker Status
    brokerStatus: document.getElementById('brokerStatus'),
    selectedStockInfo: document.getElementById('selectedStockInfo'),
    zMarginPct: document.getElementById('zMarginPct'),
    zLeverage: document.getElementById('zLeverage'),
    gMarginPct: document.getElementById('gMarginPct'),
    gLeverage: document.getElementById('gLeverage'),
    dataTsText: document.getElementById('dataTsText'),
    zChip: document.getElementById('zChip'),
    gChip: document.getElementById('gChip'),
    
    // Toggles
    modeQty: document.getElementById('modeQty'),
    modeCap: document.getElementById('modeCap'),
    useDatesToggle: document.getElementById('useDatesToggle'),
    
    // Inputs
    buyPrice: document.getElementById('buyPrice'),
    sellPrice: document.getElementById('sellPrice'),
    quantity: document.getElementById('quantity'),
    ownCapital: document.getElementById('ownCapital'),
    holdingDays: document.getElementById('holdingDays'),
    buyDate: document.getElementById('buyDate'),
    sellDate: document.getElementById('sellDate'),
    computedDays: document.getElementById('computedDays'),
    targetProfit: document.getElementById('targetProfit'),
    
    // Wrappers
    sellPriceGroup: document.getElementById('sellPriceGroup'),
    quantityGroup: document.getElementById('quantityGroup'),
    holdingDaysWrap: document.getElementById('holdingDaysWrap'),
    holdingDatesWrap: document.getElementById('holdingDatesWrap'),
    
    // Actions
    calcBtn: document.getElementById('calcBtn'),
    
    // Results
    emptyState: document.getElementById('emptyState'),
    resultsArea: document.getElementById('resultsArea'),
    tradeSummaryCard: document.getElementById('tradeSummaryCard'),
    winnerCard: document.getElementById('winnerCard'),
    brokerCompare: document.getElementById('brokerCompare'),
    fundingBody: document.getElementById('fundingBody'),
    chargesBody: document.getElementById('chargesBody'),
    interestBody: document.getElementById('interestBody'),
    dayPLBody: document.getElementById('dayPLBody'),
    breakEvenCard: document.getElementById('breakEvenCard'),
    targetResult: document.getElementById('targetResult'),
    
    // Result Actions
    saveCalcBtn: document.getElementById('saveCalcBtn'),
    shareCalcBtn: document.getElementById('shareCalcBtn'),
    newCalcBtn: document.getElementById('newCalcBtn'),
    
    // Settings
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    ovZInterest: document.getElementById('ovZInterest'),
    ovGInterest: document.getElementById('ovGInterest'),
    ovZBrokerage: document.getElementById('ovZBrokerage'),
    ovGBrokerage: document.getElementById('ovGBrokerage'),
    
    // Stocks Table
    stocksTableSearch: document.getElementById('stocksTableSearch'),
    stockFilterPills: document.getElementById('stockFilterPills'),
    stocksTableBody: document.getElementById('stocksTableBody'),
    
    // History
    historyGrid: document.getElementById('historyGrid'),
  };

  // --- Navigation ---
  els.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const pageId = e.currentTarget.getAttribute('data-page');
      
      // Update active nav
      els.navLinks.forEach(l => {
        if (l.getAttribute('data-page') === pageId) l.classList.add('active');
        else l.classList.remove('active');
      });
      
      // Show page
      els.pages.forEach(p => {
        if (p.id === 'page-' + pageId) p.classList.add('page-active');
        else p.classList.remove('page-active');
      });
      
      if (pageId === 'stocks') renderStocksTable();
      if (pageId === 'history') renderHistory();
    });
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
          li.innerHTML = `<span class="stock-name">${s.company}</span><span class="stock-meta">${s.symbol} • ${s.exchange}</span>`;
          li.addEventListener('click', () => selectStock(s));
          els.searchDropdown.appendChild(li);
        });
        els.searchDropdown.classList.remove('hidden');
      } else {
        els.searchDropdown.innerHTML = `<li style="pointer-events:none;color:var(--text2)">No stocks found</li>`;
        els.searchDropdown.classList.remove('hidden');
      }
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
    if (!e.target.closest('.search-wrap') && !e.target.closest('.search-dropdown')) {
      els.searchDropdown.classList.add('hidden');
    }
  });

  function selectStock(stock) {
    currentStock = stock;
    els.searchInput.value = `${stock.company} (${stock.symbol})`;
    els.searchDropdown.classList.add('hidden');
    
    // Update Broker Status
    els.selectedStockInfo.innerHTML = `<span class="stock-name">${stock.company}</span> <span class="stock-symbol">${stock.symbol}</span>`;
    
    if (stock.zMargin) {
      els.zMarginPct.textContent = formatPct(stock.zMargin);
      els.zLeverage.textContent = formatLeverage(stock.zMargin);
      els.zChip.style.opacity = '1';
    } else {
      els.zMarginPct.textContent = 'N/A';
      els.zLeverage.textContent = '–';
      els.zChip.style.opacity = '0.5';
    }
    
    if (stock.gMargin) {
      els.gMarginPct.textContent = formatPct(stock.gMargin);
      els.gLeverage.textContent = formatLeverage(stock.gMargin);
      els.gChip.style.opacity = '1';
    } else {
      els.gMarginPct.textContent = 'N/A';
      els.gLeverage.textContent = '–';
      els.gChip.style.opacity = '0.5';
    }
    
    els.dataTsText.innerHTML = `<span class="material-symbols-outlined tiny">update</span> Updated ${new Date(stock.updated).toLocaleString()}`;
    els.brokerStatus.classList.remove('hidden');
    checkCalcEnable();
  }

  // --- Toggles ---
  els.modeQty.addEventListener('click', () => {
    calcMode = 'quantity';
    els.modeQty.classList.add('active');
    els.modeCap.classList.remove('active');
    els.quantityGroup.classList.remove('hidden');
    els.sellPriceGroup.classList.remove('hidden');
    checkCalcEnable();
  });
  
  els.modeCap.addEventListener('click', () => {
    calcMode = 'capital';
    els.modeCap.classList.add('active');
    els.modeQty.classList.remove('active');
    els.quantityGroup.classList.add('hidden');
    els.sellPriceGroup.classList.add('hidden');
    checkCalcEnable();
  });

  els.useDatesToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      els.holdingDaysWrap.classList.add('hidden');
      els.holdingDatesWrap.classList.remove('hidden');
      
      // Default dates
      if (!els.buyDate.value) els.buyDate.valueAsDate = new Date();
      if (!els.sellDate.value) {
        let d = new Date();
        d.setDate(d.getDate() + (parseInt(els.holdingDays.value) || 7));
        els.sellDate.valueAsDate = d;
      }
      calcDaysFromDates();
    } else {
      els.holdingDaysWrap.classList.remove('hidden');
      els.holdingDatesWrap.classList.add('hidden');
    }
    checkCalcEnable();
  });

  function calcDaysFromDates() {
    if (els.buyDate.value && els.sellDate.value) {
      const ms = new Date(els.sellDate.value) - new Date(els.buyDate.value);
      const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
      els.holdingDays.value = days;
      els.computedDays.textContent = `Holding period: ${days} day(s)`;
      els.computedDays.classList.remove('hidden');
    } else {
      els.computedDays.classList.add('hidden');
    }
    checkCalcEnable();
  }
  
  els.buyDate.addEventListener('change', calcDaysFromDates);
  els.sellDate.addEventListener('change', calcDaysFromDates);

  // --- Validation ---
  [els.buyPrice, els.sellPrice, els.quantity, els.ownCapital, els.holdingDays].forEach(input => {
    input.addEventListener('input', checkCalcEnable);
    
    // Select all on click if 0
    input.addEventListener('focus', function() {
      if (this.value === '0') this.select();
    });
  });

  function checkCalcEnable() {
    let valid = currentStock !== null;
    const bp = parseFloat(els.buyPrice.value);
    if (isNaN(bp) || bp <= 0) valid = false;
    
    if (calcMode === 'quantity') {
      const qty = parseInt(els.quantity.value);
      if (isNaN(qty) || qty <= 0) valid = false;
    } else {
      const cap = parseFloat(els.ownCapital.value);
      if (isNaN(cap) || cap <= 0) valid = false;
    }
    
    els.calcBtn.disabled = !valid;
  }

  // --- Calculation Action ---
  els.calcBtn.addEventListener('click', performCalculation);
  els.targetProfit.addEventListener('input', () => {
    if (!els.resultsArea.classList.contains('hidden')) renderTargetProfit();
  });

  function performCalculation() {
    if (!currentStock) return;
    
    const bp = parseFloat(els.buyPrice.value);
    let sp = parseFloat(els.sellPrice.value);
    let qty = parseInt(els.quantity.value);
    let cap = parseFloat(els.ownCapital.value) || 0;
    const days = parseInt(els.holdingDays.value) || 0;
    
    const maxZMargin = currentStock.zMargin || 100;
    const maxGMargin = currentStock.gMargin || 100;
    const minMargin = Math.min(maxZMargin, maxGMargin); // lowest margin req
    
    if (calcMode === 'capital') {
      // Calculate max qty based on capital and min margin required
      const maxPosValue = cap / (minMargin / 100);
      qty = Math.floor(maxPosValue / bp);
      els.quantity.value = qty;
      sp = bp * 1.05; // Dummy 5% profit for display
      els.sellPrice.value = sp.toFixed(2);
    }
    
    const posVal = bp * qty;
    
    // Overrides
    const zOverrides = { interestRate: overrides.ovZInterest || 0, brokerage: overrides.ovZBrokerage || 0 };
    const gOverrides = { interestRate: overrides.ovGInterest || 0, brokerage: overrides.ovGBrokerage || 0 };
    
    const zResult = currentStock.zMargin ? calcCharges(BROKER_CONFIG.zerodha, bp, sp, qty, days, currentStock.zMargin, zOverrides) : null;
    const gResult = currentStock.gMargin ? calcCharges(BROKER_CONFIG.groww, bp, sp, qty, days, currentStock.gMargin, gOverrides) : null;
    
    renderResults({ bp, sp, qty, cap, days, posVal, zResult, gResult });
  }

  function renderResults(data) {
    els.emptyState.classList.add('hidden');
    els.resultsArea.classList.remove('hidden');
    els.resultsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // 1. Trade Summary
    els.tradeSummaryCard.innerHTML = `
      <div class="trade-header">
        <div>
          <h3 class="field-label" style="text-transform:uppercase;margin-bottom:4px">Your Trade</h3>
          <div style="display:flex;align-items:center;">
            <span class="trade-symbol">${currentStock.symbol}</span>
            <span class="trade-exchange">${currentStock.exchange}</span>
          </div>
        </div>
        <div class="trade-position-val">
          <div class="lbl">Position Value</div>
          <div class="val">${formatINR(data.posVal)}</div>
        </div>
      </div>
      <div class="trade-details-grid">
        <div class="trade-detail"><div class="lbl">Buy</div><div class="val">${formatINR(data.bp)}</div></div>
        <div class="trade-detail"><div class="lbl">Sell</div><div class="val">${formatINR(data.sp)}</div></div>
        <div class="trade-detail"><div class="lbl">Qty</div><div class="val">${data.qty}</div></div>
        ${data.cap > 0 ? `<div class="trade-detail"><div class="lbl">Capital</div><div class="val">${formatINR(data.cap)}</div></div>` : ''}
        <div class="trade-detail"><div class="lbl">Holding</div><div class="val">${data.days} Days</div></div>
      </div>
    `;

    // 2. Validate Margin against Capital
    let marginWarning = '';
    const reqZ = data.zResult ? data.zResult.requiredMargin : Infinity;
    const reqG = data.gResult ? data.gResult.requiredMargin : Infinity;
    const minReq = Math.min(reqZ, reqG);
    
    if (data.cap > 0 && data.cap < minReq && minReq !== Infinity) {
      marginWarning = `
        <div style="background:rgba(245, 158, 11, 0.1); border:1px solid var(--warning); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px;">
          <div style="color:var(--warning); font-weight:600; display:flex; align-items:center; gap:6px; margin-bottom:8px;">
            <span class="material-symbols-outlined tiny">warning</span> Insufficient Capital for MTF
          </div>
          <p style="font-size:14px; margin-bottom:8px">Your capital (${formatINR(data.cap)}) is less than the minimum required margin (${formatINR(minReq)}).</p>
        </div>
      `;
    }

    // 3. Find Winner
    let winner = null, diff = 0;
    if (data.zResult && data.gResult) {
      if (data.gResult.netPL > data.zResult.netPL) {
        winner = 'Groww'; diff = data.gResult.netPL - data.zResult.netPL;
      } else if (data.zResult.netPL > data.gResult.netPL) {
        winner = 'Zerodha'; diff = data.zResult.netPL - data.gResult.netPL;
      }
    } else if (data.zResult) { winner = 'Zerodha'; }
    else if (data.gResult) { winner = 'Groww'; }

    if (winner && diff > 0) {
      const winRes = winner === 'Groww' ? data.gResult : data.zResult;
      const loseRes = winner === 'Groww' ? data.zResult : data.gResult;
      
      let reasons = [];
      if (winRes.leverage > loseRes.leverage) reasons.push("Higher MTF leverage & lower funding requirement.");
      if (winRes.totalCharges < loseRes.totalCharges) reasons.push("Lower overall charges.");
      if (winRes.interest < loseRes.interest) reasons.push("Lower MTF interest cost for this duration.");
      
      els.winnerCard.innerHTML = `
        <div class="winner-badge">RECOMMENDED</div>
        <h2 class="winner-broker">BEST OPTION: ${winner.toUpperCase()}</h2>
        <div class="winner-advantage">
          <span class="material-symbols-outlined">trending_up</span>
          Estimated additional net profit: <span style="font-size:20px">${formatINR(diff)}</span>
        </div>
        <ul class="winner-reasons">
          ${reasons.map(r => `<li><span class="material-symbols-outlined">check_circle</span> ${r}</li>`).join('')}
        </ul>
      `;
      els.winnerCard.classList.remove('hidden');
    } else {
      els.winnerCard.classList.add('hidden');
    }

    // 4. Broker Compare Cards
    els.brokerCompare.innerHTML = marginWarning + `
      <div style="display:contents">
        ${renderBrokerCard('ZERODHA', data.zResult, winner === 'Zerodha')}
        ${renderBrokerCard('GROWW', data.gResult, winner === 'Groww')}
      </div>
    `;

    // 4b. Funding Explanation
    els.fundingBody.innerHTML = `
      <div style="font-size:14px; color:var(--text2); margin-bottom:12px">
        Broker funding = Position value − required margin.
        <br/>Maximum buying power is NOT the same as actual broker funding.
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div style="border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px">
          <strong>Zerodha</strong>
          <div style="margin-top:8px">Position Value: <span style="float:right">${formatINR(data.posVal)}</span></div>
          <div>Req. Margin: <span style="float:right">${data.zResult?formatINR(data.zResult.requiredMargin):'–'}</span></div>
          <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px; font-weight:600">Funding: <span style="float:right; color:var(--accent)">${data.zResult?formatINR(data.zResult.brokerFunding):'–'}</span></div>
        </div>
        <div style="border:1px solid var(--border); border-radius:var(--radius-sm); padding:16px">
          <strong>Groww</strong>
          <div style="margin-top:8px">Position Value: <span style="float:right">${formatINR(data.posVal)}</span></div>
          <div>Req. Margin: <span style="float:right">${data.gResult?formatINR(data.gResult.requiredMargin):'–'}</span></div>
          <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px; font-weight:600">Funding: <span style="float:right; color:var(--info)">${data.gResult?formatINR(data.gResult.brokerFunding):'–'}</span></div>
        </div>
      </div>
    `;

    // 5. Charges Breakdown
    els.chargesBody.innerHTML = `
      <table class="charges-table">
        <thead>
          <tr>
            <th>Charge Type</th>
            <th class="text-right">Zerodha</th>
            <th class="text-right">Groww</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Brokerage</td><td class="text-right">${data.zResult?formatINR(data.zResult.brokerage):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.brokerage):'–'}</td></tr>
          <tr><td>MTF Interest</td><td class="text-right">${data.zResult?formatINR(data.zResult.interest):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.interest):'–'}</td></tr>
          <tr><td>STT</td><td class="text-right">${data.zResult?formatINR(data.zResult.stt):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.stt):'–'}</td></tr>
          <tr><td>Exchange Txn Charge</td><td class="text-right">${data.zResult?formatINR(data.zResult.exchangeCharges):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.exchangeCharges):'–'}</td></tr>
          <tr><td>GST</td><td class="text-right">${data.zResult?formatINR(data.zResult.gst):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.gst):'–'}</td></tr>
          <tr><td>SEBI Charges</td><td class="text-right">${data.zResult?formatINR(data.zResult.sebiCharges):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.sebiCharges):'–'}</td></tr>
          <tr><td>Stamp Duty</td><td class="text-right">${data.zResult?formatINR(data.zResult.stampDuty):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.stampDuty):'–'}</td></tr>
          <tr><td>DP Charges</td><td class="text-right">${data.zResult?formatINR(data.zResult.dpCharges):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.dpCharges):'–'}</td></tr>
          <tr><td>Pledge/Unpledge</td><td class="text-right">${data.zResult?formatINR(data.zResult.pledgeCharges):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.pledgeCharges):'–'}</td></tr>
          <tr class="total-row"><td>Total Charges</td><td class="text-right">${data.zResult?formatINR(data.zResult.totalCharges):'–'}</td><td class="text-right">${data.gResult?formatINR(data.gResult.totalCharges):'–'}</td></tr>
        </tbody>
      </table>
    `;

    // 6. Interest Table & Day P/L
    const dayIntervals = [1, 2, 5, 8, 10, 15, 30];
    if (!dayIntervals.includes(data.days) && data.days > 0) {
      dayIntervals.push(data.days);
      dayIntervals.sort((a,b)=>a-b);
    }
    
    const zOverrides = { interestRate: overrides.ovZInterest || 0, brokerage: overrides.ovZBrokerage || 0 };
    const gOverrides = { interestRate: overrides.ovGInterest || 0, brokerage: overrides.ovGBrokerage || 0 };
    
    const zDayWise = data.zResult ? calcDayWise(BROKER_CONFIG.zerodha, data.bp, data.sp, data.qty, currentStock.zMargin, dayIntervals, zOverrides) : null;
    const gDayWise = data.gResult ? calcDayWise(BROKER_CONFIG.groww, data.bp, data.sp, data.qty, currentStock.gMargin, dayIntervals, gOverrides) : null;
    
    let intHtml = `<table class="pl-table"><thead><tr><th>Holding Period</th><th>Zerodha Int.</th><th>Groww Int.</th></tr></thead><tbody>`;
    let plHtml = `<table class="pl-table"><thead><tr><th>Holding Period</th><th>Zerodha Net P/L</th><th>Groww Net P/L</th></tr></thead><tbody>`;
    
    dayIntervals.forEach((d, i) => {
      const zi = zDayWise ? zDayWise[i].interest : null;
      const gi = gDayWise ? gDayWise[i].interest : null;
      intHtml += `<tr ${d===data.days?'style="background:rgba(255,90,111,0.05)"':''}><td>${d} day(s)</td><td>${zDayWise?formatINR(zi):'–'}</td><td>${gDayWise?formatINR(gi):'–'}</td></tr>`;
      
      const zpl = zDayWise ? zDayWise[i].netPL : null;
      const gpl = gDayWise ? gDayWise[i].netPL : null;
      const zcls = zpl!==null?(zpl>=0?'profit-color':'loss-color'):'';
      const gcls = gpl!==null?(gpl>=0?'profit-color':'loss-color'):'';
      plHtml += `<tr ${d===data.days?'style="background:rgba(255,90,111,0.05)"':''}><td>${d} day(s)</td><td class="${zcls}">${zDayWise?formatINR(zpl):'–'}</td><td class="${gcls}">${gDayWise?formatINR(gpl):'–'}</td></tr>`;
    });
    intHtml += `</tbody></table>`;
    plHtml += `</tbody></table>`;
    
    els.interestBody.innerHTML = intHtml;
    els.dayPLBody.innerHTML = plHtml;

    // 6b. Chart
    const ctx = document.getElementById('plChart').getContext('2d');
    if (plChartInstance) plChartInstance.destroy();
    
    plChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dayIntervals.map(d => d + 'd'),
        datasets: [
          {
            label: 'Zerodha Net P/L',
            data: zDayWise ? zDayWise.map(x => x.netPL) : [],
            borderColor: '#FF5A6F',
            backgroundColor: '#FF5A6F',
            tension: 0.1
          },
          {
            label: 'Groww Net P/L',
            data: gDayWise ? gDayWise.map(x => x.netPL) : [],
            borderColor: '#4F7CFF',
            backgroundColor: '#4F7CFF',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.dataset.label + ': ' + formatINR(ctx.parsed.y)
            }
          }
        },
        scales: {
          y: {
            ticks: { callback: (val) => '₹' + val }
          }
        }
      }
    });

    // 7. Break Even
    const zBE = data.zResult ? calcBreakEven(BROKER_CONFIG.zerodha, data.bp, data.qty, data.days, currentStock.zMargin, zOverrides) : null;
    const gBE = data.gResult ? calcBreakEven(BROKER_CONFIG.groww, data.bp, data.qty, data.days, currentStock.gMargin, gOverrides) : null;
    
    els.breakEvenCard.innerHTML = `
      <h3 class="card-title">Break-Even Price</h3>
      <p style="font-size:13px; color:var(--text2)">At this sell price, your trade covers funding, interest, and all charges.</p>
      <div class="be-grid">
        <div class="be-item"><div class="lbl">ZERODHA</div><div class="val">${zBE?formatINR(zBE):'–'}</div></div>
        <div class="be-item"><div class="lbl">GROWW</div><div class="val">${gBE?formatINR(gBE):'–'}</div></div>
      </div>
    `;

    // 8. Target Profit
    window.currentCalcParams = { 
      bp: data.bp, qty: data.qty, days: data.days,
      zMargin: currentStock.zMargin, gMargin: currentStock.gMargin,
      zOverrides, gOverrides
    };
    renderTargetProfit();

    // Setup Collapsibles
    document.querySelectorAll('.collapse-header').forEach(btn => {
      btn.onclick = function() {
        this.classList.toggle('open');
        const target = document.getElementById(this.getAttribute('data-target'));
        target.classList.toggle('hidden');
      };
    });
  }

  function renderBrokerCard(name, result, isWinner) {
    if (!result) {
      return `
        <div class="broker-card">
          <div class="broker-card-name">${name}</div>
          <div style="text-align:center;color:var(--text2);padding:40px 0;font-size:14px">MTF Not Available</div>
        </div>
      `;
    }
    return `
      <div class="broker-card ${isWinner ? 'winner-highlight' : ''}">
        <div class="broker-card-name">${name}</div>
        <div class="broker-metric"><span class="lbl">Leverage</span><span class="val">${formatLeverage(result.marginPct)}</span></div>
        <div class="broker-metric"><span class="lbl">Req. Margin</span><span class="val">${formatINR(result.requiredMargin)}</span></div>
        <div class="broker-metric"><span class="lbl">Broker Funding</span><span class="val">${formatINR(result.brokerFunding)}</span></div>
        <div class="broker-metric" style="background:var(--bg2);padding:6px;border-radius:4px;margin-top:12px">
          <span class="lbl">Total Charges</span><span class="val loss-color">${formatINR(result.totalCharges)}</span>
        </div>
        <div class="broker-net">
          <div class="lbl">Net Profit / Loss</div>
          <div class="val ${result.netPL >= 0 ? 'profit-color' : 'loss-color'}">${formatINR(result.netPL)}</div>
          <div class="roi ${result.roi >= 0 ? 'profit-color' : 'loss-color'}">ROI: ${formatPct(result.roi)}</div>
        </div>
      </div>
    `;
  }

  function renderTargetProfit() {
    const target = parseFloat(els.targetProfit.value) || 0;
    const p = window.currentCalcParams;
    if (!p) return;
    
    const zSell = p.zMargin ? calcTargetSellPrice(BROKER_CONFIG.zerodha, p.bp, p.qty, p.days, p.zMargin, target, p.zOverrides) : null;
    const gSell = p.gMargin ? calcTargetSellPrice(BROKER_CONFIG.groww, p.bp, p.qty, p.days, p.gMargin, target, p.gOverrides) : null;
    
    els.targetResult.innerHTML = `
      <div class="tp-grid">
        <div class="tp-item"><div class="lbl">Zerodha Required Sell</div><div class="val">${zSell?formatINR(zSell):'–'}</div></div>
        <div class="tp-item"><div class="lbl">Groww Required Sell</div><div class="val">${gSell?formatINR(gSell):'–'}</div></div>
      </div>
    `;
  }

  // --- Result Actions ---
  els.newCalcBtn.addEventListener('click', () => {
    els.resultsArea.classList.add('hidden');
    els.emptyState.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  els.saveCalcBtn.addEventListener('click', () => {
    if (!currentStock) return;
    const calc = {
      id: Date.now(),
      date: new Date().toISOString(),
      stock: currentStock,
      bp: parseFloat(els.buyPrice.value),
      sp: parseFloat(els.sellPrice.value),
      qty: parseInt(els.quantity.value),
      days: parseInt(els.holdingDays.value) || 0,
      winnerHtml: els.winnerCard.classList.contains('hidden') ? null : els.winnerCard.querySelector('.winner-broker').textContent
    };
    historyData.unshift(calc);
    if(historyData.length > 20) historyData.pop();
    localStorage.setItem('mtf_history', JSON.stringify(historyData));
    alert('Calculation saved to History.');
  });

  // --- Stocks Table ---
  let currentFilter = 'all';
  
  els.stockFilterPills.addEventListener('click', (e) => {
    if(e.target.classList.contains('pill')){
      document.querySelectorAll('.pill').forEach(p=>p.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.getAttribute('data-filter');
      renderStocksTable();
    }
  });
  
  els.stocksTableSearch.addEventListener('input', renderStocksTable);

  function renderStocksTable() {
    const q = els.stocksTableSearch.value.toLowerCase().trim();
    let filtered = MTF_STOCKS.filter(s => {
      const matchQ = s.company.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q);
      let matchF = true;
      if (currentFilter === 'zerodha') matchF = s.zMargin !== null;
      if (currentFilter === 'groww') matchF = s.gMargin !== null;
      if (currentFilter === 'both') matchF = s.zMargin !== null && s.gMargin !== null;
      return matchQ && matchF;
    });
    
    els.stocksTableBody.innerHTML = filtered.map(s => {
      const bestM = Math.min(s.zMargin||100, s.gMargin||100);
      let levHtml = '–';
      if (bestM < 100) {
        const lev = (100/bestM).toFixed(1);
        let bcls = 'badge-green';
        if (s.zMargin && !s.gMargin) { bcls = 'badge-orange'; levHtml = `<span class="leverage-badge ${bcls}">Zerodha Only</span>`; }
        else if (!s.zMargin && s.gMargin) { bcls = 'badge-orange'; levHtml = `<span class="leverage-badge ${bcls}">Groww Only</span>`; }
        else { levHtml = `<span class="leverage-badge ${bcls}">${lev}x</span>`; }
      }
      return `
        <tr onclick="openStockDetail('${s.symbol}')">
          <td>
            <div class="stock-cell">
              <div class="stock-avatar">${s.company.charAt(0)}</div>
              <div style="font-weight:500">${s.company}</div>
            </div>
          </td>
          <td style="color:var(--text2)">${s.symbol}</td>
          <td class="text-right">${s.zMargin?formatPct(s.zMargin):'N/A'}</td>
          <td class="text-right">${s.gMargin?formatPct(s.gMargin):'N/A'}</td>
          <td class="text-right">${levHtml}</td>
          <td><div class="time-cell"><span class="material-symbols-outlined">schedule</span>${new Date(s.updated).toLocaleDateString()}</div></td>
        </tr>
      `;
    }).join('');
  }

  window.openStockDetail = function(symbol) {
    const s = MTF_STOCKS.find(x => x.symbol === symbol);
    if(!s) return;
    
    document.getElementById('stockDetailContent').innerHTML = `
      <div class="modal-header">
        <div>
          <h2>${s.company}</h2>
          <span style="font-size:12px;color:var(--text2);background:var(--bg2);padding:2px 6px;border-radius:4px">${s.symbol} • ${s.exchange}</span>
        </div>
        <button class="icon-btn" onclick="document.getElementById('stockDetailModal').classList.add('hidden')"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="modal-body">
        <h3 style="font-size:16px;font-weight:600;margin-bottom:16px">Broker Availability</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
          <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <strong>Zerodha</strong>
              <span class="material-symbols-outlined tiny" style="color:var(--success)">check_circle</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:12px;color:var(--text2)">Margin</span>
              <span style="font-size:20px;font-weight:700">${s.zMargin?formatPct(s.zMargin):'N/A'}</span>
            </div>
          </div>
          <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <strong>Groww</strong>
              <span class="material-symbols-outlined tiny" style="color:var(--success)">check_circle</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:12px;color:var(--text2)">Margin</span>
              <span style="font-size:20px;font-weight:700">${s.gMargin?formatPct(s.gMargin):'N/A'}</span>
            </div>
          </div>
        </div>
        <button class="btn-primary" onclick="useStock('${s.symbol}')">Use in Calculator</button>
      </div>
    `;
    document.getElementById('stockDetailModal').classList.remove('hidden');
  };

  window.useStock = function(symbol) {
    document.getElementById('stockDetailModal').classList.add('hidden');
    const s = MTF_STOCKS.find(x => x.symbol === symbol);
    selectStock(s);
    // Switch to calc tab
    els.navLinks[0].click();
    window.scrollTo(0,0);
  };

  // --- History ---
  function renderHistory() {
    if (historyData.length === 0) {
      els.historyGrid.innerHTML = `
        <div class="history-empty">
          <span class="material-symbols-outlined">history</span>
          <h3>No calculations saved</h3>
          <p>Calculate a trade and save it to view it here later.</p>
        </div>
      `;
      return;
    }
    
    els.historyGrid.innerHTML = historyData.map(h => `
      <div class="history-card">
        <div class="hc-top">
          <div class="hc-symbol">${h.stock.symbol}</div>
          <div class="hc-date">${new Date(h.date).toLocaleDateString()}</div>
        </div>
        <div class="hc-prices">
          <div class="hc-price"><div class="lbl">Buy</div><div class="val">${formatINR(h.bp)}</div></div>
          <span class="material-symbols-outlined" style="color:var(--border)">arrow_forward</span>
          <div class="hc-price"><div class="lbl">Sell</div><div class="val">${formatINR(h.sp)}</div></div>
        </div>
        <div class="hc-meta">
          <div><div class="lbl">Quantity</div><div class="val">${h.qty}</div></div>
          <div><div class="lbl">Holding</div><div class="val">${h.days} days</div></div>
        </div>
        <div class="hc-bottom">
          <div>
            <div class="lbl">Result</div>
            <div style="font-size:13px;font-weight:600;color:var(--accent)">${h.winnerHtml || 'Compared'}</div>
          </div>
          <div class="hc-actions">
            <button onclick="loadHistory(${h.id})" title="Open"><span class="material-symbols-outlined">open_in_new</span></button>
            <button onclick="deleteHistory(${h.id})" title="Delete" style="color:var(--danger)"><span class="material-symbols-outlined">delete</span></button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.loadHistory = function(id) {
    const h = historyData.find(x => x.id === id);
    if(!h) return;
    selectStock(h.stock);
    els.buyPrice.value = h.bp;
    els.sellPrice.value = h.sp;
    els.quantity.value = h.qty;
    els.holdingDays.value = h.days;
    els.navLinks[0].click(); // go to calc
    els.calcBtn.click(); // run
  };

  window.deleteHistory = function(id) {
    historyData = historyData.filter(x => x.id !== id);
    localStorage.setItem('mtf_history', JSON.stringify(historyData));
    renderHistory();
  };

  // --- Settings ---
  els.settingsBtn.addEventListener('click', () => els.settingsModal.classList.remove('hidden'));
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', function() {
      document.getElementById(this.getAttribute('data-close')).classList.add('hidden');
    });
  });
  
  els.saveSettingsBtn.addEventListener('click', () => {
    overrides.ovZInterest = parseFloat(els.ovZInterest.value) || 0;
    overrides.ovGInterest = parseFloat(els.ovGInterest.value) || 0;
    overrides.ovZBrokerage = parseFloat(els.ovZBrokerage.value) || 0;
    overrides.ovGBrokerage = parseFloat(els.ovGBrokerage.value) || 0;
    els.settingsModal.classList.add('hidden');
    if (!els.resultsArea.classList.contains('hidden')) performCalculation();
  });

});
