const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('spending details load and display supermarkets', async () => {
  const elements = new Map();
  const selections = {};
  const facts = [
    { id: '1', item_id: 'milk', purchase_date: '2026-10-29', amount: '1 stk',
      price: 25, price_per_unit: 25, owner: 'C', supermarket: 'Føtex <store>',
      discount: '7.00', discount_plus: '2.00' },
    { id: '2', item_id: 'milk', purchase_date: '2026-10-29', amount: '1 stk',
      price: 25, price_per_unit: 25, owner: 'A', supermarket: null,
      discount: '3.50', discount_plus: null },
    { id: '3', item_id: 'milk', purchase_date: '2026-10-30', amount: '1 stk',
      price: 25, price_per_unit: 25, owner: 'C', supermarket: 'Netto',
      discount: '11.00', discount_plus: null },
    { id: '4', item_id: 'milk', purchase_date: '2026-09-10', amount: '1 stk',
      price: 4, price_per_unit: 4, owner: 'C', supermarket: 'Føtex <store>',
      discount: '1.00', discount_plus: null }
  ];
  const tables = {
    receipt_item_dimension: [{ id: 'milk', name: 'Milk', normalized_name: 'milk', category: 'Dairy' }],
    receipt_item_facts: facts
  };
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    },
    supabaseClient: {
      from(table) {
        return {
          select(columns) { selections[table] = columns; return this; },
          order() { return this; },
          range() {
            const columns = selections[table].split(',');
            const data = tables[table].map((row) =>
              Object.fromEntries(columns.filter((column) => column in row).map((column) => [column, row[column]]))
            );
            return Promise.resolve({ data, error: null });
          }
        };
      }
    },
    normalizeCategory: (category) => category
  });
  const root = path.join(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    const originalRenderReceiptAnalytics = renderReceiptAnalytics;
    updateReceiptYearOptions = () => {};
    updateReceiptCategoryOptions = () => {};
    renderReceiptAnalytics = () => {};
    receiptAnalytics.year = '2026';
    receiptAnalytics.selectedDate = '2026-10-29';
  `, context);
  assert.equal(await vm.runInContext('loadReceiptData(0)', context), true);
  assert.ok(selections.receipt_item_facts.split(',').includes('supermarket'));

  vm.runInContext('renderSpendingDetails()', context);
  const html = elements.get('receipt-date-items').innerHTML;
  assert.match(html, /data-label="Supermarket">Føtex &lt;store&gt;/);
  assert.match(html, /data-label="Supermarket">—/);
  assert.match(html, /data-label="Owner">C/);
  assert.match(html, /data-label="Owner">A/);
  const discount = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(7);
  assert.ok(html.includes(`<td data-label="Discount">${discount}</td>`));
  assert.doesNotMatch(html, /Netto Plus rabat/);
  const money = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' });
  assert.equal(elements.get('receipt-date-total').textContent, money.format(50));
  assert.equal(elements.get('receipt-date-discount').textContent, money.format(12.5));

  vm.runInContext("receiptAnalytics.itemSearch = 'missing'; renderSpendingDetails()", context);
  assert.equal(elements.get('receipt-date-discount').textContent, money.format(0));
  vm.runInContext("receiptAnalytics.itemSearch = ''; receiptAnalytics.selectedDate = '2026-10-30'; renderSpendingDetails()", context);
  assert.equal(elements.get('receipt-date-discount').textContent, money.format(11));

  vm.runInContext("receiptAnalytics.selectedDate = null; renderSpendingDetails()", context);
  assert.equal(elements.get('receipt-date-discount').textContent, money.format(0));
  assert.match(elements.get('receipt-date-items').innerHTML, /colspan="8"/);
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const header = page.match(/<thead><tr>(.*?)<\/tr><\/thead>\s*<tbody id="receipt-date-items">/s);
  assert.ok(header);
  const headings = [...header[1].matchAll(/<th>(.*?)<\/th>/g)].map((match) => match[1]);
  const firstRow = html.match(/<tr>(.*?)<\/tr>/s);
  assert.ok(firstRow);
  const labels = [...firstRow[1].matchAll(/<td data-label="([^"]+)">/g)].map((match) => match[1]);
  assert.deepEqual(labels, headings);
  assert.match(page, /id="receipt-tab-supermarkets"[^>]*aria-controls="receipt-panel-supermarkets"/);
  assert.match(page, /id="receipt-panel-supermarkets"[^>]*aria-labelledby="receipt-tab-supermarkets"/);
  assert.match(page, /src="js\/receipt-analytics\.js\?v=4"/);

  vm.runInContext(`
    renderReceiptMonthlySummary = () => {};
    renderReceiptSpending = () => {};
    renderTopReceiptItems = () => {};
    renderReceiptCategories = () => {};
    renderAllReceiptItems = () => {};
    renderReceiptAnalytics = originalRenderReceiptAnalytics;
    renderReceiptAnalytics();
  `, context);
  const supermarketRows = () => {
    const summary = elements.get('receipt-supermarket-summary').innerHTML;
    const pattern = /<td data-label="Supermarket">([^<]+)<\/td>\s*<td data-label="Total spend">([^<]+)<\/td>\s*<td data-label="Total discount">([^<]+)<\/td>/g;
    return [...summary.matchAll(pattern)].map((match) => match.slice(1));
  };
  assert.deepEqual(supermarketRows(), [
    ['Føtex &lt;store&gt;', money.format(29), money.format(10)],
    ['Unknown', money.format(25), money.format(3.5)],
    ['Netto', money.format(25), money.format(11)]
  ]);
  vm.runInContext("receiptAnalytics.month = '10'; renderReceiptAnalytics()", context);
  assert.deepEqual(supermarketRows().find((row) => row[0] === 'Føtex &lt;store&gt;'),
    ['Føtex &lt;store&gt;', money.format(25), money.format(9)]);
  vm.runInContext("receiptAnalytics.itemSearch = 'missing'; renderReceiptAnalytics()", context);
  assert.match(elements.get('receipt-supermarket-summary').innerHTML, /No supermarket totals available/);
});
