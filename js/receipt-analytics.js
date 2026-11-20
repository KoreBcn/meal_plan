const receiptStatus = document.getElementById('receipt-status');
const receiptAnalyticsToolbar = document.getElementById('receipt-analytics-toolbar');
const receiptYearFilter = document.getElementById('receipt-year-filter');
const receiptCategoryFilter = document.getElementById('receipt-category-filter');
const receiptSupermarketFilter = document.getElementById('receipt-supermarket-filter');
const receiptItemSearch = document.getElementById('receipt-item-search');
const receiptTabs = [...document.querySelectorAll('[data-receipt-tab]')];
const receiptTabPanels = [...document.querySelectorAll('.receipt-tab-panel')];
const receiptSummary = document.getElementById('receipt-summary');
const receiptKpis = document.getElementById('receipt-kpis');
const receiptCalendar = document.getElementById('receipt-calendar');
const receiptCalendarTitle = document.getElementById('receipt-calendar-title');
const receiptCalendarDetails = document.getElementById('receipt-calendar-details');
const receiptDateCard = document.getElementById('receipt-date-card');
const receiptDateTitle = document.getElementById('receipt-date-title');
const receiptDateTotal = document.getElementById('receipt-date-total');
const receiptDateDiscount = document.getElementById('receipt-date-discount');
const receiptDateItems = document.getElementById('receipt-date-items');
const receiptTopItems = document.getElementById('receipt-top-items');
const receiptTopPrev = document.getElementById('receipt-top-prev');
const receiptTopNext = document.getElementById('receipt-top-next');
const receiptTopLabel = document.getElementById('receipt-top-label');
const receiptCategorySummary = document.getElementById('receipt-category-summary');
const receiptSupermarketSummary = document.getElementById('receipt-supermarket-summary');
const receiptShowCategories = document.getElementById('receipt-show-categories');
const receiptShowSupermarkets = document.getElementById('receipt-show-supermarkets');
const receiptBreakdownPrev = document.getElementById('receipt-breakdown-prev');
const receiptBreakdownNext = document.getElementById('receipt-breakdown-next');
const receiptBreakdownLabel = document.getElementById('receipt-breakdown-label');
const receiptAllItems = document.getElementById('receipt-all-items');
const receiptPagePrev = document.getElementById('receipt-page-prev');
const receiptPageNext = document.getElementById('receipt-page-next');
const receiptPageLabel = document.getElementById('receipt-page-label');
const receiptCategorySuggestions = document.getElementById('receipt-category-suggestions');
const receiptReviewOnly = document.getElementById('receipt-review-only');
const receiptUncategorizedAlert = document.getElementById('receipt-uncategorized-alert');
const receiptPriceTrendDialog = document.getElementById('receipt-price-trend-dialog');
const receiptPriceTrendTitle = document.getElementById('receipt-price-trend-title');
const receiptPriceTrendChart = document.getElementById('receipt-price-trend-chart');
const receiptPriceTrendClose = document.getElementById('receipt-price-trend-close');

const receiptAnalytics = {
  rows: [],
  items: [],
  selectedDate: null,
  month: String(new Date().getMonth() + 1).padStart(2, '0'),
  year: String(new Date().getFullYear()),
  category: '',
  supermarket: '',
  itemSearch: '',
  mappingPage: 0,
  reviewOnly: false,
  topPage: 0,
  breakdownView: 'category',
  breakdownPages: { category: 0, supermarket: 0 },
  insightCategories: null,
  insightSupermarkets: null,
  userId: null,
  loadedUserId: null,
  loadingUserId: null,
  loadId: 0
};

const receiptMoney = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK'
});
const receiptChartMoney = new Intl.NumberFormat('da-DK', {
  style: 'currency',
  currency: 'DKK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const receiptNumber = new Intl.NumberFormat('da-DK', {
  maximumFractionDigits: 2
});

