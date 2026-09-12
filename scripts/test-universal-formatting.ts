import assert from 'assert';
import { formatPrice, formatNumber, formatPercent } from '../lib/utils';

console.log('================================================================');
console.log('TESTING UNIVERSAL NUMBER & MONEY DISPLAY FORMATTING');
console.log('================================================================\n');

function check(title: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${title}`);
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('--- TEST 1: INR Money Formatter (formatPrice) ---');
check('0, null, undefined, NaN format to ₹0', () => {
  assert.strictEqual(formatPrice(0), '₹0');
  assert.strictEqual(formatPrice(null), '₹0');
  assert.strictEqual(formatPrice(undefined), '₹0');
  assert.strictEqual(formatPrice(NaN), '₹0');
});

check('45.65 rounds up to ₹46', () => {
  assert.strictEqual(formatPrice(45.65), '₹46');
});

check('45.45 rounds down to ₹45', () => {
  assert.strictEqual(formatPrice(45.45), '₹45');
});

check('999.49 rounds down to ₹999', () => {
  assert.strictEqual(formatPrice(999.49), '₹999');
});

check('999.50 rounds up to ₹1,000 with Indian grouping', () => {
  assert.strictEqual(formatPrice(999.50), '₹1,000');
});

check('18250 formats to ₹18,250', () => {
  assert.strictEqual(formatPrice(18250), '₹18,250');
});

check('18250.40 rounds to ₹18,250', () => {
  assert.strictEqual(formatPrice(18250.40), '₹18,250');
});

check('18250.50 rounds to ₹18,251', () => {
  assert.strictEqual(formatPrice(18250.50), '₹18,251');
});

check('18250.666 rounds to ₹18,251', () => {
  assert.strictEqual(formatPrice(18250.666), '₹18,251');
});

check('100000 formats with Indian grouping to ₹1,00,000', () => {
  assert.strictEqual(formatPrice(100000), '₹1,00,000');
});

check('1000000 formats with Indian grouping to ₹10,00,000', () => {
  assert.strictEqual(formatPrice(1000000), '₹10,00,000');
});

console.log('\n--- TEST 2: Indian Grouping Whole-Number Formatter (formatNumber) ---');
check('formatNumber rounds to nearest whole number with Indian grouping', () => {
  assert.strictEqual(formatNumber(0), '0');
  assert.strictEqual(formatNumber(45.65), '46');
  assert.strictEqual(formatNumber(45.45), '45');
  assert.strictEqual(formatNumber(999.50), '1,000');
  assert.strictEqual(formatNumber(18250.666), '18,251');
  assert.strictEqual(formatNumber(100000), '1,00,000');
});

console.log('\n--- TEST 3: Whole-Number Percentage Formatter (formatPercent) ---');
check('0, null, undefined, NaN format to 0%', () => {
  assert.strictEqual(formatPercent(0), '0%');
  assert.strictEqual(formatPercent(null), '0%');
  assert.strictEqual(formatPercent(undefined), '0%');
  assert.strictEqual(formatPercent(NaN), '0%');
});

check('45.65 rounds to 46%', () => {
  assert.strictEqual(formatPercent(45.65), '46%');
});

check('45.45 rounds to 45%', () => {
  assert.strictEqual(formatPercent(45.45), '45%');
});

check('15.5 rounds to 16%', () => {
  assert.strictEqual(formatPercent(15.5), '16%');
});

check('15.49 rounds to 15%', () => {
  assert.strictEqual(formatPercent(15.49), '15%');
});

check('73.737373 rounds to 74% (Wholesale Calculator Bug Scenario)', () => {
  assert.strictEqual(formatPercent(73.737373), '74%');
});

check('99.999 rounds to 100%', () => {
  assert.strictEqual(formatPercent(99.999), '100%');
});

console.log('\n================================================================');
console.log('ALL WHOLE-NUMBER UNIVERSAL FORMATTING TESTS PASSED!');
console.log('================================================================\n');

