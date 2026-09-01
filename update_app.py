import re

with open('app.js', 'r') as f:
    content = f.read()

# Update performCalculation
old_calc = """  function performCalculation() {
    if (!currentStock) return;
    
    // Simulate slight loading feeling on desktop (immediate on mobile usually but good for UX)
    els.calcBtn.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">sync</span> Calculating...`;
    
    setTimeout(() => {
      els.calcBtn.innerHTML = `Calculate MTF`;
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
    }, 150);
  }"""

new_calc = """  function performCalculation() {
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
  }"""

content = content.replace(old_calc, new_calc)

# Update renderDetailedAnalysis Charges Table and Assumptions
old_render = """    // Charges
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
    `;"""

new_render = """    // Charges
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
    }"""
content = content.replace(old_render, new_render)


with open('app.js', 'w') as f:
    f.write(content)