const receiptValidCategories = [
  'Bakery', 'Canned', 'Cleaning', 'Coffee', 'Dairy', 'Dressing', 'Drinks', 'Frozen',
  'Fruit', 'Grains', 'International', 'Legums', 'Nuts', 'Other', 'Snacks', 'Spices',
  'Sweets', 'Toppings', 'Vegan Protein', 'Vegetables'
];

initReceiptAnalytics();

function initReceiptAnalytics() {
  const sidebar = document.querySelector('.sidebar');
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--receipt-nav-top', `${sidebar.offsetHeight}px`);
  }).observe(sidebar);
  receiptYearFilter.addEventListener('change', () => {
    receiptAnalytics.year = receiptYearFilter.value;
    receiptAnalytics.selectedDate = null;
    receiptAnalytics.topPage = 0;
    receiptAnalytics.breakdownPages = { category: 0, supermarket: 0 };
    receiptAnalytics.insightCategories = null;
    receiptAnalytics.insightSupermarkets = null;
    renderReceiptAnalytics();
  });
  receiptCategoryFilter.addEventListener('change', () => {
    receiptAnalytics.category = receiptCategoryFilter.value;
    receiptAnalytics.mappingPage = 0;
    receiptAnalytics.topPage = 0;
    receiptAnalytics.breakdownPages = { category: 0, supermarket: 0 };
    receiptAnalytics.insightCategories = null;
    receiptAnalytics.insightSupermarkets = null;
    renderReceiptAnalytics();
  });
  receiptSupermarketFilter.addEventListener('change', () => {
    receiptAnalytics.supermarket = receiptSupermarketFilter.value;
    receiptAnalytics.mappingPage = 0;
    receiptAnalytics.topPage = 0;
    receiptAnalytics.breakdownPages = { category: 0, supermarket: 0 };
    receiptAnalytics.insightCategories = null;
    receiptAnalytics.insightSupermarkets = null;
    renderReceiptAnalytics();
  });
  receiptItemSearch.addEventListener('input', () => {
    receiptAnalytics.itemSearch = receiptItemSearch.value.trim().toLocaleLowerCase();
    receiptAnalytics.mappingPage = 0;
    receiptAnalytics.topPage = 0;
    receiptAnalytics.breakdownPages = { category: 0, supermarket: 0 };
    receiptAnalytics.insightCategories = null;
    receiptAnalytics.insightSupermarkets = null;
    renderReceiptAnalytics();
  });
  receiptSummary.addEventListener('click', (event) => {
    const button = event.target.closest('[data-receipt-month]');
    if (!button) {
      return;
    }
    receiptAnalytics.month = button.dataset.receiptMonth;
    receiptAnalytics.selectedDate = null;
    renderReceiptAnalytics();
  });
  const showReceiptBreakdown = (showSupermarkets) => {
    receiptAnalytics.breakdownView = showSupermarkets ? 'supermarket' : 'category';
    receiptShowCategories.setAttribute('aria-pressed', String(!showSupermarkets));
    receiptShowSupermarkets.setAttribute('aria-pressed', String(showSupermarkets));
    receiptCategorySummary.hidden = showSupermarkets;
    receiptSupermarketSummary.hidden = !showSupermarkets;
    if ((showSupermarkets && receiptAnalytics.insightCategories)
      || (!showSupermarkets && receiptAnalytics.insightSupermarkets)) {
      receiptAnalytics.insightCategories = null;
      receiptAnalytics.insightSupermarkets = null;
      receiptAnalytics.topPage = 0;
      const rows = filteredReceiptRows(false);
      renderTopReceiptItems(rows);
    }
    const rows = filteredReceiptRows(false);
    renderReceiptCategories(rows);
    renderReceiptSupermarkets(rows);
  };
  receiptShowCategories.addEventListener('click', () => showReceiptBreakdown(false));
  receiptShowSupermarkets.addEventListener('click', () => showReceiptBreakdown(true));
  const changeBreakdownPage = (delta) => {
    const view = receiptAnalytics.breakdownView;
    receiptAnalytics.breakdownPages[view] += delta;
    const rows = filteredReceiptRows(false);
    if (view === 'category') renderReceiptCategories(rows);
    else renderReceiptSupermarkets(rows);
  };
  receiptBreakdownPrev.addEventListener('click', () => changeBreakdownPage(-1));
  receiptBreakdownNext.addEventListener('click', () => changeBreakdownPage(1));
  [
    [receiptCategorySummary, 'categories', 'insightCategories'],
    [receiptSupermarketSummary, 'supermarkets', 'insightSupermarkets']
  ].forEach(([chart, kind, selection]) => {
    chart.addEventListener('click', (event) => {
      const bar = event.target.closest(`[data-bar-${kind}]`);
      if (!bar) return;
      const values = JSON.parse(bar.dataset[kind === 'categories' ? 'barCategories' : 'barSupermarkets']);
      receiptAnalytics[selection] = JSON.stringify(receiptAnalytics[selection]) === JSON.stringify(values)
        ? null
        : values;
      receiptAnalytics.topPage = 0;
      chart.querySelectorAll(`[data-bar-${kind}]`).forEach((item) => {
        const selected = item.dataset[kind === 'categories' ? 'barCategories' : 'barSupermarkets'];
        item.setAttribute('aria-pressed', String(selected === JSON.stringify(receiptAnalytics[selection])));
      });
      renderTopReceiptItems(filteredReceiptRows(false));
    });
  });
  receiptPagePrev.addEventListener('click', () => {
    receiptAnalytics.mappingPage -= 1;
    renderAllReceiptItems();
  });
  receiptPageNext.addEventListener('click', () => {
    receiptAnalytics.mappingPage += 1;
    renderAllReceiptItems();
  });
  receiptReviewOnly.addEventListener('click', () => {
    receiptAnalytics.reviewOnly = !receiptAnalytics.reviewOnly;
    receiptReviewOnly.setAttribute('aria-pressed', String(receiptAnalytics.reviewOnly));
    receiptReviewOnly.title = receiptAnalytics.reviewOnly
      ? 'Show all items'
      : 'Show only items needing a category';
    receiptAnalytics.mappingPage = 0;
    renderAllReceiptItems();
  });
  receiptTopPrev.addEventListener('click', () => {
    receiptAnalytics.topPage -= 1;
    renderTopReceiptItems(filteredReceiptRows(false));
  });
  receiptTopNext.addEventListener('click', () => {
    receiptAnalytics.topPage += 1;
    renderTopReceiptItems(filteredReceiptRows(false));
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
  receiptCalendar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-receipt-date]');
    if (!button) {
      return;
    }
    receiptAnalytics.selectedDate = receiptAnalytics.selectedDate === button.dataset.receiptDate
      ? null
      : button.dataset.receiptDate;
    renderSpendingDetails();
    renderReceiptKpis();
    receiptCalendar.querySelectorAll('[data-receipt-date]').forEach((day) => {
      day.setAttribute('aria-pressed', String(day.dataset.receiptDate === receiptAnalytics.selectedDate));
    });
  });
  ['mouseover', 'focusin'].forEach((type) => receiptCalendar.addEventListener(type, (event) => {
    const day = event.target.closest('[data-receipt-details]');
    if (day) receiptCalendarDetails.textContent = day.dataset.receiptDetails;
  }));
  ['mouseout', 'focusout'].forEach((type) => receiptCalendar.addEventListener(type, (event) => {
    if (event.target.closest('[data-receipt-details]')) {
      receiptCalendarDetails.textContent = 'Hover over or focus a shopping day for details.';
    }
  }));
  [receiptCategorySummary, receiptSupermarketSummary].forEach((chart) => {
    const help = chart === receiptCategorySummary
      ? 'Select a category to filter Top Items; select it again to clear.'
      : 'Select a supermarket to filter Top Items; select it again to clear.';
    ['mouseover', 'focusin'].forEach((type) => chart.addEventListener(type, (event) => {
      const bar = event.target.closest('[data-bar-detail]');
      if (bar) chart.querySelector('.receipt-bar-detail').textContent = bar.dataset.barDetail;
    }));
    ['mouseout', 'focusout'].forEach((type) => chart.addEventListener(type, (event) => {
      const bar = event.target.closest('[data-bar-detail]');
      if (!bar || (event.relatedTarget && bar.contains(event.relatedTarget))) return;
      const focused = type === 'mouseout' ? chart.querySelector('[data-bar-detail]:focus') : null;
      chart.querySelector('.receipt-bar-detail').textContent = focused
        ? focused.dataset.barDetail
        : help;
    }));
  });
  receiptAllItems.addEventListener('change', handleCategoryEdit);
  receiptTopItems.addEventListener('click', handlePriceTrendClick);
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
    receiptAnalytics.insightCategories = null;
    receiptAnalytics.insightSupermarkets = null;
    receiptYearFilter.disabled = true;
    receiptCategoryFilter.disabled = true;
    receiptSupermarketFilter.disabled = true;
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
  receiptAnalytics.insightCategories = null;
  receiptAnalytics.insightSupermarkets = null;
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
        .select('id,purchase_date,item_id,amount,price,price_per_unit,owner,supermarket,transaction_id,discount,discount_plus')
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
    updateReceiptSupermarketOptions();
    receiptCategoryFilter.disabled = false;
    receiptSupermarketFilter.disabled = false;
    receiptItemSearch.disabled = false;
    updateReceiptUncategorizedAlert();
    setReceiptStatus('');
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
  receiptReviewOnly.hidden = name !== 'all-items';
  receiptYearFilter.hidden = name === 'all-items';
  receiptAnalyticsToolbar.classList.toggle('receipt-mappings-toolbar', name === 'all-items');
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

