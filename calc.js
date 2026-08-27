// ===== MTF Calculation Engine =====

function formatINR(n) {
  if (n == null || isNaN(n)) return '–';
  const neg = n < 0; n = Math.abs(n);
  const parts = n.toFixed(2).split('.');
  let intPart = parts[0];
  // Indian grouping: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = rest + ',' + last3;
  }
  return (neg ? '−' : '') + '₹' + intPart + '.' + parts[1];
}

function formatPct(n) {
  if (n == null || isNaN(n)) return '–';
  return n.toFixed(2) + '%';
}

function formatLeverage(marginPct) {
  if (!marginPct || marginPct <= 0) return '–';
  return (100 / marginPct).toFixed(2) + '×';
}

function getLeverage(marginPct) {
  if (!marginPct || marginPct <= 0) return null;
  return 100 / marginPct;
}

// Calculate all charges for one side (buy or sell)
function calcCharges(broker, buyPrice, sellPrice, qty, holdingDays, marginPct, overrides) {
  const posValue = buyPrice * qty;
  const sellValue = sellPrice * qty;
  const requiredMargin = posValue * (marginPct / 100);
  const brokerFunding = posValue - requiredMargin;

  // Interest
  const intRate = (overrides && overrides.interestRate > 0) ? overrides.interestRate : broker.interestRate;
  const dailyRate = intRate / 365 / 100;
  const interest = brokerFunding * dailyRate * Math.max(holdingDays, 0);

  // Brokerage (buy + sell)
  const brokPerOrder = (overrides && overrides.brokerage > 0) ? overrides.brokerage : broker.brokerage;
  const brokerage = brokPerOrder * 2; // flat per order, buy + sell

  // STT: 0.1% on sell side for delivery
  const stt = sellValue * BROKER_CONFIG.sttRate;

  // Exchange charges
  const exchangeCharges = (posValue + sellValue) * BROKER_CONFIG.exchangeChargeRate;

  // SEBI charges
  const sebiCharges = (posValue + sellValue) * BROKER_CONFIG.sebiRate;

  // GST on brokerage + exchange charges
  const gst = (brokerage + exchangeCharges) * BROKER_CONFIG.gstRate;

  // Stamp duty on buy
  const stampDuty = posValue * BROKER_CONFIG.stampDutyBuyRate;

  // DP charges
  const dpCharges = broker.dpCharges;

  // Pledge/Unpledge
  const pledgeCharges = broker.pledgeCharge + broker.unpledgeCharge;

  const totalCharges = interest + brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty + dpCharges + pledgeCharges;

  const grossPL = (sellPrice - buyPrice) * qty;
  const netPL = grossPL - totalCharges;
  const roi = requiredMargin > 0 ? (netPL / requiredMargin) * 100 : 0;

  return {
    posValue, sellValue, requiredMargin, brokerFunding,
    interest, brokerage, stt, exchangeCharges, gst, sebiCharges, stampDuty, dpCharges, pledgeCharges,
    totalCharges, grossPL, netPL, roi,
    intRate, holdingDays,
    leverage: getLeverage(marginPct),
    marginPct
  };
}

// Calculate break-even sell price
function calcBreakEven(broker, buyPrice, qty, holdingDays, marginPct, overrides) {
  // Start from buy price and iterate
  let lo = buyPrice * 0.5, hi = buyPrice * 3;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const r = calcCharges(broker, buyPrice, mid, qty, holdingDays, marginPct, overrides);
    if (r.netPL < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Calculate required sell price for target profit
function calcTargetSellPrice(broker, buyPrice, qty, holdingDays, marginPct, targetProfit, overrides) {
  let lo = buyPrice, hi = buyPrice * 5;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const r = calcCharges(broker, buyPrice, mid, qty, holdingDays, marginPct, overrides);
    if (r.netPL < targetProfit) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Day-wise calculations for chart/table
function calcDayWise(broker, buyPrice, sellPrice, qty, marginPct, days, overrides) {
  return days.map(d => {
    const r = calcCharges(broker, buyPrice, sellPrice, qty, d, marginPct, overrides);
    return { days: d, interest: r.interest, totalCharges: r.totalCharges, netPL: r.netPL, roi: r.roi };
  });
}
