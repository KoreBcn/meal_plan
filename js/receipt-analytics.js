const receiptStatus = document.getElementById('receipt-status');
const receiptYearFilter = document.getElementById('receipt-year-filter');
const receiptCategoryFilter = document.getElementById('receipt-category-filter');
const receiptItemSearch = document.getElementById('receipt-item-search');
const receiptTabs = [...document.querySelectorAll('[data-receipt-tab]')];
const receiptTabPanels = [...document.querySelectorAll('.receipt-tab-panel')];
const receiptSummary = document.getElementById('receipt-summary');
const receiptSpendingChart = document.getElementById('receipt-spending-chart');
const receiptDateTitle = document.getElementById('receipt-date-title');
const receiptDateTotal = document.getElementById('receipt-date-total');
const receiptDateItems = document.getElementById('receipt-date-items');
const receiptTopItems = document.getElementById('receipt-top-items');
const receiptCategorySummary = document.getElementById('receipt-category-summary');
const receiptAllItems = document.getElementById('receipt-all-items');
const receiptCategorySuggestions = document.getElementById('receipt-category-suggestions');
const receiptUncategorizedAlert = document.getElementById('receipt-uncategorized-alert');
const receiptPriceTrendDialog = document.getElementById('receipt-price-trend-dialog');
const receiptPriceTrendTitle = document.getElementById('receipt-price-trend-title');
const receiptPriceTrendChart = document.getElementById('receipt-price-trend-chart');
const receiptPriceTrendClose = document.getElementById('receipt-price-trend-close');

const receiptAnalytics = {
  rows: [],
  items: [],
  selectedDate: null,
  year: String(new Date().getFullYear()),
  category: '',
  itemSearch: '',
  userId: null,
  loadedUserId: null,
  loadingUserId: null,
  loadId: 0
};

const receiptMoney = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK'
});
const receiptNumber = new Intl.NumberFormat('da-DK', {
  maximumFractionDigits: 2
});

initReceiptAnalytics();

function initReceiptAnalytics() {
  receiptYearFilter.addEventListener('change', () => {
    receiptAnalytics.year = receiptYearFilter.value;
    renderReceiptAnalytics();
  });
  receiptCategoryFilter.addEventListener('change', () => {
    receiptAnalytics.category = receiptCategoryFilter.value;
    renderReceiptAnalytics();
  });
  receiptItemSearch.addEventListener('input', () => {
    receiptAnalytics.itemSearch = receiptItemSearch.value.trim().toLocaleLowerCase();
    renderReceiptAnalytics();
  });
  receiptTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateReceiptTab(tab.dataset.receiptTab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? receiptTabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + receiptTabs.length) % receiptTabs.length;
      receiptTabs[nextIndex].focus();
      activateReceiptTab(receiptTabs[nextIndex].dataset.receiptTab);
    });
  });
  receiptSpendingChart.addEventListener('click', (event) => {
    const button = event.target.closest('[data-receipt-date]');
    if (!button) {
      return;
    }
    receiptAnalytics.selectedDate = button.dataset.receiptDate;
    renderSpendingDetails();
    receiptSpendingChart.querySelectorAll('[data-receipt-date]').forEach((bar) => {
      bar.setAttribute('aria-pressed', String(bar === button));
    });
  });
  receiptAllItems.addEventListener('change', handleCategoryEdit);
  receiptAllItems.addEventListener('click', handlePriceTrendClick);
  receiptPriceTrendClose.addEventListener('click', () => receiptPriceTrendDialog.close());
  receiptPriceTrendDialog.addEventListener('click', (event) => {
    if (event.target === receiptPriceTrendDialog) {
      receiptPriceTrendDialog.close();
    }
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => handleReceiptSession(session), 0);
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      throw error;
    }
    return handleReceiptSession(data.session);
  }).catch((error) => {
    setReceiptStatus(`Could not check Supabase sign-in: ${error.message || String(error)}`, true);
  });
}