function filteredReceiptRows(includeMonth = true, includeYear = true) {
  return receiptAnalytics.rows.filter((row) => {
    const category = normalizeCategory(row.category);
    return (!includeYear || row.date.slice(0, 4) === receiptAnalytics.year)
      && (!includeMonth || !receiptAnalytics.month || row.date.slice(5, 7) === receiptAnalytics.month)
      && (!receiptAnalytics.category || category === receiptAnalytics.category)
      && (!receiptAnalytics.supermarket || (row.supermarket?.trim() || 'Unknown') === receiptAnalytics.supermarket)
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

function updateReceiptSupermarketOptions() {
  const names = [...new Set(receiptAnalytics.rows.map((row) => row.supermarket?.trim() || 'Unknown'))]
    .sort((left, right) => left.localeCompare(right));
  if (receiptAnalytics.supermarket && !names.includes(receiptAnalytics.supermarket)) {
    receiptAnalytics.supermarket = '';
  }
  receiptSupermarketFilter.innerHTML = [
    '<option value="">All supermarkets</option>',
    ...names.map((name) => `<option value="${escapeReceiptHtml(name)}">${escapeReceiptHtml(name)}</option>`)
  ].join('');
  receiptSupermarketFilter.value = receiptAnalytics.supermarket;
}

function categoryNames() {
  return [...new Set(receiptAnalytics.items.map((item) => normalizeCategory(item.category)))]
    .sort((left, right) => left.localeCompare(right));
}

function updateReceiptUncategorizedAlert() {
  const count = receiptAnalytics.items.filter((item) => normalizeCategory(item.category) === 'Uncategorized').length;
  receiptUncategorizedAlert.hidden = count === 0;
  receiptUncategorizedAlert.textContent = count
    ? `${count.toLocaleString()} item${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} a category. Assign ${count === 1 ? 'it' : 'them'} in the Mappings tab.`
    : '';
}

function normalizeCategory(category) {
  return String(category || '').trim() || 'Uncategorized';
}

function renderReceiptAnalytics() {
  updateReceiptCategoryOptions();
  const rows = filteredReceiptRows();
  const yearlyRows = filteredReceiptRows(false);
  if (receiptAnalytics.selectedDate && !rows.some((row) => row.date === receiptAnalytics.selectedDate)) {
    receiptAnalytics.selectedDate = null;
  }
  renderReceiptKpis();
  renderReceiptMonthlySummary(yearlyRows);
  renderReceiptCalendar(rows);
  renderTopReceiptItems(yearlyRows);
  renderReceiptCategories(yearlyRows);
  renderReceiptSupermarkets(yearlyRows);
  renderAllReceiptItems();
}

function renderReceiptKpis() {
  const yearlyRows = filteredReceiptRows(false);
  const selectedRows = filteredReceiptRows().filter((row) =>
    !receiptAnalytics.selectedDate || row.date === receiptAnalytics.selectedDate
  );
  const months = new Set(yearlyRows.map((row) => row.date.slice(0, 7)));
  const totalSpend = yearlyRows.reduce((sum, row) => sum + Number(row.price), 0);
  const totalSavings = yearlyRows.reduce((sum, row) => sum + receiptDiscount(row), 0);
  const selectedSpend = selectedRows.reduce((sum, row) => sum + Number(row.price), 0);
  const selectedSavings = selectedRows.reduce((sum, row) => sum + receiptDiscount(row), 0);
  const period = receiptAnalytics.selectedDate
    ? formatReceiptDate(receiptAnalytics.selectedDate)
    : new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(Number(receiptAnalytics.year), Number(receiptAnalytics.month) - 1, 1)));
  const divisor = months.size || 1;
  receiptKpis.innerHTML = `
    <div class="receipt-card receipt-kpi"><span>Spent · ${escapeReceiptHtml(period)}</span><strong>${receiptChartMoney.format(selectedSpend)}</strong><small>${escapeReceiptHtml(receiptAnalytics.year)} avg.: ${receiptChartMoney.format(totalSpend / divisor)}</small></div>
    <div class="receipt-card receipt-kpi"><span>Savings · ${escapeReceiptHtml(period)}</span><strong>${receiptChartMoney.format(selectedSavings)}</strong><small>${escapeReceiptHtml(receiptAnalytics.year)} avg.: ${receiptChartMoney.format(totalSavings / divisor)}</small></div>
  `;
}

function renderReceiptMonthlySummary(rows) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index,
    spend: 0,
    dates: new Set()
  }));
  rows.forEach((row) => {
    const month = Number(row.date.slice(5, 7)) - 1;
    if (month >= 0 && month < months.length) {
      months[month].spend += Number(row.price);
      months[month].dates.add(row.date);
    }
  });
  const maximum = Math.max(...months.map((month) => month.spend), 1);
  const columns = months.map((month) => {
    const name = new Intl.DateTimeFormat('da-DK', { month: 'short' })
      .format(new Date(2020, month.month, 1))
      .replace(/\.$/, '');
    const shoppingDates = month.dates.size;
    const height = month.spend
      ? Math.max(3, Math.round(month.spend / maximum * 100))
      : 0;
    const description = `${name}: ${shoppingDates.toLocaleString()} shopping date${shoppingDates === 1 ? '' : 's'}, ${receiptChartMoney.format(month.spend)} total spend`;
    const selected = receiptAnalytics.month === String(month.month + 1).padStart(2, '0');
    return `
      <button type="button" class="receipt-month-column" data-receipt-month="${String(month.month + 1).padStart(2, '0')}" title="${escapeReceiptHtml(description)}" aria-label="Filter by ${escapeReceiptHtml(description)}" aria-pressed="${selected}">
        <span class="receipt-month-value">${escapeReceiptHtml(receiptChartMoney.format(month.spend))}</span>
        <span class="receipt-month-track"><span class="receipt-month-fill" style="height:${height}%"></span></span>
        <span class="receipt-month-label">${escapeReceiptHtml(name)}</span>
      </button>
    `;
  }).join('');
  receiptSummary.innerHTML = `
    <p class="receipt-monthly-heading">Monthly Spend</p>
    <div class="receipt-monthly-chart" role="group" aria-label="Monthly spending and shopping dates for ${escapeReceiptHtml(receiptAnalytics.year)}">
      ${columns}
    </div>
  `;
}

