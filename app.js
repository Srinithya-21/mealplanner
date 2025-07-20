// Initialize Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const pantryTab = document.getElementById('pantry');
const plannerTab = document.getElementById('planner');
const navBtns = document.querySelectorAll('.nav-btn');

// Pantry Elements
const pantryNameInput = document.getElementById('pantry-name');
const pantryQuantityInput = document.getElementById('pantry-quantity');
const pantryCategorySelect = document.getElementById('pantry-category');
const pantryExpiryInput = document.getElementById('pantry-expiry');
const addPantryBtn = document.getElementById('add-pantry-item');
const pantryItemsList = document.getElementById('pantry-items-list');
const categoryFilter = document.getElementById('category-filter');
const searchPantryInput = document.getElementById('search-pantry');

// Meal Planner Elements
const planDaySelect = document.getElementById('plan-day');
const planMealTypeSelect = document.getElementById('plan-meal-type');
const planRecipeInput = document.getElementById('plan-recipe');
const planIngredientsInput = document.getElementById('plan-ingredients');
const planNotesInput = document.getElementById('plan-notes');
const addMealPlanBtn = document.getElementById('add-meal-plan');
const mealPlansList = document.getElementById('meal-plans-list');

// Tab Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and tabs
        navBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked button and corresponding tab
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // Load data for the active tab
        if (tabId === 'pantry') {
            loadPantryItems();
        } else if (tabId === 'planner') {
            loadMealPlans();
        }
    });
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadPantryItems();
    loadMealPlans();
    setupCategoryFilter();
});

// ====================
// PANTRY FUNCTIONALITY
// ====================

// Load pantry items from Supabase
async function loadPantryItems(searchTerm = '', category = '') {
    try {
        let query = supabase
            .from('pantry_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchTerm) {
            query = query.ilike('name', `%${searchTerm}%`);
        }

        if (category) {
            query = query.eq('category', category);
        }

        const { data: items, error } = await query;

        if (error) throw error;

        pantryItemsList.innerHTML = '';

        if (items.length === 0) {
            pantryItemsList.innerHTML = '<p>No pantry items found. Add your first item!</p>';
            return;
        }

        items.forEach(item => {
            const itemElement = createPantryItemElement(item);
            pantryItemsList.appendChild(itemElement);
        });
    } catch (error) {
        console.error('Error loading pantry items:', error.message);
        pantryItemsList.innerHTML = '<p>Error loading pantry items. Please try again.</p>';
    }
}

// Create HTML element for a pantry item
function createPantryItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'item-card';
    itemElement.dataset.id = item.id;

    // Calculate expiry status
    let expiryStatus = '';
    if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            expiryStatus = '<div class="expiry expired">Expired</div>';
        } else if (diffDays <= 7) {
            expiryStatus = `<div class="expiry soon">Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}</div>`;
        } else {
            expiryStatus = `<div class="expiry">Expires on ${expiryDate.toDateString()}</div>`;
        }
    }

    itemElement.innerHTML = `
        <h3>${item.name}</h3>
        <span class="category">${item.category || 'Uncategorized'}</span>
        <p>Quantity: ${item.quantity || 'Not specified'}</p>
        ${expiryStatus}
        <div class="actions">
            <button class="action-btn edit-btn" onclick="editPantryItem('${item.id}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deletePantryItem('${item.id}')">Delete</button>
        </div>
    `;

    return itemElement;
}

// Add new pantry item
async function addPantryItem() {
    const name = pantryNameInput.value.trim();
    const quantity = pantryQuantityInput.value.trim();
    const category = pantryCategorySelect.value;
    const expiry = pantryExpiryInput.value;

    if (!name) {
        alert('Please enter an item name');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('pantry_items')
            .insert([{ 
                name, 
                quantity, 
                category: category || null, 
                expiry_date: expiry || null 
            }]);

        if (error) throw error;

        // Clear form
        pantryNameInput.value = '';
        pantryQuantityInput.value = '';
        pantryCategorySelect.value = '';
        pantryExpiryInput.value = '';

        // Reload items
        loadPantryItems();
    } catch (error) {
        console.error('Error adding pantry item:', error.message);
        alert('Error adding pantry item. Please try again.');
    }
}

// Edit pantry item (placeholder - you would implement a modal or edit form)
function editPantryItem(itemId) {
    // In a real app, you would show a form to edit the item
    alert(`Edit functionality for item ${itemId} would go here`);
}

