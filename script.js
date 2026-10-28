const STORAGE_KEY = 'meal-plan-v1';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

const state = loadState();

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
const shoppingList = document.getElementById('shopping-list');
const shoppingSummary = document.getElementById('shopping-summary');
const generateShoppingListButton = document.getElementById('generate-shopping-list');

let currentDishIngredients = [];

init();

function init() {
  bindNavigation();
  bindIngredientForm();
  bindDishForm();
  bindDefaultValues();
  renderAll();
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

  generateShoppingListButton.addEventListener('click', () => {
    renderShoppingList();
    document.querySelector('.nav-btn[data-section="shopping"]').click();
  });
}

function bindIngredientForm() {
  ingredientForm.addEventListener('submit', (event) => {
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

    saveState();
    renderAll();
    ingredientForm.reset();
    ingredientIdInput.value = '';
    ingredientCategoryInput.value = 'Vegetable';
    ingredientUnitInput.value = 'kg';
    ingredientPriceInput.value = 0;
  });
}

function bindDishForm() {
  dishForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = dishNameInput.value.trim();
    if (!name || !currentDishIngredients.length) {
      return;
    }

    const payload = {
      id: dishIdInput.value || crypto.randomUUID(),
      name,
      ingredients: currentDishIngredients.map((item) => ({
        ingredientId: item.ingredientId,
        name: item.name,
        quantity: item.quantity
      }))
    };

    const index = state.dishes.findIndex((dish) => dish.id === payload.id);
    if (index >= 0) {
      state.dishes[index] = payload;
    } else {
      state.dishes.push(payload);
    }

    saveState();
    resetDishButton.click();
    renderAll();
  });
}

function renderAll() {
  renderIngredients();
  renderDishes();
  renderPlanner();
  renderShoppingList();
  updateDishIngredientOptions();
}