function renderReceiptCalendar(rows) {
  const byDate = new Map();
  rows.forEach((row) => {
    if (!byDate.has(row.date)) byDate.set(row.date, { spend: 0, savings: 0, places: new Set() });
    const day = byDate.get(row.date);
    day.spend += Number(row.price);
    day.savings += receiptDiscount(row);
    day.places.add(row.supermarket?.trim() || 'Unknown');
  });
  if (receiptAnalytics.selectedDate && !byDate.has(receiptAnalytics.selectedDate)) {
    receiptAnalytics.selectedDate = null;
  }
  const year = Number(receiptAnalytics.year);
  const month = Number(receiptAnalytics.month);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const leadingDays = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  receiptCalendarTitle.textContent = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(firstDay);
  const headings = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .map((day) => `<span class="receipt-calendar-weekday">${day}</span>`).join('');
  const blanks = '<span class="receipt-calendar-blank"></span>'.repeat(leadingDays);
  const maxSpend = Math.max(0, ...[...byDate.values()].map((day) => day.spend));
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const number = index + 1;
    const date = `${receiptAnalytics.year}-${receiptAnalytics.month}-${String(number).padStart(2, '0')}`;
    const day = byDate.get(date);
    if (!day) return `<span class="receipt-calendar-day">${number}</span>`;
    const level = maxSpend > 0 ? Math.max(1, Math.ceil(day.spend / maxSpend * 5)) : 1;
    const description = `${formatReceiptDate(date)}: ${receiptChartMoney.format(day.spend)} spent; ${[...day.places].join(', ')}; ${receiptChartMoney.format(day.savings)} saved`;
    return `
      <button type="button" class="receipt-calendar-day receipt-calendar-shopping receipt-calendar-heat-${level}" data-receipt-date="${date}" data-receipt-details="${escapeReceiptHtml(description)}" title="${escapeReceiptHtml(description)}" aria-label="${escapeReceiptHtml(description)}" aria-pressed="${date === receiptAnalytics.selectedDate}">${number}</button>
    `;
  }).join('');
  receiptCalendar.innerHTML = headings + blanks + days;
  receiptCalendarDetails.textContent = 'Hover over or focus a shopping day for details.';
  renderSpendingDetails();
}

