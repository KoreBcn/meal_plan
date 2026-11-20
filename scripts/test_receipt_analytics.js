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
    receiptAnalytics.month = '';
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
  const chartMoney = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
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
  assert.match(page, /id="receipt-tab-insights"[^>]*aria-controls="receipt-panel-insights"/);
  assert.match(page, /id="receipt-panel-insights"[^>]*aria-labelledby="receipt-tab-insights"/);

  vm.runInContext(`
    renderReceiptMonthlySummary = () => {};
    renderReceiptCalendar = () => {};
    renderTopReceiptItems = () => {};
    renderReceiptCategories = () => {};
    renderAllReceiptItems = () => {};
    renderReceiptAnalytics = originalRenderReceiptAnalytics;
    renderReceiptAnalytics();
  `, context);
  let summary = elements.get('receipt-supermarket-summary').innerHTML;
  assert.match(summary, /class="receipt-bar-chart"/);
  assert.ok(summary.includes(`Føtex &lt;store&gt;: ${chartMoney.format(29)}; discounts: ${chartMoney.format(10)}`));
  assert.ok(summary.includes(`Unknown: ${chartMoney.format(25)}`));
  assert.ok(summary.includes(`Netto: ${chartMoney.format(25)}`));
  vm.runInContext("receiptAnalytics.month = '10'; renderReceiptAnalytics()", context);
  summary = elements.get('receipt-supermarket-summary').innerHTML;
  assert.ok(summary.includes(`Føtex &lt;store&gt;: ${chartMoney.format(29)}; discounts: ${chartMoney.format(10)}`));
  vm.runInContext("receiptAnalytics.supermarket = 'Unknown'; renderReceiptAnalytics()", context);
  summary = elements.get('receipt-supermarket-summary').innerHTML;
  assert.ok(summary.includes(`Unknown: ${chartMoney.format(25)}`));
  assert.doesNotMatch(summary, /Netto|Føtex/);
  vm.runInContext("receiptAnalytics.itemSearch = 'missing'; renderReceiptAnalytics()", context);
  assert.match(elements.get('receipt-supermarket-summary').innerHTML, /No positive supermarket totals/);
});