function renderIngredients() {
  ingredientTableBody.innerHTML = '';

  state.ingredients.forEach((ingredient) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${ingredient.name}</td>
      <td>${ingredient.category}</td>
      <td>${ingredient.unit}</td>
      <td>€${Number(ingredient.price).toFixed(2)}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="secondary" data-edit-ingredient="${ingredient.id}">Edit</button>
          <button type="button" class="danger" data-remove-ingredient="${ingredient.id}">Remove</button>
        </div>
      </td>
    `;

    ingredientTableBody.appendChild(row);
  });

  ingredientTableBody.querySelectorAll('[data-edit-ingredient]').forEach((button) => {
    button.addEventListener('click', () => populateIngredientForm(button.dataset.editIngredient));
  });

  ingredientTableBody.querySelectorAll('[data-remove-ingredient]').forEach((button) => {
    button.addEventListener('click', () => removeIngredient(button.dataset.removeIngredient));
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

function removeIngredient(id) {
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

  saveState();
  renderAll();
}

function renderDishes() {
  dishTableBody.innerHTML = '';

  state.dishes.forEach((dish) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${dish.name}</td>
      <td>${dish.ingredients.map((ingredient) => `${ingredient.name || 'Ingredient'} (${ingredient.quantity})`).join(', ') || 'No ingredients yet'}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="secondary" data-edit-dish="${dish.id}">Edit</button>
          <button type="button" class="danger" data-remove-dish="${dish.id}">Remove</button>
        </div>
      </td>
    `;

    dishTableBody.appendChild(row);
  });

  dishTableBody.querySelectorAll('[data-edit-dish]').forEach((button) => {
    button.addEventListener('click', () => populateDishForm(button.dataset.editDish));
  });

  dishTableBody.querySelectorAll('[data-remove-dish]').forEach((button) => {
    button.addEventListener('click', () => removeDish(button.dataset.removeDish));
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

function removeDish(id) {
  state.dishes = state.dishes.filter((dish) => dish.id !== id);

  Object.keys(state.plan).forEach((day) => {
    state.plan[day] = state.plan[day].filter((dishId) => dishId !== id);
  });

  saveState();
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
        <span>${item.name} (${item.quantity})</span>
        <button type="button" class="remove-chip" data-remove-ingredient-from-dish="${item.ingredientId || item.name}">×</button>
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
    .map((ingredient) => `<option value="${ingredient.id}">${ingredient.name}</option>`)
    .join('');

  dishIngredientSelect.innerHTML = `<option value="">Select an ingredient</option>${options}`;
  if (state.ingredients.length) {
    dishIngredientSelect.value = state.ingredients[0].id;
  }
}

function renderPlanner() {
  plannerGrid.innerHTML = '';

  dayNames.forEach((day) => {
    const planWrapper = document.createElement('div');
    planWrapper.className = 'day-plan';

    const chosenMeals = state.plan[day] || [];
    const dishOptions = state.dishes
      .map((dish) => `<option value="${dish.id}">${dish.name}</option>`)
      .join('');

    planWrapper.innerHTML = `
      <h3>${day}</h3>
      <div class="day-controls">
        <select data-day-select="${day}">
          <option value="">Choose a dish</option>
          ${dishOptions}
        </select>
        <button type="button" class="secondary" data-add-day-dish="${day}">Add</button>
      </div>
      <ul class="chosen-meals">
        ${chosenMeals.length ? chosenMeals.map((dishId) => {
          const dish = state.dishes.find((item) => item.id === dishId);
          return `<li><span>${dish ? dish.name : 'Unknown dish'}</span><button type="button" class="danger" data-remove-day-dish="${day}|${dishId}">Remove</button></li>`;
        }).join('') : '<li class="empty">No meals planned</li>'}
      </ul>
    `;

    plannerGrid.appendChild(planWrapper);
  });

  plannerGrid.querySelectorAll('[data-add-day-dish]').forEach((button) => {
    button.addEventListener('click', () => {
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
        state.plan[day].push(dishId);
      }

      saveState();
      renderPlanner();
    });
  });

  plannerGrid.querySelectorAll('[data-remove-day-dish]').forEach((button) => {
    button.addEventListener('click', () => {
      const [day, dishId] = button.dataset.removeDayDish.split('|');
      state.plan[day] = (state.plan[day] || []).filter((item) => item !== dishId);
      saveState();
      renderPlanner();
    });
  });
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
      <strong>€${totalEstimatedCost.toFixed(2)}</strong>
    </div>
  `;

  if (!ingredientMap.size) {
    shoppingList.innerHTML = '<div class="empty">Add dishes to your weekly planner to generate a shopping list.</div>';
    return;
  }

  const groups = [...categories.entries()].map(([category, items]) => {
    const list = items
      .map((item) => {
        const key = `${category}|${item.name}`;
        const checked = Boolean(state.shoppingChecks[key]);
        return `
          <li>
            <label class="shopping-item-check">
              <input type="checkbox" data-shopping-check="${key}" ${checked ? 'checked' : ''} />
              <span>${item.name}</span>
            </label>
            <strong>${item.quantity.toFixed(1)} ${item.unit}</strong>
          </li>
        `;
      })
      .join('');

    return `
      <div class="category-group">
        <h3>${category}</h3>
        <ul>${list}</ul>
      </div>
    `;
  }).join('');

  shoppingList.innerHTML = groups;

  shoppingList.querySelectorAll('[data-shopping-check]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const key = event.target.dataset.shoppingCheck;
      state.shoppingChecks[key] = event.target.checked;
      saveState();
    });
  });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initialized = JSON.parse(JSON.stringify(defaultState));
    initialized.ingredients.forEach((ingredient) => {
      ingredient.id = crypto.randomUUID();
    });
    initialized.dishes.forEach((dish) => {
      dish.id = crypto.randomUUID();
      dish.ingredients = dish.ingredients.map((ingredient) => {
        const match = initialized.ingredients.find((item) => item.name === ingredient.name);
        return {
          ingredientId: match ? match.id : null,
          name: ingredient.name,
          quantity: ingredient.quantity
        };
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialized));
    return initialized;
  }

  try {
    const parsed = JSON.parse(raw);
    parsed.shoppingChecks = parsed.shoppingChecks || {};
    return parsed;
  } catch (error) {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function findIngredientById(id) {
  return state.ingredients.find((ingredient) => ingredient.id === id);
}
