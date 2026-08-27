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

// Broker configuration
const BROKER_CONFIG = {
  zerodha: {
    name: "Zerodha",
    interestRate: 18, // annual %
    brokerage: 20,    // flat per order
    dpCharges: 15.93,
    pledgeCharge: 0,
    unpledgeCharge: 0,
  },
  groww: {
    name: "Groww",
    interestRate: 14, // annual %
    brokerage: 20,
    dpCharges: 15.93,
    pledgeCharge: 0,
    unpledgeCharge: 0,
  },
  // Common regulatory charges (rates)
  sttRate: 0.001,          // 0.1% on sell side delivery
  exchangeChargeRate: 0.0000345, // NSE
  sebiRate: 0.000001,      // per crore
  gstRate: 0.18,           // 18%
  stampDutyBuyRate: 0.00015, // 0.015% on buy
};
