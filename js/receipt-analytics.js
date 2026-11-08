const receiptStatus = document.getElementById('receipt-status');
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
const receiptRenameFrom = document.getElementById('receipt-rename-from');
const receiptRenameTo = document.getElementById('receipt-rename-to');
const receiptRenameButton = document.getElementById('receipt-rename-button');
const receiptCategorySuggestions = document.getElementById('receipt-category-suggestions');
const receiptUncategorizedAlert = document.getElementById('receipt-uncategorized-alert');

const receiptAnalytics = {
  rows: [],
  items: [],
  selectedDate: null,
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
  receiptRenameButton.addEventListener('click', renameReceiptCategory);
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
    receiptCategoryFilter.disabled = true;
    receiptItemSearch.disabled = true;
    receiptRenameFrom.disabled = true;
    receiptRenameTo.disabled = true;
    receiptRenameButton.disabled = true;
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
        .select('id,purchase_date,item_id,amount,price,transaction_id,discount,discount_plus')
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
        price: Number(fact.price)
      };
    });
    receiptCategoryFilter.disabled = false;
    receiptItemSearch.disabled = false;
    receiptRenameFrom.disabled = false;
    receiptRenameTo.disabled = false;
    receiptRenameButton.disabled = false;
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
    const matchesCategory = !receiptAnalytics.category || category === receiptAnalytics.category;
    const matchesSearch = !receiptAnalytics.itemSearch
      || `${row.item} ${category}`.toLocaleLowerCase().includes(receiptAnalytics.itemSearch);
    return matchesCategory && matchesSearch;
  });
}

function categoryNames() {
  return [...new Set(receiptAnalytics.items.map((item) => normalizeCategory(item.category)))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeCategory(category) {
  return String(category || '').trim() || 'Uncategorized';
}

function renderReceiptAnalytics() {
  const categories = categoryNames();
  if (receiptAnalytics.category && !categories.includes(receiptAnalytics.category)) {
    receiptAnalytics.category = '';
  }
  receiptCategoryFilter.innerHTML = [
    '<option value="">All categories</option>',
    ...categories.map((category) => `<option value="${escapeReceiptHtml(category)}">${escapeReceiptHtml(category)}</option>`)
  ].join('');
  receiptCategoryFilter.value = receiptAnalytics.category;
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
        <td data-label="Price">${formatReceiptMoney(Number(row.price))}</td>
        <td data-label="Rabat">${row.discount == null ? '—' : formatReceiptMoney(Number(row.discount))}</td>
        <td data-label="Netto Plus rabat">${row.discount_plus == null ? '—' : formatReceiptMoney(Number(row.discount_plus))}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="receipt-empty">No items for this date and category.</td></tr>';
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

  const categoriesList = categoryNames();
  receiptRenameFrom.innerHTML = [
    '<option value="">Choose category</option>',
    ...categoriesList.filter((category) => category !== 'Uncategorized')
      .map((category) => `<option value="${escapeReceiptHtml(category)}">${escapeReceiptHtml(category)}</option>`)
  ].join('');
  receiptCategorySuggestions.innerHTML = categoriesList
    .filter((category) => category !== 'Uncategorized')
    .map((category) => `<option value="${escapeReceiptHtml(category)}"></option>`).join('');
}

function renderAllReceiptItems() {
  const aggregates = new Map(aggregateReceiptItems(receiptAnalytics.rows)
    .map((item) => [item.itemId, item]));
  const items = receiptAnalytics.items.filter((item) => {
    const category = normalizeCategory(item.category);
    const matchesCategory = !receiptAnalytics.category || category === receiptAnalytics.category;
    const matchesSearch = !receiptAnalytics.itemSearch
      || `${item.name} ${category}`.toLocaleLowerCase().includes(receiptAnalytics.itemSearch);
    return matchesCategory && matchesSearch;
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
            <input type="text" list="receipt-category-suggestions" value="${category === 'Uncategorized' ? '' : escapeReceiptHtml(category)}" placeholder="Uncategorized" data-category-item="${escapeReceiptHtml(item.id)}" aria-label="Category for ${escapeReceiptHtml(item.name)}" />
          </td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="4" class="receipt-empty">No items match these filters.</td></tr>';
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

async function renameReceiptCategory() {
  const oldCategory = receiptRenameFrom.value;
  const newCategory = receiptRenameTo.value.trim();
  if (!oldCategory || !newCategory) {
    setReceiptStatus('Choose an existing category and enter its new name.', true);
    return;
  }
  if (oldCategory === newCategory) {
    setReceiptStatus('The new category name must be different.', true);
    return;
  }
  try {
    const { error } = await supabaseClient
      .from('receipt_item_dimension')
      .update({ category: newCategory })
      .eq('category', oldCategory);
    if (error) {
      throw error;
    }
    receiptAnalytics.rows.forEach((row) => {
      if (row.category === oldCategory) {
        row.category = newCategory;
      }
    });
    receiptAnalytics.items.forEach((item) => {
      if (item.category === oldCategory) {
        item.category = newCategory;
      }
    });
    receiptAnalytics.category = '';
    receiptRenameTo.value = '';
    setReceiptStatus(`Renamed "${oldCategory}" to "${newCategory}" across matching items.`);
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
