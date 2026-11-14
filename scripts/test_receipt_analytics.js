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
      price: 25, price_per_unit: 25, owner: 'C', supermarket: 'Føtex <store>' },
    { id: '2', item_id: 'milk', purchase_date: '2026-10-29', amount: '1 stk',
      price: 25, price_per_unit: 25, owner: 'A', supermarket: null }
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
          range() { return Promise.resolve({ data: tables[table], error: null }); }
        };
      }
    },
    normalizeCategory: (category) => category
  });
  const root = path.join(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
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

  vm.runInContext("receiptAnalytics.selectedDate = null; renderSpendingDetails()", context);
  assert.match(elements.get('receipt-date-items').innerHTML, /colspan="9"/);
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(page, /<th>Owner<\/th><th>Supermarket<\/th>/);
});
