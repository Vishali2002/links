// Tab switching functionality
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
}

// Load categories into select dropdown
function loadCategoryOptions() {
    // Add timestamp to prevent browser caching
    fetch('/api/categories?t=' + new Date().getTime())
        .then(res => res.json())
        .then(categories => {
            const select = document.getElementById('category');
            select.innerHTML = '<option value="">Select Category</option>';
            
            for (const categoryName in categories) {
                const option = document.createElement('option');
                option.value = categoryName;
                option.textContent = categoryName;
                select.appendChild(option);
            }
        })
        .catch(err => console.error('Error loading categories:', err));
}

// Display existing categories
function displayCategories() {
    // Add timestamp to prevent browser caching
    fetch('/api/categories?t=' + new Date().getTime())
        .then(res => res.json())
        .then(categories => {
            const container = document.getElementById('categoriesList');
            container.innerHTML = '';
            
            if (Object.keys(categories).length === 0) {
                container.innerHTML = '<p>No categories found.</p>';
                return;
            }
            
            for (const [name, data] of Object.entries(categories)) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-item';
                
                // Create icon preview (either image or text)
                let iconPreview;
                if (data.icon === 'text') {
                    // Text-based icon: show full category name
                    iconPreview = `<div class="text-icon-preview">${name.toUpperCase()}</div>`;
                } else {
                    iconPreview = `<img src="/images/${data.icon}" alt="${name}" class="category-icon-preview">`;
                }
                
                categoryDiv.innerHTML = `
                    <div class="category-info">
                        ${iconPreview}
                        <div class="category-details">
                            <strong>${name}</strong><br>
                            <small>URL: ${data.url}</small><br>
                            <small>Icon: ${data.icon === 'text' ? 'Text-based' : data.icon}</small>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button onclick="changeIcon('${name}')" class="edit-btn">Change Icon</button>
                        <button onclick="deleteCategory('${name}')" class="delete-btn">Delete</button>
                    </div>
                `;
                container.appendChild(categoryDiv);
            }
        })
        .catch(err => console.error('Error loading categories:', err));
}

// Add new category
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoryName = document.getElementById('new-category-name').value;
    const iconFile = document.getElementById('category-icon').files[0];
    
    const formData = new FormData();
    formData.append('category_name', categoryName);
    
    // Icon is now optional
    if (iconFile) {
        formData.append('icon', iconFile);
    }
    
    try {
        const response = await fetch('/api/categories/add', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(`Category "${categoryName}" added successfully! A new page has been created.`);
            document.getElementById('categoryForm').reset();
            displayCategories();
            loadCategoryOptions();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Error adding category: ' + error.message);
    }
});

// Change category icon
async function changeIcon(categoryName) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('category_name', categoryName);
        formData.append('icon', file);
        
        try {
            const response = await fetch('/api/categories/update-icon', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                alert('Icon updated successfully!');
                displayCategories();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            alert('Error updating icon: ' + error.message);
        }
    };
    
    input.click();
}

// Delete category
async function deleteCategory(categoryName) {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/categories/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_name: categoryName })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert('Category deleted successfully!');
            displayCategories();
            loadCategoryOptions();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        alert('Error deleting category: ' + error.message);
    }
}

// Load categories when page loads
if (document.getElementById('categoriesList')) {
    displayCategories();
    loadCategoryOptions();
}

// Admin dropdown toggle on click
document.addEventListener('DOMContentLoaded', function() {
    const adminDropdown = document.querySelector('.admin-dropdown');
    if (adminDropdown) {
        adminDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            adminDropdown.classList.remove('active');
        });
    }
});
