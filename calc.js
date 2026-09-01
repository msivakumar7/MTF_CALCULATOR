// ====================================================================
// MTF Calculation Engine v2.0
// Audited and corrected financial calculation engine.
//
// Calculation layers (never mix):
//   L1: Trade economics (qty, position, gross P&L)
//   L2: MTF funding (margin, broker funding)
//   L3: Broker-specific charges (brokerage, pledge)
//   L4: Statutory charges (STT, stamp duty, exchange, SEBI, IPFT)
//   L5: Interest (MTF daily interest)
//   L6: Net P&L
//
// ROUNDING RULE: Keep full precision internally.
// Round only for display (₹ to 2 decimals, % to 2 decimals).
// ====================================================================

// ===== FORMATTING UTILITIES =====

function formatINR(n) {
  if (n == null || isNaN(n)) return '–';
  const neg = n < 0;
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
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


// ===== L1: TRADE ECONOMICS =====

/**
 * Calculate quantity, position, and gross P&L.
 * Quantity uses FLOOR — no fractional shares.
 *
 * @param {number} capital - User's capital (₹)
 * @param {number} buyPrice - Buy price per share
 * @param {number} sellPrice - Sell price per share (0 if unknown)
 * @param {number} marginPct - Required margin percentage (e.g. 30 for 30%)
 * @returns {object} Trade economics
 */
function calcTradeEconomics(capital, buyPrice, sellPrice, marginPct) {
  const marginFraction = marginPct / 100;

  // Quantity = floor(capital / (buyPrice × marginFraction))
  const qty = Math.floor(capital / (buyPrice * marginFraction));

  const buyValue = qty * buyPrice;
  const sellValue = qty * sellPrice;
  const grossPnL = sellValue - buyValue;

  return { qty, buyValue, sellValue, grossPnL };
}


// ===== L2: MTF FUNDING =====

/**
 * Calculate margin requirement and broker funding.
 *
 * @param {number} buyValue - Total buy value
 * @param {number} marginPct - Margin percentage (e.g. 30)
 * @returns {object} Funding details
 */
function calcFunding(buyValue, marginPct) {
  const marginFraction = marginPct / 100;
  const requiredMargin = buyValue * marginFraction;
  const brokerFunding = buyValue - requiredMargin;
  const leverage = 100 / marginPct;

  return { requiredMargin, brokerFunding, leverage };
}


// ===== L3+L4+L5: BROKER-SPECIFIC CHARGES =====

/**
 * Calculate brokerage for one order (buy or sell).
 *
 * @param {object} brokerCfg - Broker configuration (BROKER_CONFIG.zerodha or .groww)
 * @param {number} orderValue - Value of the order
 * @returns {number} Brokerage for this order
 */
function calcBrokeragePerOrder(brokerCfg, orderValue) {
  const percentBrokerage = orderValue * brokerCfg.brokeragePercent;

  if (brokerCfg.brokerageCapPerOrder != null && brokerCfg.brokerageCapPerOrder > 0) {
    return Math.min(percentBrokerage, brokerCfg.brokerageCapPerOrder);
  }
  return percentBrokerage;
}


/**
 * Calculate MTF interest.
 *
 * Zerodha: fundedAmount × 0.0004 × interestDays
 * Groww:   fundedAmount × (0.1495 / 365) × interestDays
 *
 * @param {object} brokerCfg - Broker configuration
 * @param {number} fundedAmount - Broker funding amount
 * @param {number} interestDays - Number of interest days
 * @returns {number} Total MTF interest
 */
function calcMTFInterest(brokerCfg, fundedAmount, interestDays) {
  const days = Math.max(0, interestDays);
  return fundedAmount * brokerCfg.mtfInterestDaily * days;
}


/**
 * Calculate all charges for a complete trade (buy + sell) for one broker.
 *
 * This function implements the full layered charge calculation:
 *   - Brokerage (per order with cap)
 *   - MTF Interest
 *   - STT (buy + sell sides)
 *   - Exchange Transaction Charges
 *   - SEBI Turnover Charge
 *   - IPFT
 *   - Stamp Duty (buy side only)
 *   - DP Charges (Groww only, for sell)
 *   - Pledge / Unpledge
 *   - GST (on brokerage + exchange + SEBI + IPFT + pledge/unpledge, NOT on STT/stamp)
 *   - Square-off (only if explicitly set)
 *
 * @param {string} brokerKey - 'zerodha' or 'groww'
 * @param {number} buyValue - Total buy value
 * @param {number} sellValue - Total sell value
 * @param {number} fundedAmount - Broker funding amount
 * @param {number} interestDays - Number of interest days
 * @param {object} options - { pledgeCount, unpledgeCount, squareOff, overrideInterestRate, overrideBrokerage, exchange }
 * @returns {object} Itemized charges breakdown
 */
function calcAllCharges(brokerKey, buyValue, sellValue, fundedAmount, interestDays, options) {
  const cfg = BROKER_CONFIG[brokerKey];
  const opts = options || {};
  const pledgeCount = opts.pledgeCount != null ? opts.pledgeCount : 1;
  const unpledgeCount = opts.unpledgeCount != null ? opts.unpledgeCount : 1;
  const squareOff = opts.squareOff || false;
  const exchange = opts.exchange || 'NSE';

  // --- Brokerage ---
  const buyBrokerage = calcBrokeragePerOrder(cfg, buyValue);
  const sellBrokerage = calcBrokeragePerOrder(cfg, sellValue);
  const brokerage = buyBrokerage + sellBrokerage;

  // --- MTF Interest ---
  const mtfInterest = calcMTFInterest(cfg, fundedAmount, interestDays);

  // --- STT: 0.1% on BOTH buy and sell (delivery/MTF) ---
  const sttBuy = buyValue * BROKER_CONFIG.sttBuyRate;
  const sttSell = sellValue * BROKER_CONFIG.sttSellRate;
  const stt = sttBuy + sttSell;

  // --- Exchange Transaction Charges ---
  const totalTurnover = buyValue + sellValue;
  const exchRate = exchange === 'BSE'
    ? (cfg.exchangeChargeRate_BSE || 0)
    : cfg.exchangeChargeRate_NSE;
  const exchangeCharges = totalTurnover * exchRate;

  // --- SEBI Turnover Charge ---
  const sebiCharges = totalTurnover * cfg.sebiChargeRate;

  // --- IPFT ---
  const ipftCharges = totalTurnover * (cfg.ipftChargeRate || 0);

  // --- Stamp Duty: buy side only ---
  const stampDuty = buyValue * BROKER_CONFIG.stampDutyBuyRate;

  // --- DP Charges (Groww only, for sell transaction) ---
  let dpCharge = 0;
  if (brokerKey === 'groww' && cfg.dpDepositoryCharge != null) {
    // Only charge DP if sell value >= threshold
    if (sellValue >= (cfg.dpMinDebitThreshold || 0)) {
      dpCharge = cfg.dpDepositoryCharge + cfg.dpBrokerCharge;
    }
  } else if (cfg.dpCharge) {
    dpCharge = cfg.dpCharge;
  }

  // --- Pledge / Unpledge ---
  const pledgeCharge = pledgeCount * cfg.pledgeFeePerISIN;
  const unpledgeCharge = unpledgeCount * cfg.unpledgeFeePerISIN;
  const pledgeUnpledgeTotal = pledgeCharge + unpledgeCharge;

  // --- Square-off (only if user selected) ---
  const squareOffCharge = squareOff ? cfg.squareOffFeePerOrder : 0;

  // --- GST ---
  // GST applies to: brokerage + exchange charges + SEBI + IPFT + pledge/unpledge + square-off + DP
  // GST does NOT apply to: STT, stamp duty
  const gstBase = brokerage + exchangeCharges + sebiCharges + ipftCharges
    + pledgeUnpledgeTotal + squareOffCharge + dpCharge;
  const gst = gstBase * BROKER_CONFIG.gstRate;

  // --- Total Charges ---
  const totalCharges = brokerage + mtfInterest + stt + exchangeCharges
    + sebiCharges + ipftCharges + stampDuty + dpCharge
    + pledgeCharge + unpledgeCharge + gst + squareOffCharge;

  return {
    brokerage,
    buyBrokerage,
    sellBrokerage,
    mtfInterest,
    stt,
    sttBuy,
    sttSell,
    exchangeCharges,
    sebiCharges,
    ipftCharges,
    stampDuty,
    dpCharge,
    pledgeCharge,
    unpledgeCharge,
    gst,
    gstBase,
    squareOffCharge,
    totalCharges
  };
}


// ===== L6: NET P&L & RETURNS =====

/**
 * Calculate net P&L and return metrics.
 *
 * @param {number} grossPnL - Gross P&L (sell - buy)
 * @param {number} totalCharges - Total charges
 * @param {number} capital - User's initial capital
 * @param {number} requiredMargin - Required margin
 * @returns {object} { netPnL, returnOnCapital, returnOnMargin }
 */
function calcNetPnL(grossPnL, totalCharges, capital, requiredMargin) {
  const netPnL = grossPnL - totalCharges;
  const returnOnCapital = capital > 0 ? (netPnL / capital) * 100 : 0;
  const returnOnMargin = requiredMargin > 0 ? (netPnL / requiredMargin) * 100 : 0;

  return { netPnL, returnOnCapital, returnOnMargin };
}


// ===== COMPLETE CALCULATION =====

/**
 * Perform the complete MTF calculation for a single broker.
 *
 * @param {string} brokerKey - 'zerodha' or 'groww'
 * @param {number} capital - User's capital
 * @param {number} buyPrice - Buy price per share
 * @param {number} sellPrice - Sell price per share
 * @param {number} marginPct - Margin % (e.g. 30)
 * @param {number} holdingDays - Number of holding/interest days
 * @param {object} options - { pledgeCount, unpledgeCount, squareOff, exchange }
 * @returns {object|null} Full calculation result, or null if qty=0
 */
function calcMTF(brokerKey, capital, buyPrice, sellPrice, marginPct, holdingDays, options) {
  // Validation
  if (capital <= 0 || buyPrice <= 0 || marginPct <= 0 || marginPct > 100) return null;

  // L1: Trade economics
  const trade = calcTradeEconomics(capital, buyPrice, sellPrice, marginPct);
  if (trade.qty <= 0) return null;

  // L2: Funding
  const funding = calcFunding(trade.buyValue, marginPct);

  // L5+L3+L4: All charges
  const charges = calcAllCharges(
    brokerKey,
    trade.buyValue,
    trade.sellValue,
    funding.brokerFunding,
    holdingDays,
    options
  );

  // L6: Net P&L
  const pnl = calcNetPnL(trade.grossPnL, charges.totalCharges, capital, funding.requiredMargin);

  return {
    // Trade
    qty: trade.qty,
    buyValue: trade.buyValue,
    sellValue: trade.sellValue,
    grossPnL: trade.grossPnL,

    // Funding
    requiredMargin: funding.requiredMargin,
    brokerFunding: funding.brokerFunding,
    leverage: funding.leverage,
    marginPct: marginPct,

    // Charges (itemized)
    ...charges,

    // P&L
    netPnL: pnl.netPnL,
    returnOnCapital: pnl.returnOnCapital,
    returnOnMargin: pnl.returnOnMargin,

    // Meta
    holdingDays: holdingDays,
    brokerKey: brokerKey,
    brokerName: BROKER_CONFIG[brokerKey].name,
    pricingVersion: BROKER_CONFIG.pricingVersion,
  };
}


// ===== BREAK-EVEN =====

/**
 * Find the sell price at which net P&L = 0 (break-even).
 */
function calcBreakEven(brokerKey, capital, buyPrice, marginPct, holdingDays, options) {
  let lo = buyPrice * 0.5, hi = buyPrice * 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = calcMTF(brokerKey, capital, buyPrice, mid, marginPct, holdingDays, options);
    if (!r) return null;
    if (r.netPnL < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}


// ===== TARGET PROFIT =====

/**
 * Find the sell price needed to achieve a target net profit.
 */
function calcTargetSellPrice(brokerKey, capital, buyPrice, marginPct, holdingDays, targetProfit, options) {
  let lo = buyPrice, hi = buyPrice * 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = calcMTF(brokerKey, capital, buyPrice, mid, marginPct, holdingDays, options);
    if (!r) return null;
    if (r.netPnL < targetProfit) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}


// ===== DAY-WISE CALCULATION =====

/**
 * Calculate P&L for a range of holding days (for charts/tables).
 */
function calcDayWise(brokerKey, capital, buyPrice, sellPrice, marginPct, daysArray, options) {
  return daysArray.map(d => {
    const r = calcMTF(brokerKey, capital, buyPrice, sellPrice, marginPct, d, options);
    if (!r) return { days: d, interest: 0, totalCharges: 0, netPnL: 0, roi: 0 };
    return {
      days: d,
      interest: r.mtfInterest,
      totalCharges: r.totalCharges,
      netPnL: r.netPnL,
      roi: r.returnOnCapital
    };
  });
}


// ===== INTEREST DAYS FROM DATES =====

/**
 * Calculate interest days from buy date and sell date.
 * Interest starts from T+1 (day after purchase).
 *
 * @param {string|Date} buyDate
 * @param {string|Date} sellDate
 * @returns {number} Interest days (>= 0)
 */
function calcInterestDaysFromDates(buyDate, sellDate) {
  const buy = new Date(buyDate);
  const sell = new Date(sellDate);
  const ms = sell - buy;
  const days = Math.floor(ms / 86400000);
  return Math.max(0, days); // Interest from T+1 to sell date = calendar days difference
}