test('insights ignores spending selections but respects filter pane and pagination', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {
          listeners: {},
          classList: { toggle() {} },
          setAttribute(name, value) { this[name] = value; },
          addEventListener(type, handler) { this.listeners[type] = handler; },
          querySelectorAll: () => []
        });
        return elements.get(id);
      },
      querySelectorAll: () => [],
      querySelector: () => ({}),
      documentElement: { style: { setProperty() {} } }
    },
    ResizeObserver: class { observe() {} },
    supabaseClient: {
      auth: {
        onAuthStateChange() {},
        getSession: () => new Promise(() => {})
      }
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source, context);
  vm.runInContext(`
    receiptAnalytics.year = '2024';
    receiptAnalytics.month = '01';
    receiptAnalytics.selectedDate = '2024-01-01';
    receiptAnalytics.items = Array.from({length: 12}, (_, i) => ({ id: String(i), name: 'Milk ' + i, category: 'Food' }));
    receiptAnalytics.items.push({id:'bread', name:'Bread', category:'Bakery'});
    receiptAnalytics.rows = receiptAnalytics.items.slice(0, 12).map((item, i) => ({
      date: i < 10 ? '2024-01-01' : '2024-02-01',
      item_id:item.id, item:item.name, category:item.category, supermarket:'Netto', amount:'1', price:30-i
    }));
    receiptAnalytics.rows.push({date:'2024-02-01', item_id:'bread', item:'Bread', category:'Bakery', supermarket:'Other', amount:'1', price:1});
    receiptAnalytics.rows.push({date:'2023-01-01', item_id:'bread', item:'Bread', category:'Bakery', supermarket:'Other', amount:'1', price:1000});
    renderReceiptAnalytics();
  `, context);
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 2');
  assert.match(elements.get('receipt-category-summary').innerHTML, /Bakery/);
  assert.match(elements.get('receipt-supermarket-summary').innerHTML, /Other/);
  vm.runInContext("activateReceiptTab('all-items')", context);
  assert.equal(elements.get('receipt-review-only').hidden, false);
  assert.equal(elements.get('receipt-year-filter').hidden, true);
  elements.get('receipt-review-only').listeners.click();
  assert.equal(elements.get('receipt-review-only')['aria-pressed'], 'true');
  assert.equal(elements.get('receipt-review-only').title, 'Show all items');
  vm.runInContext("activateReceiptTab('insights')", context);
  assert.equal(elements.get('receipt-review-only').hidden, true);
  assert.equal(elements.get('receipt-year-filter').hidden, false);
  assert.equal(vm.runInContext('receiptAnalytics.reviewOnly', context), true);
  vm.runInContext("activateReceiptTab('all-items')", context);
  assert.equal(elements.get('receipt-review-only').hidden, false);
  assert.equal(elements.get('receipt-review-only')['aria-pressed'], 'true');
  elements.get('receipt-review-only').listeners.click();
  assert.equal(elements.get('receipt-review-only')['aria-pressed'], 'false');
  const categoryButton = elements.get('receipt-show-categories');
  const supermarketButton = elements.get('receipt-show-supermarkets');
  for (const button of [categoryButton, supermarketButton]) {
    button.setAttribute = (name, value) => { button[name] = value; };
  }
  supermarketButton.listeners.click();
  assert.equal(supermarketButton['aria-pressed'], 'true');
  assert.equal(elements.get('receipt-supermarket-summary').hidden, false);
  categoryButton.listeners.click();
  assert.equal(categoryButton['aria-pressed'], 'true');
  assert.equal(elements.get('receipt-category-summary').hidden, false);
  const categoryChart = elements.get('receipt-category-summary');
  const foodBar = {
    dataset: { barCategories: JSON.stringify(['Food']) },
    setAttribute(name, value) { this[name] = value; }
  };
  categoryChart.querySelectorAll = () => [foodBar];
  categoryChart.listeners.click({ target: { closest: () => foodBar } });
  assert.equal(foodBar['aria-pressed'], 'true');
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 2');
  assert.doesNotMatch(elements.get('receipt-top-items').innerHTML, /Bread/);
  categoryChart.listeners.click({ target: { closest: () => foodBar } });
  assert.equal(foodBar['aria-pressed'], 'false');
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 2');

  elements.get('receipt-category-filter').value = 'Food';
  elements.get('receipt-category-filter').listeners.change();
  elements.get('receipt-supermarket-filter').value = 'Netto';
  elements.get('receipt-supermarket-filter').listeners.change();
  elements.get('receipt-item-search').value = 'milk';
  elements.get('receipt-item-search').listeners.input();
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 2');
  assert.doesNotMatch(elements.get('receipt-category-summary').innerHTML, /Bakery/);
  assert.doesNotMatch(elements.get('receipt-supermarket-summary').innerHTML, /Other/);
  elements.get('receipt-top-next').listeners.click();
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 2 of 2');
  assert.match(elements.get('receipt-top-items').innerHTML, /Milk 11/);
  elements.get('receipt-summary').listeners.click({
    target: { closest: () => ({ dataset: { receiptMonth: '02' } }) }
  });
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 2 of 2');
  assert.match(elements.get('receipt-top-items').innerHTML, /Milk 11/);

  const mappingsBeforeYearChange = elements.get('receipt-all-items').innerHTML;
  elements.get('receipt-year-filter').value = '2023';
  elements.get('receipt-year-filter').listeners.change();
  assert.match(elements.get('receipt-top-items').innerHTML, /No items match/);
  assert.equal(elements.get('receipt-all-items').innerHTML, mappingsBeforeYearChange);

  const chart = elements.get('receipt-category-summary');
  const detail = { textContent: '' };
  const bar = { dataset: { barDetail: 'Food: 10' }, contains: () => false };
  chart.querySelector = (selector) => selector === '.receipt-bar-detail' ? detail : bar;
  const event = { target: { closest: () => bar }, relatedTarget: null };
  chart.listeners.focusin(event);
  chart.listeners.mouseout(event);
  assert.equal(detail.textContent, 'Food: 10');
  chart.listeners.focusout(event);
  assert.equal(detail.textContent, 'Select a category to filter Top Items; select it again to clear.');

  vm.runInContext(`
    receiptAnalytics.year = '2024';
    receiptAnalytics.category = '';
    receiptAnalytics.supermarket = '';
    receiptAnalytics.itemSearch = '';
    receiptAnalytics.rows = Array.from({length: 12}, (_, i) => ({
      date:'2024-02-01', item_id:String(i), item:'Item ' + i,
      category:'Category ' + i, amount:'1', price:12-i
    }));
    renderReceiptCategories(receiptAnalytics.rows);
  `, context);
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 1 of 2');
  assert.equal(elements.get('receipt-breakdown-prev').disabled, true);
  elements.get('receipt-breakdown-next').listeners.click();
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 2 of 2');
  assert.equal(elements.get('receipt-breakdown-next').disabled, true);
  assert.match(categoryChart.innerHTML, /data-bar-categories="\[&quot;Category 10&quot;\]"/);
  const otherBar = {
    dataset: { barCategories: JSON.stringify(['Category 10']) },
    setAttribute(name, value) { this[name] = value; }
  };
  categoryChart.querySelectorAll = () => [otherBar];
  categoryChart.listeners.click({ target: { closest: () => otherBar } });
  assert.equal(otherBar['aria-pressed'], 'true');
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 1');
  assert.match(elements.get('receipt-top-items').innerHTML, /Item 10/);
  assert.doesNotMatch(elements.get('receipt-top-items').innerHTML, /Item 11/);
  assert.doesNotMatch(elements.get('receipt-top-items').innerHTML, /Item 9/);
  elements.get('receipt-breakdown-prev').listeners.click();
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 1 of 2');
  assert.match(elements.get('receipt-top-items').innerHTML, /Item 10/);
  elements.get('receipt-breakdown-next').listeners.click();
  assert.match(categoryChart.innerHTML, /data-bar-categories="\[&quot;Category 10&quot;\]" aria-pressed="true"/);
  elements.get('receipt-item-search').value = 'Item 0';
  elements.get('receipt-item-search').listeners.input();
  assert.match(elements.get('receipt-top-items').innerHTML, /Item 0/);
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 1 of 1');
  assert.equal(elements.get('receipt-breakdown-next').disabled, true);

  vm.runInContext(`
    receiptAnalytics.itemSearch = '';
    receiptAnalytics.rows = Array.from({length: 12}, (_, i) => ({
      date:'2024-02-01', item_id:String(i), item:'Item ' + i,
      category:'Food', supermarket:'Shop ' + i, amount:'1', price:12-i
    }));
    receiptAnalytics.rows.push(
      {date:'2024-02-01', item_id:'unknown-a', item:'Unknown A', category:'Food', supermarket:null, amount:'1', price:0.2},
      {date:'2024-02-01', item_id:'unknown-b', item:'Unknown B', category:'Food', supermarket:' ', amount:'1', price:0.2}
    );
    renderReceiptAnalytics();
  `, context);
  supermarketButton.listeners.click();
  const supermarketChart = elements.get('receipt-supermarket-summary');
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 1 of 2');
  elements.get('receipt-breakdown-next').listeners.click();
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 2 of 2');
  assert.match(supermarketChart.innerHTML, /data-bar-supermarkets="\[&quot;Unknown&quot;\]"/);
  const otherSupermarkets = {
    dataset: { barSupermarkets: JSON.stringify(['Unknown']) },
    setAttribute(name, value) { this[name] = value; }
  };
  supermarketChart.querySelectorAll = () => [otherSupermarkets];
  supermarketChart.listeners.click({ target: { closest: () => otherSupermarkets } });
  assert.equal(otherSupermarkets['aria-pressed'], 'true');
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 1');
  assert.doesNotMatch(elements.get('receipt-top-items').innerHTML, /Item 10/);
  assert.match(elements.get('receipt-top-items').innerHTML, /Unknown A/);
  assert.match(elements.get('receipt-top-items').innerHTML, /Unknown B/);
  assert.doesNotMatch(elements.get('receipt-top-items').innerHTML, /Item 9/);
  supermarketChart.listeners.click({ target: { closest: () => otherSupermarkets } });
  assert.equal(otherSupermarkets['aria-pressed'], 'false');
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 2');
  supermarketChart.listeners.click({ target: { closest: () => otherSupermarkets } });
  categoryButton.listeners.click();
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 2');
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 1 of 1');
  supermarketButton.listeners.click();
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 2 of 2');
  supermarketChart.listeners.click({ target: { closest: () => otherSupermarkets } });
  elements.get('receipt-item-search').value = 'Item 0';
  elements.get('receipt-item-search').listeners.input();
  assert.match(elements.get('receipt-top-items').innerHTML, /Item 0/);

  vm.runInContext(`
    receiptAnalytics.category = '';
    receiptAnalytics.supermarket = '';
    receiptAnalytics.itemSearch = '';
    receiptAnalytics.items = Array.from({length: 25}, (_, i) => ({id:String(i), name:'Item ' + i, category:'Food'}));
    receiptAnalytics.mappingPage = 1;
    renderReceiptAnalytics();
  `, context);
  assert.equal(elements.get('receipt-page-label').textContent, 'Page 2 of 2');
  elements.get('receipt-year-filter').value = '2023';
  elements.get('receipt-year-filter').listeners.change();
  assert.equal(elements.get('receipt-page-label').textContent, 'Page 2 of 2');
  elements.get('receipt-summary').listeners.click({
    target: { closest: () => ({ dataset: { receiptMonth: '03' } }) }
  });
  assert.equal(elements.get('receipt-page-label').textContent, 'Page 2 of 2');
});

