const API = 'https://answub-back.onrender.com/api';

function showRegister() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showLogin() {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function register() {
    const inviteCode = document.getElementById('register-invite').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (!inviteCode || !username || !email || !password) {
        alert('All fields are required, including invite code');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, inviteCode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('astreon_token', data.token);
            localStorage.setItem('astreon_user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Connection error. Server may be offline.');
    }
}

async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('Username and password required');
        return;
    }
    
    try {
        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('astreon_token', data.token);
            localStorage.setItem('astreon_user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Connection error. Server may be offline.');
    }
}

// Clear any keys from localStorage (security)
function clearLocalKeys() {
    // Remove any keys that might be stored locally
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('key') && key !== 'astreon_token' && key !== 'astreon_user') {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    // Clear any local keys (security measure)
    clearLocalKeys();
    
    // Check if already logged in
    const token = localStorage.getItem('astreon_token');
    if (token) {
        // Verify token is still valid before redirecting
        fetch(`${API}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                // Invalid token, clear it
                localStorage.removeItem('astreon_token');
                localStorage.removeItem('astreon_user');
            }
        })
        .catch(() => {
            // Connection error, just stay on login page
        });
    }
    
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('register-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });
});

