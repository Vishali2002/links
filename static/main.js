// Dynamically load categories from the server
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        // Add hardcoded Atlassian categories
        categories['Atlassian Cloud'] = {
            icon: 'Atlassian_cloud.png',
            url: '/cloud'
        };
        categories['Atlassian Server'] = {
            icon: 'Atlassian_server.png',
            url: '/server'
        };
        
        const container = document.getElementById('tools');
        container.innerHTML = '';
        
        // Convert categories object to array and split into rows of 3
        const categoryArray = Object.entries(categories);
        const rowSize = 3;
        
        for (let i = 0; i < categoryArray.length; i += rowSize) {
            const row = document.createElement('div');
            row.className = 'logo-row';
            
            const rowCategories = categoryArray.slice(i, i + rowSize);
            
            rowCategories.forEach(([name, data]) => {
                const link = document.createElement('a');
                link.href = data.url;
                
                if (data.icon === 'text') {
                    // Create text-based icon - show full category name
                    const textIcon = document.createElement('div');
                    textIcon.className = 'text-icon';
                    textIcon.textContent = name.toUpperCase();
                    link.appendChild(textIcon);
                } else {
                    // Create image icon
                    const img = document.createElement('img');
                    img.src = `/images/${data.icon}`;
                    img.alt = name;
                    img.onerror = function() {
                        this.src = '/images/placeholder.svg';
                    };
                    link.appendChild(img);
                }
                
                row.appendChild(link);
            });
            
            container.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('tools').innerHTML = '<p style="color: red;">Error loading categories</p>';
    }
}

// Load categories when page loads
document.addEventListener('DOMContentLoaded', loadCategories);

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