test('mapping totals and supermarket filtering ignore year and month but retain other filters', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    receiptAnalytics.year = '2024';
    receiptAnalytics.month = '01';
    receiptAnalytics.items = [
      {id:'1',name:'Milk',category:'Dairy'},
      {id:'2',name:'Bread',category:'Bakery'}
    ];
    receiptAnalytics.rows = [
      {date:'2023-01-01',item_id:'1',item:'Milk',category:'Dairy',supermarket:'Netto',amount:'1',price:10},
      {date:'2024-01-01',item_id:'1',item:'Milk',category:'Dairy',supermarket:'Netto',amount:'1',price:20},
      {date:'2023-02-01',item_id:'1',item:'Milk',category:'Dairy',supermarket:'Netto',amount:'1',price:50},
      {date:'2023-01-01',item_id:'2',item:'Bread',category:'Bakery',supermarket:'Other',amount:'1',price:5}
    ];
    receiptAnalytics.supermarket = 'Netto';
    renderAllReceiptItems();
  `, context);
  let html = elements.get('receipt-all-items').innerHTML;
  const money = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' });
  assert.match(html, /data-label="Purchases">3</);
  assert.ok(html.includes(`<td data-label="Total spend">${money.format(80)}</td>`));
  assert.doesNotMatch(html, /Bread/);
  vm.runInContext("receiptAnalytics.year = '2023'; renderAllReceiptItems()", context);
  assert.equal(elements.get('receipt-all-items').innerHTML, html);
  vm.runInContext("receiptAnalytics.month = '02'; renderAllReceiptItems()", context);
  assert.equal(elements.get('receipt-all-items').innerHTML, html);
  vm.runInContext("receiptAnalytics.itemSearch = 'bread'; renderAllReceiptItems()", context);
  assert.match(elements.get('receipt-all-items').innerHTML, /No items match/);
  vm.runInContext("receiptAnalytics.supermarket = ''; renderAllReceiptItems()", context);
  html = elements.get('receipt-all-items').innerHTML;
  assert.match(html, /Bread/);
  assert.match(html, /data-label="Purchases">1</);
});

test('calendar groups shopping days and reveals only selected matching receipts', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    receiptAnalytics.year = '2024';
    receiptAnalytics.month = '02';
    receiptAnalytics.rows = [
      { date:'2024-02-29', item:'Milk', item_id:'1', amount:'1', price:20.75, discount:2.25, discount_plus:1, supermarket:'A <shop>' },
      { date:'2024-02-29', item:'Eggs', item_id:'2', amount:'1', price:10, discount:1, supermarket:'B' },
      { date:'2024-02-01', item:'Small', item_id:'4', amount:'1', price:6, supermarket:'B' },
      { date:'2024-02-02', item:'Free', item_id:'5', amount:'1', price:0, supermarket:'B' },
      { date:'2024-03-01', item:'Other', item_id:'3', amount:'1', price:100 }
    ];
    renderReceiptCalendar(filteredReceiptRows());
  `, context);
  const calendar = elements.get('receipt-calendar').innerHTML;
  assert.equal((calendar.match(/class="receipt-calendar-day/g) || []).length, 29);
  assert.equal((calendar.match(/data-receipt-date=/g) || []).length, 3);
  assert.match(calendar, /data-receipt-date="2024-02-29"/);
  assert.match(calendar, /receipt-calendar-heat-5" data-receipt-date="2024-02-29"/);
  assert.match(calendar, /receipt-calendar-heat-1" data-receipt-date="2024-02-01"/);
  assert.match(calendar, /receipt-calendar-heat-1" data-receipt-date="2024-02-02"/);
  assert.match(calendar, /A &lt;shop&gt;, B/);
  const money = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' });
  const chartMoney = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
  assert.ok(calendar.includes(`${chartMoney.format(30.75)} spent`));
  assert.ok(calendar.includes(`${chartMoney.format(4.25)} saved`));
  assert.equal(elements.get('receipt-date-card').hidden, true);
  vm.runInContext("receiptAnalytics.selectedDate = '2024-02-29'; renderSpendingDetails()", context);
  assert.equal(elements.get('receipt-date-card').hidden, false);
  assert.equal(elements.get('receipt-date-total').textContent, money.format(30.75));
  vm.runInContext("receiptAnalytics.selectedDate = null; renderReceiptCalendar(receiptAnalytics.rows.filter(row => row.date === '2024-02-02'))", context);
  assert.match(elements.get('receipt-calendar').innerHTML, /receipt-calendar-heat-1" data-receipt-date="2024-02-02"/);
  vm.runInContext("receiptAnalytics.supermarket = 'missing'; renderReceiptCalendar(filteredReceiptRows())", context);
  assert.equal(elements.get('receipt-date-card').hidden, true);
});

test('top items paginate all results', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    const rows = Array.from({length: 25}, (_, i) => ({item_id: String(i), item:'Item ' + i, amount:'1', price:25 - i, category:'Food'}));
    renderTopReceiptItems(rows);
  `, context);
  assert.equal((elements.get('receipt-top-items').innerHTML.match(/class="receipt-top-row"/g) || []).length, 10);
  assert.equal(elements.get('receipt-top-label').textContent, 'Page 1 of 3');
  assert.match(elements.get('receipt-top-items').innerHTML, /--receipt-item-bar: 100%/);
  vm.runInContext('receiptAnalytics.topPage = 2; renderTopReceiptItems(rows)', context);
  assert.equal((elements.get('receipt-top-items').innerHTML.match(/class="receipt-top-row"/g) || []).length, 5);
  assert.match(elements.get('receipt-top-items').innerHTML, /Item 24/);
  assert.match(elements.get('receipt-top-items').innerHTML, /--receipt-item-bar: 4%/);
  vm.runInContext("renderTopReceiptItems([{item_id:'0',item:'Free',amount:'1',price:0,category:'Food'}])", context);
  assert.match(elements.get('receipt-top-items').innerHTML, /--receipt-item-bar: 0%/);
});

test('bar charts paginate all categories and supermarkets with a consistent scale', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    const rows = Array.from({length: 12}, (_, i) => ({
      category: 'Category ' + i, supermarket: 'Shop ' + i, price: 12 - i, discount: 12 - i
    }));
    renderReceiptCategories(rows);
    renderReceiptSupermarkets(rows);
  `, context);
  const chart = elements.get('receipt-category-summary').innerHTML;
  const supermarkets = elements.get('receipt-supermarket-summary').innerHTML;
  const money = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
  assert.equal((chart.match(/class="receipt-bar"/g) || []).length, 10);
  assert.equal((supermarkets.match(/class="receipt-bar"/g) || []).length, 10);
  assert.ok(chart.includes(`<span class="receipt-bar-label">Category 0</span><span class="receipt-bar-amount">${money.format(12)}</span>`));
  assert.match(chart, /class="receipt-bar-fill" style="width: 100%"/);
  assert.ok(chart.indexOf('Category 0:') < chart.indexOf('Category 9:'));
  assert.doesNotMatch(chart, /Category 10:|Category 11:/);
  assert.doesNotMatch(chart, /Other:/);
  vm.runInContext(`
    receiptAnalytics.breakdownPages.category = 1;
    receiptAnalytics.breakdownPages.supermarket = 1;
    renderReceiptCategories(rows);
    renderReceiptSupermarkets(rows);
  `, context);
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 2 of 2');
  assert.equal((elements.get('receipt-category-summary').innerHTML.match(/class="receipt-bar"/g) || []).length, 2);
  assert.ok(elements.get('receipt-category-summary').innerHTML.includes(`Category 10: ${money.format(2)}`));
  assert.match(elements.get('receipt-category-summary').innerHTML, /width: 16\.666666666666664%/);
  assert.ok(elements.get('receipt-supermarket-summary').innerHTML.includes(`Shop 11: ${money.format(1)}; discounts: ${money.format(1)}`));

  vm.runInContext("renderReceiptCategories([{category:'Food',price:98},{category:'Small',price:2}])", context);
  assert.equal(elements.get('receipt-breakdown-label').textContent, 'Page 1 of 1');
  const smallChart = elements.get('receipt-category-summary').innerHTML;
  assert.match(smallChart, /Small:/);
  assert.doesNotMatch(smallChart, /Other:/);
  vm.runInContext("renderReceiptCategories([{category:'Other',price:100}, ...rows])", context);
  const otherChart = elements.get('receipt-category-summary').innerHTML;
  assert.ok(otherChart.includes(`Other: ${money.format(100)}`));
  vm.runInContext("renderReceiptCategories([{category:'Food',price:10},{category:'Refund',price:-1}])", context);
  assert.match(elements.get('receipt-category-summary').innerHTML, /No positive category totals/);
});

test('mappings allow manual edits without local category recommendations', async () => {
  const elements = new Map();
  const calls = [];
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
        calls.push(['from', table]);
        const query = {
          update(values) { calls.push(['update', values.category]); return this; },
          eq(key, value) { calls.push(['eq', key, value]); return Promise.resolve({ error: null }); }
        };
        return query;
      }
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    receiptAnalytics.items = [
      {id:'1',name:'BANANER',category:null},
      {id:'2',name:'YOGHURT',category:'Dairy'}
    ];
    receiptAnalytics.rows = [{date:'2024-01-01', item_id:'1', item:'BANANER', amount:'1', price:1, category:''}];
    renderReceiptAnalytics = () => {};
    renderAllReceiptItems();
  `, context);
  assert.equal(calls.length, 0);
  assert.doesNotMatch(elements.get('receipt-all-items').innerHTML, /Suggested:|data-accept-category/);
  assert.match(elements.get('receipt-all-items').innerHTML, /list="receipt-category-suggestions"/);
  await vm.runInContext(`handleCategoryEdit({
    target: {closest: () => ({dataset: {categoryItem:'1'}, value:'Fruit', getAttribute: () => 'Category for BANANER'})}
  })`, context);
  assert.ok(calls.some((call) => call[0] === 'update' && call[1] === 'Fruit'));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === '1'));
  assert.equal(vm.runInContext("receiptAnalytics.items[0].category", context), 'Fruit');
  assert.equal(vm.runInContext("receiptAnalytics.rows[0].category", context), 'Fruit');

  vm.runInContext("receiptAnalytics.items[0].category = null; receiptAnalytics.rows[0].category = ''", context);
  vm.runInContext("receiptAnalytics.reviewOnly = true; renderAllReceiptItems()", context);
  assert.match(elements.get('receipt-all-items').innerHTML, /BANANER/);
  assert.doesNotMatch(elements.get('receipt-all-items').innerHTML, /YOGHURT/);
});

test('KPIs follow the selected month and day while averages follow the filtered year', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  assert.equal(vm.runInContext('receiptAnalytics.month', context), String(new Date().getMonth() + 1).padStart(2, '0'));
  vm.runInContext(`
    receiptAnalytics.rows = [
      { date: '2024-01-01', price: 100, discount: 10, discount_plus: 5, item_id: '0', item: 'Item 0', amount: '1', supermarket: 'Netto' },
      { date: '2024-01-02', price: 30, discount: 3, item_id: '1', item: 'Item 1', amount: '1', supermarket: 'Other' },
      { date: '2024-02-01', price: 200, discount: 20, item_id: '1', item: 'Item 1', amount: '1', supermarket: 'Other' },
      { date: '2023-01-01', price: 1000, discount: 100, item_id: '1', item: 'Item 1', amount: '1', supermarket: 'Other' }
    ];
    receiptAnalytics.items = Array.from({length: 41}, (_, i) => ({ id: String(i), name: 'Item ' + i, category: 'Food' }));
    receiptAnalytics.year = '2024';
    receiptAnalytics.month = '01';
    renderReceiptKpis();
    renderReceiptMonthlySummary(filteredReceiptRows(false));
    renderAllReceiptItems();
  `, context);
  const money = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
  let kpis = elements.get('receipt-kpis').innerHTML;
  assert.ok(kpis.includes(money.format(130)));
  assert.ok(kpis.includes(money.format(165)));
  assert.ok(kpis.includes(money.format(18)));
  assert.ok(kpis.includes(money.format(19)));
  assert.match(kpis, /2024 avg\.:/);
  assert.doesNotMatch(kpis, /monthly average|January/);
  assert.ok(elements.get('receipt-summary').innerHTML.includes(`<span class="receipt-month-value">${money.format(130)}</span>`));
  vm.runInContext("receiptAnalytics.selectedDate = '2024-01-01'; renderReceiptKpis()", context);
  kpis = elements.get('receipt-kpis').innerHTML;
  assert.ok(kpis.includes(money.format(100)));
  assert.ok(kpis.includes(money.format(15)));
  assert.ok(kpis.includes(money.format(165)));
  vm.runInContext("receiptAnalytics.selectedDate = null; receiptAnalytics.month = '02'; renderReceiptKpis()", context);
  assert.ok(elements.get('receipt-kpis').innerHTML.includes(money.format(200)));
  vm.runInContext("receiptAnalytics.month = '01'; receiptAnalytics.supermarket = 'Netto'; renderReceiptKpis()", context);
  kpis = elements.get('receipt-kpis').innerHTML;
  assert.equal((kpis.match(new RegExp(money.format(100), 'g')) || []).length, 2);
  vm.runInContext("receiptAnalytics.selectedDate = '2024-01-02'; renderReceiptAnalytics()", context);
  assert.equal(vm.runInContext('receiptAnalytics.selectedDate', context), null);
  assert.ok(elements.get('receipt-kpis').innerHTML.includes('Jan 2024'));
  vm.runInContext("receiptAnalytics.supermarket = ''; renderAllReceiptItems()", context);
  assert.equal((elements.get('receipt-all-items').innerHTML.match(/<tr>/g) || []).length, 20);
  assert.equal(elements.get('receipt-page-label').textContent, 'Page 1 of 3');
  vm.runInContext('receiptAnalytics.mappingPage = 2; renderAllReceiptItems()', context);
  assert.equal((elements.get('receipt-all-items').innerHTML.match(/<tr>/g) || []).length, 1);
  vm.runInContext("receiptAnalytics.supermarket = 'Netto'; renderAllReceiptItems()", context);
  assert.equal(elements.get('receipt-page-label').textContent, 'Page 1 of 1');
  assert.match(elements.get('receipt-all-items').innerHTML, /Item 0/);
});

test('KPIs and charts round values without rounding receipt details', () => {
  const elements = new Map();
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, { classList: { toggle() {} } });
        return elements.get(id);
      },
      querySelectorAll: () => []
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'receipt-analytics.js'), 'utf8');
  vm.runInContext(source.replace('initReceiptAnalytics();', ''), context);
  vm.runInContext(`
    receiptAnalytics.year = '2024';
    receiptAnalytics.month = '02';
    receiptAnalytics.selectedDate = '2024-02-01';
    receiptAnalytics.rows = [{date:'2024-02-01', item_id:'1', item:'Milk', category:'Dairy',
      amount:'1', price:10.75, price_per_unit:10.75, discount:1.25, supermarket:'Shop'}];
    renderReceiptKpis();
    renderReceiptMonthlySummary(filteredReceiptRows(false));
    renderReceiptCategories(filteredReceiptRows(false));
    renderTopReceiptItems(filteredReceiptRows(false));
    renderSpendingDetails();
  `, context);
  const chartMoney = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
  const exactMoney = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' });
  for (const id of ['receipt-kpis', 'receipt-summary', 'receipt-category-summary', 'receipt-top-items']) {
    assert.ok(elements.get(id).innerHTML.includes(chartMoney.format(10.75)));
    assert.ok(!elements.get(id).innerHTML.includes(exactMoney.format(10.75)));
  }
  assert.equal(elements.get('receipt-date-total').textContent, exactMoney.format(10.75));
  const trend = vm.runInContext("renderPriceTrendChart([{date:'2024-02-01', price_per_unit:10.75}])", context);
  assert.ok(trend.includes(chartMoney.format(10.75)));
  assert.ok(!trend.includes(exactMoney.format(10.75)));
});

test('clear checks updates all persisted checked rows, including hidden items', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');
  const clearFunction = source.match(/async function clearShoppingChecks\(\) \{[\s\S]*?\n\}/)[0];
  const calls = [];
  const context = vm.createContext({
    state: { shoppingChecks: { visible: true, hidden: true } },
    supabaseClient: {
      from(table) {
        calls.push(table);
        return {
          update(values) {
            calls.push(values.checked);
            return { eq: async (column, value) => { calls.push(column, value); return { error: null }; } };
          }
        };
      }
    },
    renderShoppingList() { calls.push('render'); }
  });
  await vm.runInContext(`${clearFunction}; clearShoppingChecks()`, context);
  assert.deepEqual(calls, ['shopping_checks', false, 'checked', true, 'render']);
  assert.deepEqual(context.state.shoppingChecks, { visible: false, hidden: false });
});

test('ingredient and dish pages retain ordering without displaying historical ranks', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');
  const extract = (name) => source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))[0];
  const makeTable = () => ({
    rows: [],
    set innerHTML(value) { this.rows = []; this.html = value; },
    appendChild(row) { this.rows.push(row); },
    querySelectorAll() { return []; }
  });
  const ingredients = makeTable();
  const dishes = makeTable();
  const context = vm.createContext({
    document: { createElement: () => ({}) },
    state: {
      ingredients: Array.from({ length: 21 }, (_, i) => ({ id: i, name: `Ingredient ${i}`, category: 'Other', unit: 'unit', price: 1 })),
      dishes: Array.from({ length: 21 }, (_, i) => ({ id: i, name: `Dish ${i}`, ingredients: [], historical_times: 21 - i }))
    },
    ingredientTableBody: ingredients,
    dishTableBody: dishes,
    ingredientSearchInput: { value: '' },
    dishSearchInput: { value: '' },
    ingredientPagePrev: {}, ingredientPageNext: {}, ingredientPageLabel: {},
    dishPagePrev: {}, dishPageNext: {}, dishPageLabel: {},
    escapeHtml: String,
    renderActionIcon: () => '',
    renderCategoryBadge: String,
    isLeftoversDish: () => false,
    formatDishCost: () => '0',
    calculateDishCost: () => 0
  });
  vm.runInContext(`
    const collectionPages = { ingredients: 0, dishes: 0 };
    const collectionPageSize = 10;
    ${extract('updateCollectionPagination')}
    ${extract('renderIngredients')}
    ${extract('renderDishes')}
    renderIngredients();
    renderDishes();
  `, context);
  assert.equal(ingredients.rows.length, 10);
  assert.equal(dishes.rows.length, 10);
  vm.runInContext('collectionPages.ingredients = 2; collectionPages.dishes = 1; renderIngredients(); renderDishes()', context);
  assert.equal(ingredients.rows.length, 1);
  assert.match(dishes.rows[0].innerHTML, /Dish 10/);
  assert.doesNotMatch(dishes.rows[0].innerHTML, /dish-rank|Historical rank|plans/);
  assert.match(dishes.rows[0].innerHTML, /class="collection-action-cell"/);
  assert.match(ingredients.rows[0].innerHTML, /class="collection-action-cell"/);
  vm.runInContext("ingredientSearchInput.value = 'Ingredient 20'; renderIngredients()", context);
  assert.equal(context.ingredientPageLabel.textContent, 'Page 1 of 1');
});

test('planner meal search filters and selects meals', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');
  const pickerFunction = source.match(/function enhancePlannerMealPicker\([^)]*\) \{[\s\S]*?\n\}/)[0];
  const input = {
    value: '',
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; }
  };
  const results = {
    hidden: true,
    innerHTML: '',
    listeners: {},
    classList: { add() {}, toggle() {} },
    addEventListener(type, handler) { this.listeners[type] = handler; }
  };
  const select = {
    options: [
      { value: '', textContent: '' },
      { value: 'pasta', textContent: 'Tomato pasta' },
      { value: 'soup', textContent: 'Lentil soup' }
    ],
    classList: { add() {} },
    setAttribute() {},
    dispatchEvent(event) { this.event = event.type; }
  };
  const picker = {
    querySelector(selector) { return selector === 'input' ? input : results; },
    appendChild() {}
  };
  const controls = { querySelector: () => select, appendChild() {} };
  const context = vm.createContext({
    document: { createElement: () => picker },
    Event: class { constructor(type) { this.type = type; } },
    escapeHtml: String
  });
  vm.runInContext(`${pickerFunction}; enhancePlannerMealPicker`, context)(controls);
  input.value = 'PASTA';
  input.listeners.input();
  assert.equal(results.hidden, false);
  assert.match(results.innerHTML, /Tomato pasta/);
  assert.doesNotMatch(results.innerHTML, /Lentil soup/);
  results.listeners.click({ target: { closest: () => ({ dataset: { mealId: 'pasta' } }) } });
  assert.equal(select.value, 'pasta');
  assert.equal(select.event, 'change');
  assert.equal(input.value, '');
  assert.equal(results.hidden, true);
  input.value = 'missing';
  input.listeners.input();
  assert.match(results.innerHTML, /No matching meals/);
  input.listeners.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(results.hidden, true);
});
