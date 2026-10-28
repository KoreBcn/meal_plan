const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEGACY_STORAGE_KEY = 'meal-plan-v1';
const DEFAULT_INGREDIENT_CATEGORIES = [
  'Fruit', 'Vegetable', 'Protein', 'Dairy', 'Bakery', 'Pantry', 'Frozen', 'Other'
];

const defaultState = {
  ingredients: [
    { id: crypto.randomUUID(), name: 'Tomatoes', category: 'Vegetable', unit: 'kg', price: 3.2 },
    { id: crypto.randomUUID(), name: 'Onions', category: 'Vegetable', unit: 'kg', price: 2.1 },
    { id: crypto.randomUUID(), name: 'Garlic', category: 'Vegetable', unit: 'head', price: 0.8 },
    { id: crypto.randomUUID(), name: 'Bell peppers', category: 'Vegetable', unit: 'kg', price: 4.5 },
    { id: crypto.randomUUID(), name: 'Spinach', category: 'Vegetable', unit: 'kg', price: 4.4 },
    { id: crypto.randomUUID(), name: 'Broccoli', category: 'Vegetable', unit: 'kg', price: 3.6 },
    { id: crypto.randomUUID(), name: 'Mushrooms', category: 'Vegetable', unit: 'kg', price: 4.1 },
    { id: crypto.randomUUID(), name: 'Potatoes', category: 'Vegetable', unit: 'kg', price: 2.4 },
    { id: crypto.randomUUID(), name: 'Sweet potatoes', category: 'Vegetable', unit: 'kg', price: 2.9 },
    { id: crypto.randomUUID(), name: 'Carrots', category: 'Vegetable', unit: 'kg', price: 2.2 },
    { id: crypto.randomUUID(), name: 'Cucumber', category: 'Vegetable', unit: 'kg', price: 2.7 },
    { id: crypto.randomUUID(), name: 'Lettuce', category: 'Vegetable', unit: 'kg', price: 3.5 },
    { id: crypto.randomUUID(), name: 'Chicken breast', category: 'Protein', unit: 'kg', price: 8.5 },
    { id: crypto.randomUUID(), name: 'Beef mince', category: 'Protein', unit: 'kg', price: 10.8 },
    { id: crypto.randomUUID(), name: 'Tofu', category: 'Protein', unit: 'kg', price: 6.2 },
    { id: crypto.randomUUID(), name: 'Eggs', category: 'Dairy', unit: 'pack', price: 3.3 },
    { id: crypto.randomUUID(), name: 'Milk', category: 'Dairy', unit: 'L', price: 1.9 },
    { id: crypto.randomUUID(), name: 'Mozzarella', category: 'Dairy', unit: 'kg', price: 7.5 },
    { id: crypto.randomUUID(), name: 'Greek yogurt', category: 'Dairy', unit: 'kg', price: 5.9 },
    { id: crypto.randomUUID(), name: 'Rice', category: 'Pantry', unit: 'kg', price: 2.6 },
    { id: crypto.randomUUID(), name: 'Pasta', category: 'Pantry', unit: 'kg', price: 2.1 },
    { id: crypto.randomUUID(), name: 'Lentils', category: 'Pantry', unit: 'kg', price: 3.4 },
    { id: crypto.randomUUID(), name: 'Chickpeas', category: 'Pantry', unit: 'kg', price: 3.0 },
    { id: crypto.randomUUID(), name: 'Black beans', category: 'Pantry', unit: 'kg', price: 3.1 },
    { id: crypto.randomUUID(), name: 'Coconut milk', category: 'Pantry', unit: 'can', price: 2.4 },
    { id: crypto.randomUUID(), name: 'Curry paste', category: 'Pantry', unit: 'jar', price: 3.8 },
    { id: crypto.randomUUID(), name: 'Soy sauce', category: 'Pantry', unit: 'bottle', price: 2.2 },
    { id: crypto.randomUUID(), name: 'Olive oil', category: 'Pantry', unit: 'bottle', price: 6.8 },
    { id: crypto.randomUUID(), name: 'Flour', category: 'Pantry', unit: 'kg', price: 1.8 },
    { id: crypto.randomUUID(), name: 'Baking powder', category: 'Pantry', unit: 'pack', price: 1.5 },
    { id: crypto.randomUUID(), name: 'Tomato paste', category: 'Pantry', unit: 'can', price: 1.9 },
    { id: crypto.randomUUID(), name: 'Mixed herbs', category: 'Pantry', unit: 'jar', price: 2.6 }
  ],
  dishes: [
    {
      id: crypto.randomUUID(),
      name: 'Chicken Burrito Bowl',
      ingredients: [
        { ingredientId: null, name: 'Chicken breast', quantity: 0.4 },
        { ingredientId: null, name: 'Rice', quantity: 0.3 },
        { ingredientId: null, name: 'Tomatoes', quantity: 0.2 },
        { ingredientId: null, name: 'Onions', quantity: 0.1 },
        { ingredientId: null, name: 'Bell peppers', quantity: 0.15 },
        { ingredientId: null, name: 'Black beans', quantity: 0.2 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Vegetable Lasagne',
      ingredients: [
        { ingredientId: null, name: 'Pasta', quantity: 0.3 },
        { ingredientId: null, name: 'Tomatoes', quantity: 0.5 },
        { ingredientId: null, name: 'Onions', quantity: 0.2 },
        { ingredientId: null, name: 'Garlic', quantity: 0.05 },
        { ingredientId: null, name: 'Spinach', quantity: 0.25 },
        { ingredientId: null, name: 'Mozzarella', quantity: 0.2 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Lentil Chilli',
      ingredients: [
        { ingredientId: null, name: 'Lentils', quantity: 0.25 },
        { ingredientId: null, name: 'Tomatoes', quantity: 0.4 },
        { ingredientId: null, name: 'Onions', quantity: 0.15 },
        { ingredientId: null, name: 'Garlic', quantity: 0.05 },
        { ingredientId: null, name: 'Bell peppers', quantity: 0.2 },
        { ingredientId: null, name: 'Chickpeas', quantity: 0.2 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Spinach & Ricotta Pasta',
      ingredients: [
        { ingredientId: null, name: 'Pasta', quantity: 0.25 },
        { ingredientId: null, name: 'Spinach', quantity: 0.3 },
        { ingredientId: null, name: 'Garlic', quantity: 0.05 },
        { ingredientId: null, name: 'Tomatoes', quantity: 0.2 },
        { ingredientId: null, name: 'Mozzarella', quantity: 0.15 },
        { ingredientId: null, name: 'Olive oil', quantity: 0.05 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Tofu Coconut Curry',
      ingredients: [
        { ingredientId: null, name: 'Tofu', quantity: 0.3 },
        { ingredientId: null, name: 'Coconut milk', quantity: 1 },
        { ingredientId: null, name: 'Curry paste', quantity: 0.1 },
        { ingredientId: null, name: 'Broccoli', quantity: 0.25 },
        { ingredientId: null, name: 'Onions', quantity: 0.15 },
        { ingredientId: null, name: 'Rice', quantity: 0.25 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Beef & Potato Tray Bake',
      ingredients: [
        { ingredientId: null, name: 'Beef mince', quantity: 0.4 },
        { ingredientId: null, name: 'Potatoes', quantity: 0.5 },
        { ingredientId: null, name: 'Carrots', quantity: 0.2 },
        { ingredientId: null, name: 'Onions', quantity: 0.15 },
        { ingredientId: null, name: 'Garlic', quantity: 0.05 },
        { ingredientId: null, name: 'Mixed herbs', quantity: 0.05 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Veggie Stir Fry',
      ingredients: [
        { ingredientId: null, name: 'Broccoli', quantity: 0.25 },
        { ingredientId: null, name: 'Bell peppers', quantity: 0.2 },
        { ingredientId: null, name: 'Mushrooms', quantity: 0.2 },
        { ingredientId: null, name: 'Onions', quantity: 0.1 },
        { ingredientId: null, name: 'Soy sauce', quantity: 0.05 },
        { ingredientId: null, name: 'Rice', quantity: 0.25 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Chicken Caesar Salad',
      ingredients: [
        { ingredientId: null, name: 'Chicken breast', quantity: 0.35 },
        { ingredientId: null, name: 'Lettuce', quantity: 0.2 },
        { ingredientId: null, name: 'Cucumber', quantity: 0.15 },
        { ingredientId: null, name: 'Tomatoes', quantity: 0.15 },
        { ingredientId: null, name: 'Greek yogurt', quantity: 0.1 },
        { ingredientId: null, name: 'Olive oil', quantity: 0.05 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Greek Chicken Wraps',
      ingredients: [
        { ingredientId: null, name: 'Chicken breast', quantity: 0.3 },
        { ingredientId: null, name: 'Lettuce', quantity: 0.12 },
        { ingredientId: null, name: 'Tomatoes', quantity: 0.15 },
        { ingredientId: null, name: 'Cucumber', quantity: 0.12 },
        { ingredientId: null, name: 'Greek yogurt', quantity: 0.1 },
        { ingredientId: null, name: 'Flour', quantity: 0.2 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Sweet Potato Chickpea Hash',
      ingredients: [
        { ingredientId: null, name: 'Sweet potatoes', quantity: 0.4 },
        { ingredientId: null, name: 'Chickpeas', quantity: 0.2 },
        { ingredientId: null, name: 'Onions', quantity: 0.15 },
        { ingredientId: null, name: 'Bell peppers', quantity: 0.2 },
        { ingredientId: null, name: 'Spinach', quantity: 0.15 },
        { ingredientId: null, name: 'Olive oil', quantity: 0.05 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Tomato Soup',
      ingredients: [
        { ingredientId: null, name: 'Tomatoes', quantity: 0.8 },
        { ingredientId: null, name: 'Onions', quantity: 0.2 },
        { ingredientId: null, name: 'Garlic', quantity: 0.05 },
        { ingredientId: null, name: 'Carrots', quantity: 0.15 },
        { ingredientId: null, name: 'Milk', quantity: 0.2 },
        { ingredientId: null, name: 'Olive oil', quantity: 0.05 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Veggie Taco Tray',
      ingredients: [
        { ingredientId: null, name: 'Tomatoes', quantity: 0.2 },
        { ingredientId: null, name: 'Onions', quantity: 0.15 },
        { ingredientId: null, name: 'Bell peppers', quantity: 0.2 },
        { ingredientId: null, name: 'Black beans', quantity: 0.25 },
        { ingredientId: null, name: 'Flour', quantity: 0.2 },
        { ingredientId: null, name: 'Greek yogurt', quantity: 0.1 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: 'Egg Fried Rice',
      ingredients: [
        { ingredientId: null, name: 'Eggs', quantity: 2 },
        { ingredientId: null, name: 'Rice', quantity: 0.25 },
        { ingredientId: null, name: 'Onions', quantity: 0.1 },
        { ingredientId: null, name: 'Bell peppers', quantity: 0.15 },
        { ingredientId: null, name: 'Soy sauce', quantity: 0.05 },
        { ingredientId: null, name: 'Garlic', quantity: 0.05 }
      ]
    }
  ],
  plan: {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  },
  shoppingChecks: {}
};

const supabaseClient = window.supabase.createClient(
  window.MEAL_PLAN_SUPABASE_CONFIG.url,
  window.MEAL_PLAN_SUPABASE_CONFIG.publishableKey
);
const state = {
  ingredients: [],
  dishes: [],
  plan: Object.fromEntries(dayNames.map((day) => [day, []])),
  shoppingChecks: {}
};

const authPanel = document.getElementById('auth-panel');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authStatus = document.getElementById('auth-status');
const signUpButton = document.getElementById('sign-up');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const appShell = document.querySelector('.app-shell');
const appStatus = document.getElementById('app-status');
const signedInUser = document.getElementById('signed-in-user');
const signOutButton = document.getElementById('sign-out');
const navButtons = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');
const ingredientForm = document.getElementById('ingredient-form');
const ingredientTableBody = document.getElementById('ingredient-table-body');
const ingredientIdInput = document.getElementById('ingredient-id');
const ingredientNameInput = document.getElementById('ingredient-name');
const ingredientCategoryInput = document.getElementById('ingredient-category');
const ingredientUnitInput = document.getElementById('ingredient-unit');
const ingredientPriceInput = document.getElementById('ingredient-price');
const resetIngredientButton = document.getElementById('reset-ingredient-form');

const dishForm = document.getElementById('dish-form');
const dishTableBody = document.getElementById('dish-table-body');
const dishIdInput = document.getElementById('dish-id');
const dishNameInput = document.getElementById('dish-name');
const dishIngredientSelect = document.getElementById('dish-ingredient-select');
const dishIngredientQuantityInput = document.getElementById('dish-ingredient-quantity');
const dishIngredientList = document.getElementById('dish-ingredient-list');
const addDishIngredientButton = document.getElementById('add-dish-ingredient');
const resetDishButton = document.getElementById('reset-dish-form');

const plannerGrid = document.getElementById('planner-grid');
const plannerKpi = document.getElementById('planner-kpi');
const analyticsSummary = document.getElementById('analytics-summary');
const weeklyChart = document.getElementById('weekly-chart');
const mealRanking = document.getElementById('meal-ranking');
const historicalRankingList = document.getElementById('historical-ranking');
const shoppingList = document.getElementById('shopping-list');
const shoppingSummary = document.getElementById('shopping-summary');
const liveSyncStatus = document.getElementById('live-sync-status');
const clearWeeklyPlanButton = document.getElementById('clear-weekly-plan');
const dishSortSelect = document.getElementById('dish-sort');

let currentDishIngredients = [];
let currentUserId = null;
let sharedOwnerId = null;
let realtimeChannel = null;
let sharedRefreshTimer = null;

const savedTheme = window.localStorage.getItem('mealPlanTheme');
if (savedTheme !== 'light') {
  document.body.dataset.theme = 'dark';
}
updateThemeToggle();

init();

async function init() {
  themeToggle.addEventListener('click', () => {
    const theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem('mealPlanTheme', theme);
    if (theme === 'dark') {
      document.body.dataset.theme = theme;
    } else {
      delete document.body.dataset.theme;
    }
    updateThemeToggle();
  });

  authForm.addEventListener('submit', (event) => runAuthAction(async () => {
    event.preventDefault();
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: authEmailInput.value.trim(),
      password: authPasswordInput.value
    });
    if (error) {
      throw error;
    }
  }));

  signUpButton.addEventListener('click', () => {
    if (!authForm.reportValidity()) {
      return;
    }
    runAuthAction(async () => {
      const { data, error } = await supabaseClient.auth.signUp({
        email: authEmailInput.value.trim(),
        password: authPasswordInput.value,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) {
        throw error;
      }
      if (!data.session) {
        showMessage(authStatus, 'Account created. Check your email to confirm your account.');
      }
    });
  });

  signOutButton.addEventListener('click', () => runAppAction(async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      throw error;
    }
  }));

  bindNavigation();
  bindIngredientForm();
  bindDishForm();
  bindDefaultValues();
  clearWeeklyPlanButton.addEventListener('click', clearWeeklyPlan);

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => handleAuthSession(session), 0);
  });

  await runAuthAction(async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      throw error;
    }
    await handleAuthSession(data.session);
  });
}

function updateThemeToggle() {
  const isDark = document.body.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  themeToggleIcon.textContent = isDark ? '☀' : '☾';
  themeToggleLabel.textContent = isDark ? 'Light mode' : 'Dark mode';
}

async function handleAuthSession(session) {
  if (!session) {
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    window.clearTimeout(sharedRefreshTimer);
    currentUserId = null;
    sharedOwnerId = null;
    Object.assign(state, {
      ingredients: [],
      dishes: [],
      plan: Object.fromEntries(dayNames.map((day) => [day, []])),
      shoppingChecks: {}
    });
    currentDishIngredients = [];
    appShell.hidden = true;
    authPanel.hidden = false;
    clearMessage(appStatus);
    return;
  }

  if (currentUserId === session.user.id) {
    return;
  }

  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  window.clearTimeout(sharedRefreshTimer);
  currentUserId = session.user.id;
  sharedOwnerId = null;
  authPanel.hidden = true;
  appShell.hidden = false;
  signedInUser.textContent = session.user.email || '';
  showMessage(appStatus, 'Loading your meal plan…');

  try {
    const loadedState = await loadUserState(session.user.id);
    if (currentUserId !== session.user.id) {
      return;
    }
    Object.assign(state, loadedState);
    renderAll();
    clearMessage(appStatus);
    subscribeToSharedUpdates();
  } catch (error) {
    if (currentUserId === session.user.id) {
      showMessage(appStatus, error.message, true);
    }
  }
}

function bindNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.section;
      navButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === target));
    });
  });
}

function bindDefaultValues() {
  resetIngredientButton.addEventListener('click', () => {
    ingredientForm.reset();
    ingredientIdInput.value = '';
    ingredientCategoryInput.value = 'Vegetable';
    ingredientUnitInput.value = 'kg';
    ingredientPriceInput.value = 0;
  });

  resetDishButton.addEventListener('click', () => {
    dishForm.reset();
    dishIdInput.value = '';
    currentDishIngredients = [];
    renderDishIngredientList();
    updateDishIngredientOptions();
  });

  dishSortSelect.addEventListener('change', renderDishes);

  addDishIngredientButton.addEventListener('click', () => {
    const ingredientId = dishIngredientSelect.value;
    const ingredient = findIngredientById(ingredientId);
    const quantity = Number(dishIngredientQuantityInput.value) || 0;

    if (!ingredient || quantity <= 0) {
      return;
    }

    const existing = currentDishIngredients.find((item) => item.ingredientId === ingredientId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      currentDishIngredients.push({ ingredientId, name: ingredient.name, quantity });
    }

    dishIngredientQuantityInput.value = 1;
    renderDishIngredientList();
  });
}

function bindIngredientForm() {
  ingredientForm.addEventListener('submit', (event) => runAppAction(async () => {
    event.preventDefault();

    const payload = {
      id: ingredientIdInput.value || crypto.randomUUID(),
      name: ingredientNameInput.value.trim(),
      category: ingredientCategoryInput.value,
      unit: ingredientUnitInput.value.trim() || 'unit',
      price: Number(ingredientPriceInput.value) || 0
    };

    if (!payload.name) {
      return;
    }

    const { error } = await supabaseClient.from('ingredients').upsert({
      ...payload,
      user_id: sharedOwnerId
    });
    if (error) {
      throw error;
    }

    const existingIndex = state.ingredients.findIndex((ingredient) => ingredient.id === payload.id);
    if (existingIndex >= 0) {
      state.ingredients[existingIndex] = payload;
    } else {
      state.ingredients.push(payload);
    }

    state.dishes.forEach((dish) => {
      dish.ingredients = dish.ingredients.map((ingredient) => {
        if (!ingredient.ingredientId) {
          return ingredient;
        }

        const match = state.ingredients.find((item) => item.id === ingredient.ingredientId);
        if (match) {
          ingredient.name = match.name;
        }
        return ingredient;
      });
    });

    renderAll();
    ingredientForm.reset();
    ingredientIdInput.value = '';
    ingredientCategoryInput.value = 'Vegetable';
    ingredientUnitInput.value = 'kg';
    ingredientPriceInput.value = 0;
  }));
}

function bindDishForm() {
  dishForm.addEventListener('submit', (event) => runAppAction(async () => {
    event.preventDefault();

    const name = dishNameInput.value.trim();
    if (!name || !currentDishIngredients.length) {
      return;
    }

    const previousDish = state.dishes.find((dish) => dish.id === dishIdInput.value);
    const payload = {
      id: dishIdInput.value || crypto.randomUUID(),
      name,
      dish_type: previousDish?.dish_type || '',
      servings: previousDish?.servings || 1,
      total_price: previousDish?.total_price ?? null,
      price_per_person: previousDish?.price_per_person ?? null,
      historical_times: previousDish?.historical_times || 0,
      rating: previousDish?.rating ?? null,
      source_of_recipe: previousDish?.source_of_recipe || '',
      recipe_notes: previousDish?.recipe_notes || '',
      future_food_projects: previousDish?.future_food_projects || '',
      main_ingredient: previousDish?.main_ingredient || '',
      ingredients: currentDishIngredients.map((item) => ({
        ingredientId: item.ingredientId,
        name: item.name,
        quantity: item.quantity
      }))
    };

    const { error } = await supabaseClient.rpc('save_dish', {
      p_dish_id: payload.id,
      p_name: payload.name,
      p_ingredients: payload.ingredients.map((ingredient) => ({
        ingredient_id: ingredient.ingredientId,
        quantity: ingredient.quantity
      }))
    });
    if (error) {
      throw error;
    }

    const index = state.dishes.findIndex((dish) => dish.id === payload.id);
    if (index >= 0) {
      state.dishes[index] = payload;
    } else {
      state.dishes.push(payload);
    }

    resetDishButton.click();
    renderAll();
  }));
}

function renderAll() {
  updateIngredientCategoryOptions();
  renderIngredients();
  renderDishes();
  renderPlanner();
  renderShoppingList();
  updateDishIngredientOptions();
}

function updateIngredientCategoryOptions() {
  const selectedCategory = ingredientCategoryInput.value;
  const categories = [...new Set([
    ...DEFAULT_INGREDIENT_CATEGORIES,
    ...state.ingredients.map((ingredient) => ingredient.category).filter(Boolean)
  ])];

  ingredientCategoryInput.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${getCategoryIcon(category)} ${escapeHtml(category)}</option>`)
    .join('');
  ingredientCategoryInput.value = categories.includes(selectedCategory)
    ? selectedCategory
    : 'Vegetable';
}

function renderIngredients() {
  ingredientTableBody.innerHTML = '';

  state.ingredients.forEach((ingredient) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(ingredient.name)}</td>
      <td>${renderCategoryBadge(ingredient.category)}</td>
      <td>${escapeHtml(ingredient.unit)}</td>
      <td>kr. ${Number(ingredient.price).toFixed(2)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="secondary icon-action" data-edit-ingredient="${ingredient.id}" aria-label="Edit ${escapeHtml(ingredient.name)}" title="Edit ${escapeHtml(ingredient.name)}">${renderActionIcon('edit')}</button>
          <button type="button" class="danger icon-action" data-remove-ingredient="${ingredient.id}" aria-label="Remove ${escapeHtml(ingredient.name)}" title="Remove ${escapeHtml(ingredient.name)}">${renderActionIcon('remove')}</button>
        </div>
      </td>
    `;

    ingredientTableBody.appendChild(row);
  });

  ingredientTableBody.querySelectorAll('[data-edit-ingredient]').forEach((button) => {
    button.addEventListener('click', () => populateIngredientForm(button.dataset.editIngredient));
  });

  ingredientTableBody.querySelectorAll('[data-remove-ingredient]').forEach((button) => {
    button.addEventListener('click', () => runAppAction(() => removeIngredient(button.dataset.removeIngredient)));
  });
}

function populateIngredientForm(id) {
  const ingredient = findIngredientById(id);
  if (!ingredient) {
    return;
  }

  ingredientIdInput.value = ingredient.id;
  ingredientNameInput.value = ingredient.name;
  ingredientCategoryInput.value = ingredient.category;
  ingredientUnitInput.value = ingredient.unit;
  ingredientPriceInput.value = ingredient.price;
  document.querySelector('.nav-btn[data-section="ingredients"]').click();
  ingredientNameInput.focus();
}

async function removeIngredient(id) {
  const { error } = await supabaseClient
    .from('ingredients')
    .delete()
    .eq('id', id);
  if (error) {
    throw error;
  }

  state.ingredients = state.ingredients.filter((ingredient) => ingredient.id !== id);

  state.dishes = state.dishes.map((dish) => ({
    ...dish,
    ingredients: dish.ingredients.filter((ingredient) => ingredient.ingredientId !== id)
  }));

  Object.keys(state.plan).forEach((day) => {
    state.plan[day] = state.plan[day].filter((dishId) => {
      const dish = state.dishes.find((item) => item.id === dishId);
      return Boolean(dish);
    });
  });

  renderAll();
}

function renderDishes() {
  dishTableBody.innerHTML = '';

  const sortMode = dishSortSelect.value;
  const weeklyCounts = getWeeklyDishCounts(true);
  const getRankingCount = (dish) => sortMode === 'week'
    ? weeklyCounts.get(dish.id) || 0
    : Number(dish.historical_times) || 0;
  const sortedDishes = [...state.dishes].sort((left, right) => {
    const leftIsLeftovers = isLeftoversDish(left);
    const rightIsLeftovers = isLeftoversDish(right);
    if (sortMode !== 'name' && leftIsLeftovers !== rightIsLeftovers) {
      return leftIsLeftovers ? 1 : -1;
    }
    if (sortMode !== 'name') {
      const countDifference = getRankingCount(right) - getRankingCount(left);
      if (countDifference) {
        return countDifference;
      }
    }
    return left.name.localeCompare(right.name);
  });
  let visibleRank = 0;

  sortedDishes.forEach((dish) => {
    const row = document.createElement('tr');
    const rating = Number(dish.rating) || 0;
    const ratingLabel = rating ? '★'.repeat(rating) : '';
    const rankingCount = getRankingCount(dish);
    const rankedDish = sortMode !== 'name' && rankingCount > 0 && !isLeftoversDish(dish);
    if (rankedDish) {
      visibleRank += 1;
    }
    const ranking = rankedDish
      ? `<span class="dish-rank" aria-label="${sortMode === 'week' ? 'This week' : 'Historical'} rank ${visibleRank}; ${rankingCount} ${rankingCount === 1 ? 'plan' : 'plans'}">#${visibleRank}<span>${rankingCount} ${rankingCount === 1 ? 'plan' : 'plans'}</span></span>`
      : '';
    row.innerHTML = `
      <td>
        <div class="dish-name-cell">
          <strong>${escapeHtml(dish.name)}</strong>
          ${ranking}
        </div>
        ${ratingLabel ? `<span class="dish-rating" aria-label="${rating} out of 5 stars">${ratingLabel}</span>` : ''}
      </td>
      <td>${dish.dish_type ? renderCategoryBadge(dish.dish_type) : '—'}</td>
      <td>${Number(dish.servings) || 1}</td>
      <td>${dish.total_price === null || dish.total_price === undefined ? '—' : `kr. ${Number(dish.total_price).toFixed(2)}`}</td>
      <td>${dish.ingredients.map((ingredient) => `${escapeHtml(ingredient.name || 'Ingredient')} (${Number(ingredient.quantity)})`).join(', ') || 'No ingredients yet'}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="secondary icon-action" data-edit-dish="${dish.id}" aria-label="Edit ${escapeHtml(dish.name)}" title="Edit ${escapeHtml(dish.name)}">${renderActionIcon('edit')}</button>
          <button type="button" class="danger icon-action" data-remove-dish="${dish.id}" aria-label="Remove ${escapeHtml(dish.name)}" title="Remove ${escapeHtml(dish.name)}">${renderActionIcon('remove')}</button>
        </div>
      </td>
    `;

    dishTableBody.appendChild(row);
  });

  dishTableBody.querySelectorAll('[data-edit-dish]').forEach((button) => {
    button.addEventListener('click', () => populateDishForm(button.dataset.editDish));
  });

  dishTableBody.querySelectorAll('[data-remove-dish]').forEach((button) => {
    button.addEventListener('click', () => runAppAction(() => removeDish(button.dataset.removeDish)));
  });
}

function populateDishForm(id) {
  const dish = state.dishes.find((item) => item.id === id);
  if (!dish) {
    return;
  }

  dishIdInput.value = dish.id;
  dishNameInput.value = dish.name;
  currentDishIngredients = dish.ingredients.map((ingredient) => ({
    ingredientId: ingredient.ingredientId,
    name: ingredient.name,
    quantity: ingredient.quantity
  }));
  renderDishIngredientList();
  document.querySelector('.nav-btn[data-section="dishes"]').click();
  dishNameInput.focus();
}

async function removeDish(id) {
  const { error } = await supabaseClient
    .from('dishes')
    .delete()
    .eq('id', id);
  if (error) {
    throw error;
  }

  state.dishes = state.dishes.filter((dish) => dish.id !== id);

  Object.keys(state.plan).forEach((day) => {
    state.plan[day] = state.plan[day].filter((dishId) => dishId !== id);
  });

  renderAll();
}

function renderDishIngredientList() {
  if (!currentDishIngredients.length) {
    dishIngredientList.innerHTML = '<li class="empty">No ingredients added yet</li>';
    return;
  }

  dishIngredientList.innerHTML = currentDishIngredients
    .map((item) => `
      <li>
        <span>${escapeHtml(item.name)} (${Number(item.quantity)})</span>
        <button type="button" class="remove-chip" data-remove-ingredient-from-dish="${escapeHtml(item.ingredientId || item.name)}">×</button>
      </li>
    `)
    .join('');

  dishIngredientList.querySelectorAll('[data-remove-ingredient-from-dish]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.removeIngredientFromDish;
      currentDishIngredients = currentDishIngredients.filter((item) => (item.ingredientId || item.name) !== value);
      renderDishIngredientList();
    });
  });
}

function updateDishIngredientOptions() {
  const options = state.ingredients
    .map((ingredient) => `<option value="${ingredient.id}">${escapeHtml(ingredient.name)}</option>`)
    .join('');

  dishIngredientSelect.innerHTML = `<option value="">Select an ingredient</option>${options}`;
  if (state.ingredients.length) {
    dishIngredientSelect.value = state.ingredients[0].id;
  }
}

function renderPlanner() {
  plannerGrid.innerHTML = '';
  const plannedMealCount = Object.values(state.plan).reduce((total, meals) => total + meals.length, 0);
  const plannedDayCount = dayNames.filter((day) => (state.plan[day] || []).length > 0).length;
  plannerKpi.innerHTML = `
    <span class="planner-kpi-icon" aria-hidden="true">🍽️</span>
    <span class="planner-kpi-label">Meals planned</span>
    <strong>${plannedMealCount}</strong>
    <span class="planner-kpi-note">${plannedDayCount} of 7 days planned</span>
  `;

  dayNames.forEach((day) => {
    const planWrapper = document.createElement('div');
    planWrapper.className = 'day-plan';

    const chosenMeals = state.plan[day] || [];
    const dishOptions = state.dishes
      .map((dish) => `<option value="${dish.id}">${escapeHtml(dish.name)}</option>`)
      .join('');

    planWrapper.innerHTML = `
      <h3>${day}</h3>
      <div class="day-controls">
        <select data-day-select="${day}">
          <option value="">Choose a dish</option>
          ${dishOptions}
        </select>
        <button type="button" class="secondary planner-icon-action" data-add-day-dish="${day}" aria-label="Add selected meal to ${day}" title="Add selected meal to ${day}">${renderActionIcon('add')}</button>
      </div>
      <ul class="chosen-meals">
        ${chosenMeals.length ? chosenMeals.map((dishId) => {
          const dish = state.dishes.find((item) => item.id === dishId);
          return `<li><span>${dish ? escapeHtml(dish.name) : 'Unknown dish'}</span><button type="button" class="danger planner-icon-action" data-remove-day-dish="${day}|${dishId}" aria-label="Remove ${dish ? escapeHtml(dish.name) : 'meal'} from ${day}" title="Remove meal">${renderActionIcon('remove')}</button></li>`;
        }).join('') : '<li class="empty">No meals planned</li>'}
      </ul>
    `;

    plannerGrid.appendChild(planWrapper);
  });

  plannerGrid.querySelectorAll('[data-add-day-dish]').forEach((button) => {
    button.addEventListener('click', () => runAppAction(async () => {
      const day = button.dataset.addDayDish;
      const select = plannerGrid.querySelector(`[data-day-select="${day}"]`);
      const dishId = select.value;
      if (!dishId) {
        return;
      }

      if (!state.plan[day]) {
        state.plan[day] = [];
      }

      if (!state.plan[day].includes(dishId)) {
        const { error } = await supabaseClient.from('meal_plan').upsert({
          user_id: sharedOwnerId,
          day,
          dish_id: dishId
        }, { onConflict: 'day,dish_id', ignoreDuplicates: true });
        if (error) {
          throw error;
        }
        state.plan[day].push(dishId);
      }

      renderPlanner();
      renderDishes();
      renderShoppingList();
    }));
  });

  plannerGrid.querySelectorAll('[data-remove-day-dish]').forEach((button) => {
    button.addEventListener('click', () => runAppAction(async () => {
      const [day, dishId] = button.dataset.removeDayDish.split('|');
      const { error } = await supabaseClient
        .from('meal_plan')
        .delete()
        .eq('day', day)
        .eq('dish_id', dishId);
      if (error) {
        throw error;
      }
      state.plan[day] = (state.plan[day] || []).filter((item) => item !== dishId);
      renderPlanner();
      renderDishes();
      renderShoppingList();
    }));
  });

  renderMealAnalytics();
}

function renderMealAnalytics() {
  const dishCounts = getWeeklyDishCounts(true);
  const dailyCounts = Object.fromEntries(dayNames.map((day) => [day, 0]));
  let plannedMealCount = 0;
  let plannedDayCount = 0;

  dayNames.forEach((day) => {
    const plannedDishes = (state.plan[day] || [])
      .filter((dishId) => !isLeftoversDish(state.dishes.find((dish) => dish.id === dishId)));
    if (plannedDishes.length) {
      plannedDayCount += 1;
    }
    dailyCounts[day] = plannedDishes.length;
    plannedMealCount += plannedDishes.length;
  });

  const weeklyRanking = [...dishCounts.entries()]
    .map(([dishId, count]) => ({
      dish: state.dishes.find((item) => item.id === dishId),
      count
    }))
    .filter((item) => item.dish)
    .sort((left, right) => right.count - left.count || left.dish.name.localeCompare(right.dish.name));
  const historicalRanking = state.dishes
    .map((dish) => ({ dish, count: Number(dish.historical_times) || 0 }))
    .filter((item) => item.count > 0 && !isLeftoversDish(item.dish))
    .sort((left, right) => right.count - left.count || left.dish.name.localeCompare(right.dish.name));
  const mostPlanned = historicalRanking[0];
  const totalHistoricalPlans = historicalRanking.reduce((sum, item) => sum + item.count, 0);

  renderWeeklyChart(dailyCounts);
  analyticsSummary.innerHTML = `
    <article class="analytics-stat">
      <span class="analytics-stat-icon" aria-hidden="true">▦</span>
      <span class="analytics-stat-label">Historical plans</span>
      <strong>${totalHistoricalPlans.toLocaleString()}</strong>
      <span class="analytics-stat-note">from your spreadsheet · leftovers excluded</span>
    </article>
    <article class="analytics-stat">
      <span class="analytics-stat-icon" aria-hidden="true">◷</span>
      <span class="analytics-stat-label">Meals this week</span>
      <strong>${plannedMealCount}</strong>
      <span class="analytics-stat-note">${plannedDayCount} ${plannedDayCount === 1 ? 'day' : 'days'} covered · leftovers excluded</span>
    </article>
    <article class="analytics-stat analytics-stat-featured">
      <span class="analytics-stat-icon" aria-hidden="true">★</span>
      <span class="analytics-stat-label">Most planned overall</span>
      <strong class="top-meal-name">${mostPlanned ? escapeHtml(mostPlanned.dish.name) : '—'}</strong>
      <span class="analytics-stat-note">${mostPlanned ? `${mostPlanned.count.toLocaleString()} ${mostPlanned.count === 1 ? 'plan' : 'plans'} in the spreadsheet` : 'No history in the spreadsheet'}</span>
    </article>
  `;

  renderMealRanking(historicalRanking, historicalRankingList, 'No historical meal counts were imported.');
  renderMealRanking(weeklyRanking, mealRanking, 'Your weekly ranking will appear when you plan a dish.');
}

function renderWeeklyChart(dailyCounts) {
  const highestCount = Math.max(1, ...Object.values(dailyCounts));
  weeklyChart.setAttribute(
    'aria-label',
    `Planned meals by day, excluding leftovers: ${dayNames.map((day) => `${day} ${dailyCounts[day]}`).join(', ')}`
  );
  weeklyChart.innerHTML = dayNames.map((day) => {
    const count = dailyCounts[day];
    const height = count ? Math.max(8, Math.round((count / highestCount) * 100)) : 4;
    return `
      <div class="weekly-chart-column">
        <strong class="weekly-chart-count">${count}</strong>
        <div class="weekly-chart-track">
          <span class="weekly-chart-bar" style="height: ${height}%" aria-hidden="true"></span>
        </div>
        <span class="weekly-chart-day">${escapeHtml(day.slice(0, 3))}</span>
      </div>
    `;
  }).join('');
}

function renderMealRanking(ranking, target, emptyMessage) {
  if (!ranking.length) {
    target.innerHTML = `<li class="analytics-empty">${escapeHtml(emptyMessage)}</li>`;
    return;
  }

  const highestCount = ranking[0].count;
  target.innerHTML = ranking.map(({ dish, count }, index) => {
    const barWidth = Math.round((count / highestCount) * 100);
    return `
      <li class="meal-ranking-row">
        <span class="rank-position">${String(index + 1).padStart(2, '0')}</span>
        <div class="rank-meal">
          <span class="rank-meal-name">${escapeHtml(dish.name)}</span>
          <span class="rank-bar" aria-hidden="true"><span style="width: ${barWidth}%"></span></span>
        </div>
        <span class="rank-count">${count.toLocaleString()}<small>${count === 1 ? 'plan' : 'plans'}</small></span>
      </li>
    `;
  }).join('');
}

function renderShoppingList() {
  const selectedDishIds = Object.values(state.plan).flat();
  const ingredientMap = new Map();

  selectedDishIds.forEach((dishId) => {
    const dish = state.dishes.find((item) => item.id === dishId);
    if (!dish) {
      return;
    }

    dish.ingredients.forEach((ingredientLine) => {
      const ingredient = findIngredientById(ingredientLine.ingredientId);
      const ingredientName = ingredient ? ingredient.name : ingredientLine.name;
      if (!ingredientName) {
        return;
      }

      const current = ingredientMap.get(ingredientName) || { name: ingredientName, quantity: 0, category: ingredient?.category || 'Other', unit: ingredient?.unit || 'unit', price: ingredient?.price || 0 };
      current.quantity += Number(ingredientLine.quantity) || 0;
      current.category = ingredient?.category || current.category;
      current.unit = ingredient?.unit || current.unit;
      current.price = ingredient?.price || current.price;
      ingredientMap.set(ingredientName, current);
    });
  });

  const categories = new Map();
  ingredientMap.forEach((value) => {
    if (!categories.has(value.category)) {
      categories.set(value.category, []);
    }
    categories.get(value.category).push(value);
  });

  const totalItems = [...ingredientMap.values()].reduce((sum, item) => sum + item.quantity, 0);
  const totalEstimatedCost = [...ingredientMap.values()].reduce((sum, item) => sum + item.quantity * item.price, 0);

  shoppingList.classList.toggle('two-row', categories.size > 2);
  if (categories.size > 2) {
    shoppingList.style.setProperty('--shopping-columns', Math.ceil(categories.size / 2));
  } else {
    shoppingList.style.removeProperty('--shopping-columns');
  }

  shoppingSummary.innerHTML = `
    <div class="summary-card">
      <span>Items</span>
      <strong>${totalItems.toFixed(1)}</strong>
    </div>
    <div class="summary-card">
      <span>Categories</span>
      <strong>${categories.size}</strong>
    </div>
    <div class="summary-card">
      <span>Estimated cost</span>
      <strong>kr. ${totalEstimatedCost.toFixed(2)}</strong>
    </div>
  `;

  if (!ingredientMap.size) {
    shoppingList.innerHTML = '<div class="empty">Add dishes to your weekly planner and your shopping list will appear here.</div>';
    return;
  }

  const groups = [...categories.entries()].map(([category, items]) => {
    const list = items
      .map((item) => {
        const key = `${category}|${item.name}`;
        const checked = Boolean(state.shoppingChecks[key]);
        return `
          <li class="shopping-item-row${checked ? ' is-checked' : ''}">
            <label class="shopping-item-check">
              <input type="checkbox" data-shopping-check="${escapeHtml(key)}" ${checked ? 'checked' : ''} />
              <span>${escapeHtml(item.name)}</span>
            </label>
            <strong>${item.quantity.toFixed(1)} ${escapeHtml(item.unit)}</strong>
          </li>
        `;
      })
      .join('');

    return `
      <div class="category-group">
        <h3>${renderCategoryBadge(category)}</h3>
        <ul>${list}</ul>
      </div>
    `;
  }).join('');

  shoppingList.innerHTML = groups;

  shoppingList.querySelectorAll('[data-shopping-check]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => runAppAction(async () => {
      const key = event.target.dataset.shoppingCheck;
      const checked = event.target.checked;
      event.target.closest('.shopping-item-row').classList.toggle('is-checked', checked);
      const { error } = await supabaseClient.from('shopping_checks').upsert({
        user_id: sharedOwnerId,
        check_key: key,
        checked
      }, { onConflict: 'check_key' });
      if (error) {
        throw error;
      }
      state.shoppingChecks[key] = checked;
    }));
  });
}