function renderSpendingDetails() {
  const date = receiptAnalytics.selectedDate;
  const rows = filteredReceiptRows().filter((row) => row.date === date);
  receiptDateCard.hidden = !date || !rows.length;
  receiptDateTitle.textContent = date ? formatReceiptDate(date) : 'Choose a date';
  receiptDateTotal.textContent = formatReceiptMoney(rows.reduce((sum, row) => sum + Number(row.price), 0));
  receiptDateDiscount.textContent = formatReceiptMoney(rows.reduce((sum, row) => sum + receiptDiscount(row), 0));
  receiptDateItems.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td data-label="Item">${escapeReceiptHtml(row.item)}</td>
        <td data-label="Category">${escapeReceiptHtml(row.category || 'Uncategorized')}</td>
        <td data-label="Amount">${escapeReceiptHtml(row.amount)}</td>
        <td data-label="Total price">${formatReceiptMoney(Number(row.price))}</td>
        <td data-label="Price per unit">${row.price_per_unit == null ? '—' : formatReceiptMoney(row.price_per_unit)}</td>
        <td data-label="Owner">${escapeReceiptHtml(row.owner || '')}</td>
        <td data-label="Supermarket">${escapeReceiptHtml(row.supermarket || '—')}</td>
        <td data-label="Discount">${row.discount == null ? '—' : formatReceiptMoney(Number(row.discount))}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" class="receipt-empty">No items for this date and year.</td></tr>';
}