// Delete pantry item
async function deletePantryItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const { error } = await supabase
            .from('pantry_items')
            .delete()
            .eq('id', itemId);

        if (error) throw error;

        loadPantryItems();
    } catch (error) {
        console.error('Error deleting pantry item:', error.message);
        alert('Error deleting pantry item. Please try again.');
    }
}

// Set up category filter dropdown
async function setupCategoryFilter() {
    try {
        const { data: categories, error } = await supabase
            .from('pantry_items')
            .select('category')
            .not('category', 'is', null)
            .order('category', { ascending: true });

        if (error) throw error;

        // Get unique categories
        const uniqueCategories = [...new Set(categories.map(item => item.category))];

        // Add categories to filter dropdown
        uniqueCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error.message);
    }
}

// ======================
// MEAL PLANNER FUNCTIONALITY
// ======================

// Load meal plans from Supabase
async function loadMealPlans() {
    try {
        const { data: plans, error } = await supabase
            .from('meal_plans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        mealPlansList.innerHTML = '';

        if (plans.length === 0) {
            mealPlansList.innerHTML = '<p>No meal plans found. Add your first plan!</p>';
            return;
        }

        plans.forEach(plan => {
            const planElement = createMealPlanElement(plan);
            mealPlansList.appendChild(planElement);
        });
    } catch (error) {
        console.error('Error loading meal plans:', error.message);
        mealPlansList.innerHTML = '<p>Error loading meal plans. Please try again.</p>';
    }
}

// Create HTML element for a meal plan
function createMealPlanElement(plan) {
    const planElement = document.createElement('div');
    planElement.className = 'meal-plan-card';
    planElement.dataset.id = plan.id;

    // Format ingredients as list
    const ingredientsList = plan.ingredients 
        ? plan.ingredients.split(',').map(ing => `<li>${ing.trim()}</li>`).join('')
        : '<li>No ingredients specified</li>';

    planElement.innerHTML = `
        <div class="header">
            <span class="day-meal">${plan.day} • ${plan.meal_type}</span>
            <div class="actions">
                <button class="action-btn edit-btn" onclick="editMealPlan('${plan.id}')">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteMealPlan('${plan.id}')">Delete</button>
            </div>
        </div>
        <h3 class="recipe">${plan.recipe_name}</h3>
        <ul class="ingredients">${ingredientsList}</ul>
        ${plan.notes ? `<div class="notes">${plan.notes}</div>` : ''}
    `;

    return planElement;
}

// Add new meal plan
async function addMealPlan() {
    const day = planDaySelect.value;
    const mealType = planMealTypeSelect.value;
    const recipeName = planRecipeInput.value.trim();
    const ingredients = planIngredientsInput.value.trim();
    const notes = planNotesInput.value.trim();

    if (!day || !mealType || !recipeName) {
        alert('Please fill in all required fields (day, meal type, and recipe name)');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('meal_plans')
            .insert([{ 
                day, 
                meal_type: mealType, 
                recipe_name: recipeName, 
                ingredients: ingredients || null, 
                notes: notes || null 
            }]);

        if (error) throw error;

        // Clear form
        planDaySelect.value = '';
        planMealTypeSelect.value = '';
        planRecipeInput.value = '';
        planIngredientsInput.value = '';
        planNotesInput.value = '';

        // Reload plans
        loadMealPlans();
    } catch (error) {
        console.error('Error adding meal plan:', error.message);
        alert('Error adding meal plan. Please try again.');
    }
}

// Edit meal plan (placeholder)
function editMealPlan(planId) {
    // In a real app, you would show a form to edit the plan
    alert(`Edit functionality for plan ${planId} would go here`);
}

// Delete meal plan
async function deleteMealPlan(planId) {
    if (!confirm('Are you sure you want to delete this meal plan?')) return;

    try {
        const { error } = await supabase
            .from('meal_plans')
            .delete()
            .eq('id', planId);

        if (error) throw error;

        loadMealPlans();
    } catch (error) {
        console.error('Error deleting meal plan:', error.message);
        alert('Error deleting meal plan. Please try again.');
    }
}

// ======================
// EVENT LISTENERS
// ======================

// Pantry event listeners
addPantryBtn.addEventListener('click', addPantryItem);
categoryFilter.addEventListener('change', (e) => {
    loadPantryItems(searchPantryInput.value.trim(), e.target.value);
});
searchPantryInput.addEventListener('input', (e) => {
    loadPantryItems(e.target.value.trim(), categoryFilter.value);
});

// Meal planner event listeners
addMealPlanBtn.addEventListener('click', addMealPlan);