async function clearWeeklyPlan() {
  const confirmed = window.confirm(
    'Clear all planned meals and shopping-list checkmarks? Your dishes, ingredients, and historical rankings will be kept.'
  );
  if (!confirmed) {
    return;
  }

  await runAppAction(async () => {
    const { error: planError } = await supabaseClient
      .from('meal_plan')
      .delete()
      .neq('day', '');
    if (planError) {
      throw planError;
    }

    const { error: checksError } = await supabaseClient
      .from('shopping_checks')
      .delete()
      .neq('check_key', '');
    if (checksError) {
      throw checksError;
    }

    state.plan = Object.fromEntries(dayNames.map((day) => [day, []]));
    state.shoppingChecks = {};
    renderAll();
  });
}

function getWeeklyDishCounts(excludeLeftovers = false) {
  const counts = new Map();
  dayNames.forEach((day) => {
    (state.plan[day] || []).forEach((dishId) => {
      const dish = state.dishes.find((item) => item.id === dishId);
      if (dish && (!excludeLeftovers || !isLeftoversDish(dish))) {
        counts.set(dishId, (counts.get(dishId) || 0) + 1);
      }
    });
  });
  return counts;
}

function isLeftoversDish(dish) {
  return Boolean(dish && /^leftovers?$/i.test(dish.name.trim()));
}