function receiptDiscount(row) {
  return Number(row.discount || 0) + Number(row.discount_plus || 0);
}

function renderReceiptSupermarkets(rows) {
  const supermarkets = new Map();
  rows.forEach((row) => {
    const name = row.supermarket?.trim() || 'Unknown';
    if (!supermarkets.has(name)) {
      supermarkets.set(name, { spend: 0, discount: 0 });
    }
    const summary = supermarkets.get(name);
    summary.spend += Number(row.price);
    summary.discount += receiptDiscount(row);
  });
  receiptSupermarketSummary.innerHTML = renderReceiptBars([...supermarkets.entries()].map(([name, summary]) => ({
    name, spend: summary.spend, discount: summary.discount
  })), 'supermarket');
}

function renderReceiptBars(entries, label) {
  const total = entries.reduce((sum, entry) => sum + entry.spend, 0);
  const valid = entries.length && total > 0 && !entries.some((entry) => entry.spend < 0);
  const pageSize = 10;
  const pageCount = valid ? Math.ceil(entries.length / pageSize) : 1;
  const page = Math.max(0, Math.min(receiptAnalytics.breakdownPages[label], pageCount - 1));
  receiptAnalytics.breakdownPages[label] = page;
  if (receiptAnalytics.breakdownView === label) {
    receiptBreakdownPrev.disabled = page === 0;
    receiptBreakdownNext.disabled = page === pageCount - 1;
    receiptBreakdownLabel.textContent = `Page ${page + 1} of ${pageCount}`;
  }
  if (!valid) {
    return `<p class="receipt-empty">No positive ${label} totals available for a bar chart.</p>`;
  }
  const sorted = [...entries].sort((left, right) =>
    right.spend - left.spend || left.name.localeCompare(right.name)
  );
  const shown = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const max = sorted[0].spend;
  const bars = shown.map((entry) => {
    const name = entry.name;
    const detail = `${name}: ${receiptChartMoney.format(entry.spend)}${entry.discount == null ? '' : `; discounts: ${receiptChartMoney.format(entry.discount)}`} (${Math.round(entry.spend / total * 100)}%)`;
    const kind = label === 'category' ? 'categories' : 'supermarkets';
    const selection = label === 'category' ? receiptAnalytics.insightCategories : receiptAnalytics.insightSupermarkets;
    const values = [entry.name];
    const selectionAttributes = ` data-bar-${kind}="${escapeReceiptHtml(JSON.stringify(values))}" aria-pressed="${JSON.stringify(selection) === JSON.stringify(values)}"`;
    return `<button type="button" class="receipt-bar" data-bar-detail="${escapeReceiptHtml(detail)}"${selectionAttributes} aria-label="${escapeReceiptHtml(detail)}" title="${escapeReceiptHtml(detail)}"><span class="receipt-bar-fill" style="width: ${entry.spend / max * 100}%"></span><span class="receipt-bar-label">${escapeReceiptHtml(name)}</span><span class="receipt-bar-amount">${receiptChartMoney.format(entry.spend)}</span></button>`;
  }).join('');
  return `
    <div class="receipt-bar-chart" role="group" aria-label="Spending by ${label}">
      ${bars}
    </div>
    <p class="receipt-bar-detail" aria-live="polite">Select a ${label} to filter Top Items; select it again to clear.</p>
  `;
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
  const matchingRows = rows.filter((row) =>
    (!receiptAnalytics.insightCategories || receiptAnalytics.insightCategories.includes(normalizeCategory(row.category)))
    && (!receiptAnalytics.insightSupermarkets || receiptAnalytics.insightSupermarkets.includes(row.supermarket?.trim() || 'Unknown'))
  );
  const items = aggregateReceiptItems(matchingRows);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  receiptAnalytics.topPage = Math.max(0, Math.min(receiptAnalytics.topPage, pageCount - 1));
  receiptTopPrev.disabled = receiptAnalytics.topPage === 0;
  receiptTopNext.disabled = receiptAnalytics.topPage === pageCount - 1;
  receiptTopLabel.textContent = `Page ${receiptAnalytics.topPage + 1} of ${pageCount}`;
  const maxSpend = items.length ? Math.max(0, items[0].spend) : 0;
  receiptTopItems.innerHTML = items.length
    ? items.slice(receiptAnalytics.topPage * pageSize, (receiptAnalytics.topPage + 1) * pageSize).map((item) => `
      <tr class="receipt-top-row" style="--receipt-item-bar: ${maxSpend > 0 ? item.spend / maxSpend * 100 : 0}%">
        <td data-label="Item">
          ${escapeReceiptHtml(item.name)}
          <small class="receipt-top-item-details">${[...item.amounts.entries()].map(([unit, amount]) => `${receiptNumber.format(amount)}${unit ? ` ${escapeReceiptHtml(unit)}` : ''}`).join(' + ')} · ${item.purchases} purchases · ${escapeReceiptHtml(item.category)}</small>
        </td>
        <td data-label="Total spend">
          <div class="receipt-top-item-spend">
            <strong>${receiptChartMoney.format(item.spend)}</strong>
            <button type="button" class="receipt-price-trend-button" data-price-trend-item="${escapeReceiptHtml(item.itemId)}" aria-label="Show price per unit trend for ${escapeReceiptHtml(item.name)}" title="Show price per unit trend">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="2" class="receipt-empty">No items match these filters.</td></tr>';
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
  receiptCategorySummary.innerHTML = renderReceiptBars(
    [...categories.entries()].map(([name, summary]) => ({ name, spend: summary.spend })),
    'category'
  );

  receiptCategorySuggestions.innerHTML = [...new Set([...receiptValidCategories, ...categoryNames()])]
    .filter((category) => category !== 'Uncategorized')
    .map((category) => `<option value="${escapeReceiptHtml(category)}"></option>`).join('');
}

function renderAllReceiptItems() {
  const aggregates = new Map(aggregateReceiptItems(filteredReceiptRows(false, false))
    .map((item) => [item.itemId, item]));
  const items = receiptAnalytics.items.filter((item) => {
    const category = normalizeCategory(item.category);
    return (!receiptAnalytics.reviewOnly || category === 'Uncategorized')
      && (!receiptAnalytics.category || category === receiptAnalytics.category)
      && (!receiptAnalytics.itemSearch || item.name.toLocaleLowerCase().includes(receiptAnalytics.itemSearch))
      && (!receiptAnalytics.supermarket || aggregates.has(item.id));
  }).sort((left, right) => {
    const leftSpend = aggregates.get(left.id)?.spend || 0;
    const rightSpend = aggregates.get(right.id)?.spend || 0;
    return rightSpend - leftSpend || left.name.localeCompare(right.name);
  });
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  receiptAnalytics.mappingPage = Math.max(0, Math.min(receiptAnalytics.mappingPage, pageCount - 1));
  receiptPagePrev.disabled = receiptAnalytics.mappingPage === 0;
  receiptPageNext.disabled = receiptAnalytics.mappingPage === pageCount - 1;
  receiptPageLabel.textContent = `Page ${receiptAnalytics.mappingPage + 1} of ${pageCount}`;
  receiptAllItems.innerHTML = items.length
    ? items.slice(receiptAnalytics.mappingPage * pageSize, (receiptAnalytics.mappingPage + 1) * pageSize).map((item) => {
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
    .filter((row) => row.item_id === item.id && Number.isFinite(row.price_per_unit)
      && (!receiptAnalytics.supermarket || (row.supermarket?.trim() || 'Unknown') === receiptAnalytics.supermarket))
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
      <text class="receipt-price-trend-axis-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${escapeReceiptHtml(receiptChartMoney.format(value))}</text>
    `;
  }).join('');
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const markers = points.map(({ x, y, row }) => `
    <circle class="receipt-price-trend-point" cx="${x}" cy="${y}" r="4">
      <title>${escapeReceiptHtml(formatReceiptDate(row.date))}: ${escapeReceiptHtml(receiptChartMoney.format(Number(row.price_per_unit)))}</title>
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
  await saveReceiptCategory(itemId, category, input.getAttribute('aria-label').replace(/^Category for /, ''));
}

async function saveReceiptCategory(itemId, category, itemName) {
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
    receiptAnalytics.insightCategories = null;
    receiptAnalytics.insightSupermarkets = null;
    receiptAnalytics.topPage = 0;
    updateReceiptUncategorizedAlert();
    setReceiptStatus(`Saved category mapping for ${itemName}.`);
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
