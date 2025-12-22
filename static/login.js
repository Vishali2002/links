document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        // Demo: hardcoded username/password
        if(username === 'admin' && password === 'admin123') {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('main-content').style.display = '';
            // Hide home button and show logout button when logged in
            document.getElementById('home-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
        } else {
            errorDiv.textContent = 'Invalid username or password!';
            errorDiv.style.display = 'block';
        }
    });

// Admin dropdown toggle
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (e.target.closest('.dropdown-content')) return;
            this.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.admin-dropdown')) {
                logoutBtn.classList.remove('active');
            }
        });
    }
});