function renderCategoryBadge(category) {
  const icon = getCategoryIcon(category);
  return `<span class="category-badge"><span aria-hidden="true">${icon}</span>${escapeHtml(category)}</span>`;
}

function renderActionIcon(action) {
  if (action === 'edit') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>';
  }
  if (action === 'add') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
}

function getCategoryIcon(category) {
  const normalized = String(category || '').trim().toLowerCase();
  const icons = {
    baby: '🍼',
    'can food': '🥫',
    'canned food': '🥫',
    'clean & toilettries': '🧼',
    'clean & toiletries': '🧼',
    cleaning: '🧼',
    dessert: '🍰',
    dressing: '🥗',
    drinks: '🥤',
    'fake meat': '🌱',
    fruit: '🍎',
    'fruit & veggies': '🥬',
    'frutas y verduras': '🥬',
    vegetable: '🥬',
    vegetables: '🥬',
    protein: '🍗',
    meat: '🍗',
    dairy: '🥛',
    lacteos: '🥛',
    bakery: '🥖',
    bread: '🥖',
    pantry: '🫙',
    frozen: '❄️',
    grains: '🍚',
    grain: '🍚',
    international: '🌍',
    legumes: '🫘',
    legums: '🫘',
    meds: '💊',
    misc: '🧺',
    other: '🛒',
    premade: '🍱',
    seeds: '🌻',
    snacks: '🍿',
    spices: '🧂',
    toppings: '✨'
  };
  return icons[normalized] || '🍽️';
}

