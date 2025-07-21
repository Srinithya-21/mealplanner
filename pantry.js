document.addEventListener('DOMContentLoaded', () => {
    // Initialize elements
    const addItemBtn = document.getElementById('add-item-btn');
    const addFirstItemBtn = document.getElementById('add-first-item');
    const addItemModal = document.getElementById('add-item-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    const addItemForm = document.getElementById('add-item-form');
    const pantryItemsContainer = document.getElementById('pantry-items-container');
    const pantrySearch = document.getElementById('pantry-search');
    const categoryFilter = document.getElementById('category-filter');

    // Open modal for adding first item
    if (addFirstItemBtn) {
        addFirstItemBtn.addEventListener('click', () => {
            addItemForm.reset();
            addItemForm.dataset.mode = 'add';
            document.querySelector('#add-item-modal h2').textContent = 'Add New Pantry Item';
            openModal(addItemModal);
        });
    }

    // Open modal for adding item
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => {
            addItemForm.reset();
            addItemForm.dataset.mode = 'add';
            document.querySelector('#add-item-modal h2').textContent = 'Add New Pantry Item';
            openModal(addItemModal);
        });
    }

    // Close modal
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(addItemModal);
        });
    });

    // Load pantry items
    loadPantryItems();

    // Search and filter functionality
    pantrySearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        const category = categoryFilter.value;
        loadPantryItems(searchTerm, category);
    });

    categoryFilter.addEventListener('change', (e) => {
        const searchTerm = pantrySearch.value.trim();
        const category = e.target.value;
        loadPantryItems(searchTerm, category);
    });

    // Form submission
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = addItemForm.dataset.mode;
        const name = document.getElementById('item-name').value.trim();
        const quantity = document.getElementById('item-quantity').value.trim();
        const category = document.getElementById('item-category').value;
        const expiry = document.getElementById('item-expiry').value;

        if (!name) {
            alert('Please enter an item name');
            return;
        }

        try {
            if (mode === 'add') {
                // Add new item
                const { data, error } = await supabase
                    .from('pantry_items')
                    .insert([{ 
                        name, 
                        quantity: quantity || null, 
                        category: category || null, 
                        expiry_date: expiry || null 
                    }]);

                if (error) throw error;
            } else {
                // Update existing item (would implement if we had edit functionality)
                const itemId = addItemForm.dataset.itemId;
                const { data, error } = await supabase
                    .from('pantry_items')
                    .update({ 
                        name, 
                        quantity: quantity || null, 
                        category: category || null, 
                        expiry_date: expiry || null 
                    })
                    .eq('id', itemId);

                if (error) throw error;
            }

            // Clear form
            addItemForm.reset();
            
            // Close modal
            closeModal(addItemModal);
            
            // Reload items
            loadPantryItems(pantrySearch.value.trim(), categoryFilter.value);
        } catch (error) {
            console.error('Error saving pantry item:', error.message);
            alert('Error saving pantry item. Please try again.');
        }
    });
});

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

        const pantryItemsContainer = document.getElementById('pantry-items-container');
        pantryItemsContainer.innerHTML = '';

        if (items.length === 0) {
            pantryItemsContainer.innerHTML = `
                <div class="empty-state">
                    <img src="assets/pantry-empty.svg" alt="Empty pantry" class="empty-icon">
                    <h3>No items found</h3>
                    <p>Try adjusting your search or add a new item</p>
                    <button id="add-first-item" class="btn btn-primary">Add Item</button>
                </div>
            `;
            
            document.getElementById('add-first-item').addEventListener('click', () => {
                document.getElementById('add-item-form').reset();
                document.getElementById('add-item-form').dataset.mode = 'add';
                document.querySelector('#add-item-modal h2').textContent = 'Add New Pantry Item';
                openModal(document.getElementById('add-item-modal'));
            });
            
            return;
        }

        items.forEach(item => {
            const itemElement = createPantryItemElement(item);
            pantryItemsContainer.appendChild(itemElement);
        });
    } catch (error) {
        console.error('Error loading pantry items:', error.message);
        document.getElementById('pantry-items-container').innerHTML = `
            <div class="empty-state">
                <img src="assets/error.svg" alt="Error" class="empty-icon">
                <h3>Error loading pantry items</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Create pantry item element
function createPantryItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'pantry-item';
    itemElement.dataset.id = item.id;

    // Calculate expiry status
    let expiryStatus = '';
    if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            expiryStatus = `<p class="item-expiry expiry-expired">Expired on ${expiryDate.toLocaleDateString()}</p>`;
        } else if (diffDays <= 7) {
            expiryStatus = `<p class="item-expiry expiry-soon">Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''} (${expiryDate.toLocaleDateString()})</p>`;
        } else {
            expiryStatus = `<p class="item-expiry">Expires on ${expiryDate.toLocaleDateString()}</p>`;
        }
    }

    itemElement.innerHTML = `
        <h3>${item.name}</h3>
        ${item.category ? `<span class="item-category">${item.category}</span>` : ''}
        ${item.quantity ? `<p class="item-quantity">Quantity: ${item.quantity}</p>` : ''}
        ${expiryStatus}
        <div class="item-actions">
            <button class="btn btn-secondary" onclick="editPantryItem('${item.id}')">Edit</button>
            <button class="btn btn-danger" onclick="deletePantryItem('${item.id}')">Delete</button>
        </div>
    `;

    return itemElement;
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

        const searchTerm = document.getElementById('pantry-search').value.trim();
        const category = document.getElementById('category-filter').value;
        loadPantryItems(searchTerm, category);
    } catch (error) {
        console.error('Error deleting pantry item:', error.message);
        alert('Error deleting item. Please try again.');
    }
}

// Edit pantry item (placeholder)
function editPantryItem(itemId) {
    // In a complete implementation, this would load the item data into the form
    alert('Edit functionality would be implemented here for item ' + itemId);
    // For now, we'll just show how to delete items
}

// Modal functions
function openModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