async function handleReceiptSession(session) {
  const userId = session?.user?.id || null;
  if (!userId) {
    receiptAnalytics.loadId += 1;
    receiptAnalytics.userId = null;
    receiptAnalytics.loadedUserId = null;
    receiptAnalytics.loadingUserId = null;
    receiptAnalytics.rows = [];
    receiptAnalytics.items = [];
    receiptYearFilter.disabled = true;
    receiptCategoryFilter.disabled = true;
    receiptItemSearch.disabled = true;
    receiptUncategorizedAlert.hidden = true;
    renderReceiptAnalytics();
    setReceiptStatus('Sign in to view receipt analytics.');
    return;
  }
  if (receiptAnalytics.loadedUserId === userId
    || receiptAnalytics.loadingUserId === userId) {
    return;
  }
  receiptAnalytics.userId = userId;
  receiptAnalytics.rows = [];
  const loadId = ++receiptAnalytics.loadId;
  receiptAnalytics.loadingUserId = userId;
  const loaded = await loadReceiptData(loadId);
  if (loadId === receiptAnalytics.loadId) {
    receiptAnalytics.loadingUserId = null;
    if (loaded) {
      receiptAnalytics.loadedUserId = userId;
    }
  }
}

async function loadReceiptData(loadId) {
  try {
    const [itemsResult, factsResult] = await Promise.all([
      loadAllReceiptRows(() => supabaseClient
        .from('receipt_item_dimension')
        .select('id,name,normalized_name,category')
        .order('name')),
      loadAllReceiptRows(() => supabaseClient
        .from('receipt_item_facts')
        .select('id,purchase_date,item_id,amount,price,price_per_unit,owner,transaction_id,discount,discount_plus')
        .order('purchase_date'))
    ]);
    if (loadId !== receiptAnalytics.loadId) {
      return;
    }
    receiptAnalytics.items = itemsResult;
    const itemsById = new Map(itemsResult.map((item) => [item.id, item]));
    receiptAnalytics.rows = factsResult.map((fact) => {
      const item = itemsById.get(fact.item_id);
      if (!item) {
        throw new Error(`Receipt fact ${fact.id} references an unknown item.`);
      }
      return {
        ...fact,
        date: fact.purchase_date,
        item: item.name,
        item_id: item.id,
        normalized_name: item.normalized_name,
        category: item.category || '',
        price: Number(fact.price),
        price_per_unit: fact.price_per_unit == null ? null : Number(fact.price_per_unit)
      };
    });
    updateReceiptYearOptions();
    updateReceiptCategoryOptions();
    receiptCategoryFilter.disabled = false;
    receiptItemSearch.disabled = false;
    const uncategorizedCount = itemsResult.filter((item) => !item.category).length;
    receiptUncategorizedAlert.hidden = uncategorizedCount === 0;
    receiptUncategorizedAlert.textContent = uncategorizedCount
      ? `${uncategorizedCount.toLocaleString()} items need a category. Assign them in the All items tab.`
      : '';
    setReceiptStatus(`Loaded ${receiptAnalytics.rows.length.toLocaleString()} receipt line items from Supabase.`);
    renderReceiptAnalytics();
    return true;
  } catch (error) {
    if (loadId === receiptAnalytics.loadId) {
      setReceiptStatus(`Could not load receipt analytics from Supabase: ${error.message || String(error)}`, true);
    }
    return false;
  }
}

async function loadAllReceiptRows(queryFactory) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1);
    if (error) {
      throw error;
    }
    rows.push(...data);
    if (data.length < pageSize) {
      return rows;
    }
  }
}