function subscribeToSharedUpdates() {
  if (realtimeChannel) {
    supabaseClient.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabaseClient
    .channel('shared-meal-plan')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shopping_checks'
    }, (payload) => {
      const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
      if (!row?.check_key) {
        return;
      }
      if (payload.eventType === 'DELETE') {
        delete state.shoppingChecks[row.check_key];
      } else {
        state.shoppingChecks[row.check_key] = Boolean(row.checked);
      }
      renderShoppingList();
    });

  ['ingredients', 'dishes', 'dish_ingredients', 'meal_plan'].forEach((table) => {
    realtimeChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table
    }, scheduleSharedStateRefresh);
  });

  realtimeChannel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      liveSyncStatus.classList.add('connected');
      liveSyncStatus.innerHTML = '<span aria-hidden="true"></span>Live sync on';
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      liveSyncStatus.classList.remove('connected');
      liveSyncStatus.innerHTML = '<span aria-hidden="true"></span>Live sync unavailable';
      showMessage(appStatus, error?.message || 'Live updates are unavailable. Reload the page to reconnect.', true);
    } else if (status === 'CLOSED') {
      liveSyncStatus.classList.remove('connected');
      liveSyncStatus.innerHTML = '<span aria-hidden="true"></span>Live sync disconnected';
    }
  });
}

