// Test Runner for MTF Calculation Engine
const fs = require('fs');

// Load configurations and functions
eval(fs.readFileSync('./data.js', 'utf8'));
eval(fs.readFileSync('./calc.js', 'utf8'));

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${details}`);
    failed++;
  }
}

function assertClose(actual, expected, tolerance = 0.01, testName) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, testName, `(Expected: ${expected}, Actual: ${actual})`);
}

// TEST 1: TATASTEEL Example
function test1() {
  console.log('--- TEST 1: TATASTEEL Example ---');
  const cap = 45000;
  const bp = 181;
  const sp = 185;
  const marginPct = 30;
  const holding = 7;
  
  const options = { pledgeCount: 1, unpledgeCount: 1, squareOff: false, exchange: 'NSE' };
  
  const zRes = calcMTF('zerodha', cap, bp, sp, marginPct, holding, options);
  
  // Basic L1 & L2 assertions
  assert(zRes.qty === 828, 'Quantity should be floor(45000 / (181 * 0.3)) = 828');
  assertClose(zRes.buyValue, 149868, 0.01, 'Buy value should be 149868');
  assertClose(zRes.requiredMargin, 44960.40, 0.01, 'Required margin should be 44960.40');
  assertClose(zRes.brokerFunding, 104907.60, 0.01, 'Broker funding should be 104907.60');
  assertClose(zRes.grossPnL, 3312, 0.01, 'Gross profit should be 3312');
  
  // Specific Zerodha charges
  // Interest: 104907.60 * 0.0004 * 7 = 293.74
  assertClose(zRes.mtfInterest, 293.74, 0.01, 'Zerodha MTF interest (7 days)');
  // Brokerage: min(149868 * 0.003, 20) + min(153180 * 0.003, 20) = 40
  assertClose(zRes.brokerage, 40, 0.01, 'Zerodha brokerage should be capped at 40');
  // STT: 149868*0.001 + 153180*0.001 = 149.87 + 153.18 = 303.05
  assertClose(zRes.stt, 303.048, 0.01, 'Zerodha STT on buy+sell');
}

// TEST 2: Buy = Sell
function test2() {
  console.log('--- TEST 2: Buy = Sell ---');
  const res = calcMTF('zerodha', 45000, 181, 181, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  assert(res.grossPnL === 0, 'Gross P&L should be 0');
  assert(res.netPnL < 0, 'Net P&L should be negative due to charges');
}

// TEST 3: Sell < Buy
function test3() {
  console.log('--- TEST 3: Sell < Buy ---');
  const res = calcMTF('zerodha', 45000, 181, 175, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  assert(res.grossPnL < 0, 'Gross P&L should be negative');
  assert(res.netPnL < res.grossPnL, 'Net P&L should be even more negative after charges');
}

// TEST 4: Holding period = 0
function test4() {
  console.log('--- TEST 4: Holding period = 0 ---');
  const res = calcMTF('zerodha', 45000, 181, 185, 30, 0, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  assert(res.mtfInterest === 0, 'MTF interest should be 0 for 0 holding days');
}

// TEST 5: Capital insufficient
function test5() {
  console.log('--- TEST 5: Insufficient capital ---');
  // capital 10, buy price 100, margin 30% -> requires 30 capital for 1 share
  const res = calcMTF('zerodha', 10, 100, 105, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  assert(res === null, 'Should return null when quantity is 0');
}

// TEST 6: Zerodha brokerage cap
function test6() {
  console.log('--- TEST 6: Zerodha brokerage cap ---');
  // 0.3% of 1,00,000 = 300 -> should cap at 20
  const res = calcMTF('zerodha', 100000, 1000, 1000, 100, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  assert(res.buyBrokerage === 20, 'Buy brokerage should be capped at 20');
  assert(res.sellBrokerage === 20, 'Sell brokerage should be capped at 20');
  assert(res.brokerage === 40, 'Total brokerage should be 40');
}

// TEST 7: Groww brokerage
function test7() {
  console.log('--- TEST 7: Groww brokerage ---');
  // 0.1% per order, no cap
  const res = calcMTF('groww', 100000, 1000, 1000, 100, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  // buy value = 100000. 0.1% = 100
  assert(res.buyBrokerage === 100, 'Groww buy brokerage should be 100');
  assert(res.sellBrokerage === 100, 'Groww sell brokerage should be 100');
  assert(res.brokerage === 200, 'Groww total brokerage should be 200');
}

// TEST 8 & 9: STT 
function test8_9() {
  console.log('--- TEST 8 & 9: STT (Zerodha & Groww) ---');
  const zRes = calcMTF('zerodha', 100000, 1000, 1500, 100, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  const gRes = calcMTF('groww', 100000, 1000, 1500, 100, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  // buy = 100000 (STT = 100)
  // sell = 150000 (STT = 150)
  assertClose(zRes.sttBuy, 100, 0.01, 'Zerodha buy STT');
  assertClose(zRes.sttSell, 150, 0.01, 'Zerodha sell STT');
  assertClose(zRes.stt, 250, 0.01, 'Zerodha total STT');
  assertClose(gRes.sttBuy, 100, 0.01, 'Groww buy STT');
  assertClose(gRes.sttSell, 150, 0.01, 'Groww sell STT');
}

// TEST 10 & 11: Pledge / Unpledge
function test10_11() {
  console.log('--- TEST 10 & 11: Pledge/Unpledge ---');
  const zRes = calcMTF('zerodha', 10000, 100, 110, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  const gRes = calcMTF('groww', 10000, 100, 110, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  
  assert(zRes.pledgeCharge === 15, 'Zerodha pledge charge should be 15');
  assert(zRes.unpledgeCharge === 15, 'Zerodha unpledge charge should be 15');
  
  assert(gRes.pledgeCharge === 20, 'Groww pledge charge should be 20');
  assert(gRes.unpledgeCharge === 20, 'Groww unpledge charge should be 20');
}

// TEST 12: Groww DP charge
function test12() {
  console.log('--- TEST 12: DP Charge ---');
  const res1 = calcMTF('groww', 10000, 100, 110, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  assert(res1.dpCharge === 19, 'Groww DP charge should be 19 (13.5 + 5.5)');
  
  // sell < 100 -> no DP
  const res2 = calcMTF('groww', 10000, 1, 1.5, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  // buy value = floor(10000 / 0.3)*1 = 33333 * 1 = 33333 -> qty = 33333 -> sell value = 49999.5 (still > 100)
  
  // force qty = 1 -> cap = 0.3 * 1 = 0.3 -> wait, cap 1, buy 1, margin 30 => qty = 3
  const res3 = calcMTF('groww', 1, 1, 10, 30, 7, { pledgeCount: 1, unpledgeCount: 1, exchange: 'NSE' });
  // qty = 3, sell = 30 (< 100)
  assert(res3.dpCharge === 0, 'Groww DP charge should be 0 for sell value < 100');
}

// Run tests
test1();
test2();
test3();
test4();
test5();
test6();
test7();
test8_9();
test10_11();
test12();

console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
