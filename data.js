// ===== MTF Stock Database =====
// This is sample data. Replace with real broker-verified data.
const MTF_STOCKS = [
  { company:"South Indian Bank", symbol:"SOUTHBANK", isin:"INE683A01023", exchange:"NSE", zMargin:33.67, gMargin:30.30, updated:"2026-08-27T10:32:00" },
  { company:"Reliance Industries", symbol:"RELIANCE", isin:"INE002A01018", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:31:00" },
  { company:"Tata Motors", symbol:"TATAMOTORS", isin:"INE155A01022", exchange:"NSE", zMargin:30.00, gMargin:null, updated:"2026-08-26T09:00:00" },
  { company:"HDFC Bank", symbol:"HDFCBANK", isin:"INE040A01034", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:30:00" },
  { company:"Infosys", symbol:"INFY", isin:"INE009A01021", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:30:00" },
  { company:"ICICI Bank", symbol:"ICICIBANK", isin:"INE090A01021", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:30:00" },
  { company:"State Bank of India", symbol:"SBIN", isin:"INE062A01020", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:29:00" },
  { company:"Tata Consultancy Services", symbol:"TCS", isin:"INE467B01029", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:30:00" },
  { company:"Bharti Airtel", symbol:"BHARTIARTL", isin:"INE397D01024", exchange:"NSE", zMargin:30.00, gMargin:30.00, updated:"2026-08-27T10:28:00" },
  { company:"ITC Limited", symbol:"ITC", isin:"INE154A01025", exchange:"NSE", zMargin:25.00, gMargin:20.00, updated:"2026-08-27T10:28:00" },
  { company:"Kotak Mahindra Bank", symbol:"KOTAKBANK", isin:"INE237A01028", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:27:00" },
  { company:"Larsen & Toubro", symbol:"LT", isin:"INE018A01030", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:27:00" },
  { company:"Axis Bank", symbol:"AXISBANK", isin:"INE238A01034", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:26:00" },
  { company:"Wipro", symbol:"WIPRO", isin:"INE075A01022", exchange:"NSE", zMargin:30.00, gMargin:30.00, updated:"2026-08-27T10:26:00" },
  { company:"HCL Technologies", symbol:"HCLTECH", isin:"INE860A01027", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:25:00" },
  { company:"Bajaj Finance", symbol:"BAJFINANCE", isin:"INE296A01024", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:25:00" },
  { company:"Maruti Suzuki", symbol:"MARUTI", isin:"INE585B01010", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:24:00" },
  { company:"Sun Pharma", symbol:"SUNPHARMA", isin:"INE044A01036", exchange:"NSE", zMargin:30.00, gMargin:30.00, updated:"2026-08-27T10:24:00" },
  { company:"Titan Company", symbol:"TITAN", isin:"INE280A01028", exchange:"NSE", zMargin:25.00, gMargin:null, updated:"2026-08-26T15:00:00" },
  { company:"Power Grid Corporation", symbol:"POWERGRID", isin:"INE752E01010", exchange:"NSE", zMargin:30.00, gMargin:30.00, updated:"2026-08-27T10:23:00" },
  { company:"Asian Paints", symbol:"ASIANPAINT", isin:"INE021A01026", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:22:00" },
  { company:"Adani Enterprises", symbol:"ADANIENT", isin:"INE423A01024", exchange:"NSE", zMargin:50.00, gMargin:50.00, updated:"2026-08-27T10:22:00" },
  { company:"Hindustan Unilever", symbol:"HINDUNILVR", isin:"INE030A01027", exchange:"NSE", zMargin:25.00, gMargin:25.00, updated:"2026-08-27T10:21:00" },
  { company:"NTPC Limited", symbol:"NTPC", isin:"INE733E01010", exchange:"NSE", zMargin:30.00, gMargin:25.00, updated:"2026-08-27T10:20:00" },
  { company:"Tata Steel", symbol:"TATASTEEL", isin:"INE081A01020", exchange:"NSE", zMargin:30.00, gMargin:30.00, updated:"2026-08-27T10:20:00" },
];

// ====================================================================
// BROKER PRICING CONFIGURATION — Single source of truth
// All rates verified from official broker pricing pages.
// DO NOT scatter numbers elsewhere in the codebase.
// ====================================================================

var BROKER_CONFIG = {
  // ----- Versioning & Metadata -----
  pricingVersion: "2.0.0",
  lastUpdated: "2026-08-31",
  lastVerifiedDate: "2026-08-31",

  // ----- Common Statutory Rates -----
  // STT: Securities Transaction Tax (delivery/MTF = 0.1% both sides)
  sttBuyRate: 0.001,         // 0.1% on buy value
  sttSellRate: 0.001,        // 0.1% on sell value

  // Stamp Duty: 0.015% on buy side only
  stampDutyBuyRate: 0.00015,

  // GST: 18% on brokerage + exchange txn + SEBI charges (NOT on STT, stamp duty)
  gstRate: 0.18,

  // ----- Zerodha -----
  zerodha: {
    name: "Zerodha",
    sourceUrl: "https://zerodha.com/charges",

    // MTF Interest: 0.04% per day on funded amount (charged from T+1)
    mtfInterestDaily: 0.0004,       // 0.04% per day as a decimal fraction
    mtfInterestAnnual: null,        // Zerodha quotes daily rate, not annual
    interestStartsT1: true,         // Interest begins from T+1

    // Brokerage: 0.3% or ₹20 per executed MTF order, whichever is LOWER
    brokeragePercent: 0.003,        // 0.3%
    brokerageCapPerOrder: 20,       // ₹20 cap per order
    brokerageMinPerOrder: 0,        // No minimum

    // Exchange Transaction Charges (NSE equity delivery)
    exchangeChargeRate_NSE: 0.0000307,  // 0.00307%
    exchangeChargeRate_BSE: 0.0000,     // BSE placeholder

    // SEBI Turnover Charge: ₹10 per crore
    sebiChargeRate: 10 / 10000000,      // ₹10 per crore = 0.000001

    // IPFT: Not charged separately by Zerodha
    ipftChargeRate: 0,

    // DP Charges: Not applicable for MTF (pledge/unpledge covers this)
    dpCharge: 0,

    // Pledge: ₹15 + GST per ISIN per pledge request
    pledgeFeePerISIN: 15,

    // Unpledge: ₹15 + GST per ISIN per unpledge request
    unpledgeFeePerISIN: 15,

    // Square-off: ₹50 + GST per order (only if broker forces square-off)
    squareOffFeePerOrder: 50,
  },

  // ----- Groww -----
  groww: {
    name: "Groww",
    sourceUrl: "https://groww.in/charges",

    // MTF Interest: 14.95% per annum on funded amount
    mtfInterestAnnual: 0.1495,                // 14.95% p.a.
    mtfInterestDaily: 0.1495 / 365,            // ~0.0409589% per day
    interestStartsT1: true,

    // Brokerage: 0.1% per executed MTF order
    brokeragePercent: 0.001,        // 0.1%
    brokerageCapPerOrder: null,     // No cap
    brokerageMinPerOrder: 0,

    // Exchange Transaction Charges (NSE equity delivery)
    exchangeChargeRate_NSE: 0.0000297,  // 0.00297%
    exchangeChargeRate_BSE: 0.0000,

    // SEBI Turnover Charge: ₹10 per crore (0.0001%)
    sebiChargeRate: 10 / 10000000,

    // IPFT: 0.0001% (₹10 per crore)
    ipftChargeRate: 10 / 10000000,

    // DP Charges (for sell debit)
    // Groww: ₹13.50 depository + ₹5.50 Groww = ₹19 (standard per sell scrip)
    // For debit values < ₹100: ₹0
    dpDepositoryCharge: 13.50,
    dpBrokerCharge: 5.50,
    dpMinDebitThreshold: 100,     // No DP charge if sell value < ₹100

    // Pledge: ₹20 per ISIN per pledge/unpledge order
    pledgeFeePerISIN: 20,
    unpledgeFeePerISIN: 20,

    // Square-off: Not separately listed, use 0
    squareOffFeePerOrder: 0,
  }
};