function scheduleSharedStateRefresh() {
  window.clearTimeout(sharedRefreshTimer);
  sharedRefreshTimer = window.setTimeout(async () => {
    const userId = currentUserId;
    if (!userId) {
      return;
    }
    try {
      const refreshedState = await loadUserState(userId, false);
      if (currentUserId !== userId) {
        return;
      }
      Object.assign(state, refreshedState);
      renderAll();
    } catch (error) {
      console.error('Could not reload shared meal plan changes:', error);
      showMessage(appStatus, error.message || String(error), true);
    }
  }, 160);
}

async function loadUserState(userId, initializeIfNeeded = true) {
  const membershipResult = await supabaseClient
    .from('household_members')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipResult.error) {
    throw membershipResult.error;
  }
  if (!membershipResult.data) {
    throw new Error('This account is not part of the shared meal plan. Ask the owner to add it in Supabase.');
  }

  const [ingredientsResult, dishesResult, linesResult, planResult, checksResult, settingsResult] = await Promise.all([
    supabaseClient.from('ingredients').select('id,name,category,unit,price').order('name'),
    supabaseClient.from('dishes').select('id,name,dish_type,servings,total_price,price_per_person,historical_times,rating,source_of_recipe,recipe_notes,future_food_projects,main_ingredient').order('name'),
    supabaseClient.from('dish_ingredients').select('dish_id,ingredient_id,quantity'),
    supabaseClient.from('meal_plan').select('day,dish_id'),
    supabaseClient.from('shopping_checks').select('check_key,checked'),
    supabaseClient.from('shared_settings').select('owner_id').eq('id', 1).maybeSingle()
  ]);
  const results = [ingredientsResult, dishesResult, linesResult, planResult, checksResult, settingsResult];
  const failedResult = results.find((result) => result.error);
  if (failedResult) {
    throw failedResult.error;
  }

  if (!settingsResult.data && initializeIfNeeded) {
    await seedStarterData(userId);
    return loadUserState(userId, false);
  }
  if (!settingsResult.data) {
    throw new Error('Supabase did not finish initializing this account. Reload the page to try again.');
  }
  sharedOwnerId = settingsResult.data.owner_id;

  const ingredients = ingredientsResult.data.map((ingredient) => ({
    ...ingredient,
    price: Number(ingredient.price)
  }));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const linesByDishId = new Map();
  linesResult.data.forEach((line) => {
    const lines = linesByDishId.get(line.dish_id) || [];
    const ingredient = ingredientById.get(line.ingredient_id);
    if (ingredient) {
      lines.push({
        ingredientId: line.ingredient_id,
        name: ingredient.name,
        quantity: Number(line.quantity)
      });
    }
    linesByDishId.set(line.dish_id, lines);
  });

  const plan = Object.fromEntries(dayNames.map((day) => [day, []]));
  planResult.data.forEach((item) => {
    if (plan[item.day]) {
      plan[item.day].push(item.dish_id);
    }
  });

  return {
    ingredients,
    dishes: dishesResult.data.map((dish) => ({
      ...dish,
      servings: Number(dish.servings) || 1,
      total_price: dish.total_price === null ? null : Number(dish.total_price),
      price_per_person: dish.price_per_person === null ? null : Number(dish.price_per_person),
      historical_times: Number(dish.historical_times) || 0,
      ingredients: linesByDishId.get(dish.id) || []
    })),
    plan,
    shoppingChecks: Object.fromEntries(
      checksResult.data.map((check) => [check.check_key, check.checked])
    )
  };
}