function activateReceiptTab(name) {
  receiptTabs.forEach((tab) => {
    const active = tab.dataset.receiptTab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  receiptTabPanels.forEach((panel) => {
    const active = panel.id === `receipt-panel-${name}`;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

function filteredReceiptRows() {
  return receiptAnalytics.rows.filter((row) => {
    const category = normalizeCategory(row.category);
    return row.date.slice(0, 4) === receiptAnalytics.year
      && (!receiptAnalytics.category || category === receiptAnalytics.category)
      && (!receiptAnalytics.itemSearch || row.item.toLocaleLowerCase().includes(receiptAnalytics.itemSearch));
  });
}

function updateReceiptYearOptions() {
  const years = new Set(receiptAnalytics.rows.map((row) => row.date.slice(0, 4)));
  years.add(String(new Date().getFullYear()));
  const orderedYears = [...years].sort((left, right) => right.localeCompare(left));
  receiptYearFilter.innerHTML = orderedYears
    .map((year) => `<option value="${year}">${year}</option>`)
    .join('');
  receiptYearFilter.value = receiptAnalytics.year;
  receiptYearFilter.disabled = false;
}

function updateReceiptCategoryOptions() {
  const categories = categoryNames();
  if (receiptAnalytics.category && !categories.includes(receiptAnalytics.category)) {
    receiptAnalytics.category = '';
  }
  receiptCategoryFilter.innerHTML = [
    '<option value="">All categories</option>',
    ...categories.map((category) => `<option value="${escapeReceiptHtml(category)}">${escapeReceiptHtml(category)}</option>`)
  ].join('');
  receiptCategoryFilter.value = receiptAnalytics.category;
}

function categoryNames() {
  return [...new Set(receiptAnalytics.items.map((item) => normalizeCategory(item.category)))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeCategory(category) {
  return String(category || '').trim() || 'Uncategorized';
}

function renderReceiptAnalytics() {
  updateReceiptCategoryOptions();
  const rows = filteredReceiptRows();
  const totalSpend = rows.reduce((sum, row) => sum + Number(row.price), 0);
  const dates = new Set(rows.map((row) => row.date)).size;
  receiptSummary.innerHTML = `
    <article class="receipt-stat"><span>Total spend</span><strong>${formatReceiptMoney(totalSpend)}</strong></article>
    <article class="receipt-stat"><span>Shopping dates</span><strong>${dates.toLocaleString()}</strong></article>
  `;
  renderReceiptSpending(rows);
  renderTopReceiptItems(rows);
  renderReceiptCategories(rows);
  renderAllReceiptItems();
}

function renderReceiptSpending(rows) {
  const byDate = new Map();
  rows.forEach((row) => byDate.set(row.date, (byDate.get(row.date) || 0) + Number(row.price)));
  const totals = [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (!totals.length) {
    receiptSpendingChart.innerHTML = '<p class="receipt-empty">No receipt line items are available in Supabase.</p>';
    receiptAnalytics.selectedDate = null;
    renderSpendingDetails();
    return;
  }
  const maximum = Math.max(...totals.map(([, total]) => total), 1);
  if (!totals.some(([date]) => date === receiptAnalytics.selectedDate)) {
    receiptAnalytics.selectedDate = totals[totals.length - 1][0];
  }
  receiptSpendingChart.innerHTML = totals.map(([date, total]) => {
    const height = Math.max(3, Math.round((total / maximum) * 100));
    const active = date === receiptAnalytics.selectedDate;
    return `
      <button type="button" class="receipt-bar-column" data-receipt-date="${date}" aria-pressed="${active}" aria-label="${formatReceiptDate(date)}: ${formatReceiptMoney(total)}">
        <span class="receipt-bar-value">${formatReceiptMoney(total)}</span>
        <span class="receipt-bar-track"><span class="receipt-bar-fill" style="height:${height}%"></span></span>
        <span class="receipt-bar-date">${escapeReceiptHtml(formatReceiptDate(date))}</span>
      </button>
    `;
  }).join('');
  renderSpendingDetails();
}

function renderSpendingDetails() {
  const date = receiptAnalytics.selectedDate;
  const rows = filteredReceiptRows().filter((row) => row.date === date);
  receiptDateTitle.textContent = date ? formatReceiptDate(date) : 'Choose a date';
  receiptDateTotal.textContent = formatReceiptMoney(rows.reduce((sum, row) => sum + Number(row.price), 0));
  receiptDateItems.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td data-label="Item">${escapeReceiptHtml(row.item)}</td>
        <td data-label="Category">${escapeReceiptHtml(row.category || 'Uncategorized')}</td>
        <td data-label="Amount">${escapeReceiptHtml(row.amount)}</td>
        <td data-label="Total price">${formatReceiptMoney(Number(row.price))}</td>
        <td data-label="Price per unit">${row.price_per_unit == null ? '—' : formatReceiptMoney(row.price_per_unit)}</td>
        <td data-label="Owner">${escapeReceiptHtml(row.owner || '')}</td>
        <td data-label="Rabat">${row.discount == null ? '—' : formatReceiptMoney(Number(row.discount))}</td>
        <td data-label="Netto Plus rabat">${row.discount_plus == null ? '—' : formatReceiptMoney(Number(row.discount_plus))}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" class="receipt-empty">No items for this date and year.</td></tr>';
}

function aggregateReceiptItems(rows) {
  const items = new Map();
  rows.forEach((row) => {
    const key = row.item_id;
    if (!items.has(key)) {
      items.set(key, {
        name: row.item.trim(),
        purchases: 0,
        spend: 0,
        amounts: new Map(),
        category: normalizeCategory(row.category),
        itemId: row.item_id
      });
    }
    const item = items.get(key);
    item.purchases += 1;
    item.spend += Number(row.price);
    const match = row.amount.match(/^\s*(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (match) {
      const amount = Number(match[1].replace(',', '.'));
      const unit = match[2].trim();
      item.amounts.set(unit, (item.amounts.get(unit) || 0) + amount);
    } else {
      item.amounts.set(row.amount, (item.amounts.get(row.amount) || 0) + 1);
    }
  });
  return [...items.values()].sort((left, right) =>
    right.spend - left.spend || right.purchases - left.purchases || left.name.localeCompare(right.name)
  );
}

function renderTopReceiptItems(rows) {
  const items = aggregateReceiptItems(rows).slice(0, 20);
  receiptTopItems.innerHTML = items.length
    ? items.map((item) => `
      <tr>
        <td data-label="Item">${escapeReceiptHtml(item.name)}</td>
        <td data-label="Amount bought">${[...item.amounts.entries()].map(([unit, amount]) => `${receiptNumber.format(amount)}${unit ? ` ${escapeReceiptHtml(unit)}` : ''}`).join(' + ')}</td>
        <td data-label="Purchases">${item.purchases}</td>
        <td data-label="Total spend">${formatReceiptMoney(item.spend)}</td>
        <td data-label="Category">${escapeReceiptHtml(item.category)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" class="receipt-empty">No items match this category.</td></tr>';
}

function renderReceiptCategories(rows) {
  const categories = new Map();
  rows.forEach((row) => {
    const category = normalizeCategory(row.category);
    if (!categories.has(category)) {
      categories.set(category, { spend: 0, purchases: 0 });
    }
    const summary = categories.get(category);
    summary.spend += Number(row.price);
    summary.purchases += 1;
  });
  const sortedCategories = [...categories.entries()].sort((left, right) => right[1].spend - left[1].spend);
  const maximum = Math.max(...sortedCategories.map(([, summary]) => summary.spend), 1);
  receiptCategorySummary.innerHTML = sortedCategories.length
    ? sortedCategories.map(([category, summary]) => `
      <article class="receipt-category-row">
        <div><strong>${escapeReceiptHtml(category)}</strong><span>${summary.purchases.toLocaleString()} items</span></div>
        <span class="receipt-category-meter"><span style="width:${Math.round(summary.spend / maximum * 100)}%"></span></span>
        <strong>${formatReceiptMoney(summary.spend)}</strong>
      </article>
    `).join('')
    : '<p class="receipt-empty">No category totals available.</p>';

  receiptCategorySuggestions.innerHTML = categoryNames()
    .filter((category) => category !== 'Uncategorized')
    .map((category) => `<option value="${escapeReceiptHtml(category)}"></option>`).join('');
}

function renderAllReceiptItems() {
  const aggregates = new Map(aggregateReceiptItems(filteredReceiptRows())
    .map((item) => [item.itemId, item]));
  const items = receiptAnalytics.items.filter((item) => {
    const category = normalizeCategory(item.category);
    return (!receiptAnalytics.category || category === receiptAnalytics.category)
      && (!receiptAnalytics.itemSearch || item.name.toLocaleLowerCase().includes(receiptAnalytics.itemSearch));
  }).sort((left, right) => {
    const leftSpend = aggregates.get(left.id)?.spend || 0;
    const rightSpend = aggregates.get(right.id)?.spend || 0;
    return rightSpend - leftSpend || left.name.localeCompare(right.name);
  });
  receiptAllItems.innerHTML = items.length
    ? items.map((item) => {
      const aggregate = aggregates.get(item.id);
      const category = normalizeCategory(item.category);
      return `
        <tr>
          <td data-label="Item">${escapeReceiptHtml(item.name)}${category === 'Uncategorized' ? '<span class="receipt-uncategorized-badge">Needs category</span>' : ''}</td>
          <td data-label="Purchases">${aggregate?.purchases || 0}</td>
          <td data-label="Total spend">${formatReceiptMoney(aggregate?.spend || 0)}</td>
          <td data-label="Category">
            <div class="receipt-item-category-control">
              <input type="text" list="receipt-category-suggestions" value="${category === 'Uncategorized' ? '' : escapeReceiptHtml(category)}" placeholder="Uncategorized" data-category-item="${escapeReceiptHtml(item.id)}" aria-label="Category for ${escapeReceiptHtml(item.name)}" />
              <button type="button" class="receipt-price-trend-button" data-price-trend-item="${escapeReceiptHtml(item.id)}" aria-label="Show price per unit trend for ${escapeReceiptHtml(item.name)}" title="Show price per unit trend">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="4" class="receipt-empty">No items match these filters.</td></tr>';
}

function handlePriceTrendClick(event) {
  const button = event.target.closest('[data-price-trend-item]');
  if (!button) {
    return;
  }
  const item = receiptAnalytics.items.find((candidate) => candidate.id === button.dataset.priceTrendItem);
  if (!item) {
    setReceiptStatus('Could not find the selected receipt item.', true);
    return;
  }
  const history = receiptAnalytics.rows
    .filter((row) => row.item_id === item.id && Number.isFinite(row.price_per_unit))
    .sort((left, right) => left.date.localeCompare(right.date));
  receiptPriceTrendTitle.textContent = `${item.name} — price per unit`;
  receiptPriceTrendChart.innerHTML = renderPriceTrendChart(history);
  receiptPriceTrendDialog.showModal();
}

function renderPriceTrendChart(history) {
  if (!history.length) {
    return '<p class="receipt-empty">No price-per-unit history is available for this item.</p>';
  }
  const width = 560;
  const height = 250;
  const margin = { top: 18, right: 24, bottom: 42, left: 72 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const values = history.map((row) => Number(row.price_per_unit));
  const valueMin = Math.min(...values);
  const valueMax = Math.max(...values);
  const padding = valueMax === valueMin ? Math.max(valueMax * 0.1, 1) : (valueMax - valueMin) * 0.1;
  const min = Math.max(0, valueMin - padding);
  const max = valueMax + padding;
  const firstTime = Date.parse(`${history[0].date}T00:00:00Z`);
  const lastTime = Date.parse(`${history[history.length - 1].date}T00:00:00Z`);
  const points = history.map((row, index) => {
    const time = Date.parse(`${row.date}T00:00:00Z`);
    const xRatio = lastTime === firstTime ? index / Math.max(history.length - 1, 1) : (time - firstTime) / (lastTime - firstTime);
    return {
      x: margin.left + xRatio * chartWidth,
      y: margin.top + (max - Number(row.price_per_unit)) / (max - min || 1) * chartHeight,
      row
    };
  });
  const grid = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const y = margin.top + ratio * chartHeight;
    const value = max - ratio * (max - min);
    return `
      <line class="receipt-price-trend-gridline" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" />
      <text class="receipt-price-trend-axis-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${escapeReceiptHtml(formatReceiptMoney(value))}</text>
    `;
  }).join('');
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const markers = points.map(({ x, y, row }) => `
    <circle class="receipt-price-trend-point" cx="${x}" cy="${y}" r="4">
      <title>${escapeReceiptHtml(formatReceiptDate(row.date))}: ${escapeReceiptHtml(formatReceiptMoney(Number(row.price_per_unit)))}</title>
    </circle>
  `).join('');
  const startLabel = escapeReceiptHtml(formatReceiptDate(history[0].date));
  const endLabel = escapeReceiptHtml(formatReceiptDate(history[history.length - 1].date));
  return `
    <svg class="receipt-price-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price per unit history from ${startLabel} to ${endLabel}">
      ${grid}
      <polyline class="receipt-price-trend-line" points="${line}" />
      ${markers}
      <text class="receipt-price-trend-axis-label" x="${margin.left}" y="${height - 12}" text-anchor="start">${startLabel}</text>
      <text class="receipt-price-trend-axis-label" x="${width - margin.right}" y="${height - 12}" text-anchor="end">${endLabel}</text>
    </svg>
    <p class="receipt-price-trend-count">${history.length.toLocaleString()} purchase${history.length === 1 ? '' : 's'} in history</p>
  `;
}

async function handleCategoryEdit(event) {
  const input = event.target.closest('[data-category-item]');
  if (!input) {
    return;
  }
  const itemId = input.dataset.categoryItem;
  const category = input.value.trim() || null;
  try {
    const { error } = await supabaseClient
      .from('receipt_item_dimension')
      .update({ category })
      .eq('id', itemId);
    if (error) {
      throw error;
    }
    const item = receiptAnalytics.items.find((candidate) => candidate.id === itemId);
    if (item) {
      item.category = category;
    }
    receiptAnalytics.rows.forEach((row) => {
      if (row.item_id === itemId) {
        row.category = category || '';
      }
    });
    setReceiptStatus(`Saved category mapping for ${input.getAttribute('aria-label').replace(/^Category for /, '')}.`);
    renderReceiptAnalytics();
  } catch (error) {
    setReceiptStatus(error.message || String(error), true);
    renderReceiptAnalytics();
  }
}

function formatReceiptMoney(value) {
  return receiptMoney.format(value);
}

function formatReceiptDate(value) {
  return new Intl.DateTimeFormat('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}T00:00:00Z`));
}

function escapeReceiptHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function setReceiptStatus(message, isError = false) {
  receiptStatus.textContent = message;
  receiptStatus.classList.toggle('error', isError);
}