async function seedStarterData(userId) {
  const source = readLegacyState() || JSON.parse(JSON.stringify(defaultState));
  if (!Array.isArray(source.ingredients) || !Array.isArray(source.dishes)) {
    throw new Error('The saved browser meal plan has an invalid format and cannot be imported.');
  }

  const ingredientIds = new Map();
  const ingredientRows = source.ingredients.map((ingredient) => {
    const id = crypto.randomUUID();
    if (ingredient.id) {
      ingredientIds.set(ingredient.id, id);
    }
    return {
      id,
      user_id: userId,
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      price: Number(ingredient.price)
    };
  });
  const ingredientIdsByName = new Map(
    ingredientRows.map((ingredient) => [ingredient.name, ingredient.id])
  );
  const dishIds = new Map();
  const dishRows = source.dishes.map((dish) => {
    const id = crypto.randomUUID();
    if (dish.id) {
      dishIds.set(dish.id, id);
    }
    return { id, user_id: userId, name: dish.name };
  });
  const lineRows = source.dishes.flatMap((dish) => {
    const dishId = dishIds.get(dish.id);
    return dish.ingredients.map((line) => {
      const ingredientId = ingredientIds.get(line.ingredientId) || ingredientIdsByName.get(line.name);
      if (!dishId || !ingredientId || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) {
        throw new Error(`A recipe in "${dish.name}" could not be imported because its ingredient data is invalid.`);
      }
      return {
        dish_id: dishId,
        ingredient_id: ingredientId,
        quantity: Number(line.quantity)
      };
    });
  });
  const planRows = dayNames.flatMap((day) => (source.plan?.[day] || []).map((dishId) => {
    const mappedDishId = dishIds.get(dishId);
    if (!mappedDishId) {
      throw new Error(`A planned dish for ${day} could not be imported because it no longer exists.`);
    }
    return { day, dish_id: mappedDishId };
  }));
  const shoppingCheckRows = Object.entries(source.shoppingChecks || {}).map(([check_key, checked]) => ({
    check_key,
    checked: Boolean(checked)
  }));

  const { error } = await supabaseClient.rpc('initialize_meal_plan', {
    p_ingredients: ingredientRows,
    p_dishes: dishRows,
    p_dish_ingredients: lineRows,
    p_meal_plan: planRows,
    p_shopping_checks: shoppingCheckRows
  });
  if (error) {
    throw error;
  }
}

function readLegacyState() {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function runAppAction(action) {
  try {
    clearMessage(appStatus);
    await action();
  } catch (error) {
    console.error('Meal plan database operation failed:', error);
    const originalMessage = error.message || String(error);
    if (currentUserId) {
      try {
        const refreshedState = await loadUserState(currentUserId);
        Object.assign(state, refreshedState);
        renderAll();
      } catch (refreshError) {
        console.error('Could not reload meal plan data after the failed operation:', refreshError);
        showMessage(appStatus, `${originalMessage} Data refresh failed: ${refreshError.message || String(refreshError)}`, true);
        return;
      }
    }
    showMessage(appStatus, originalMessage, true);
  }
}

async function runAuthAction(action) {
  try {
    clearMessage(authStatus);
    await action();
  } catch (error) {
    console.error('Supabase authentication operation failed:', error);
    showMessage(authStatus, error.message || String(error), true);
  }
}

function showMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function clearMessage(element) {
  showMessage(element, '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function findIngredientById(id) {
  return state.ingredients.find((ingredient) => ingredient.id === id);
}
