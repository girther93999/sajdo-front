const API = 'https://answub-back.onrender.com/api';

let currentModalKey = '';
let currentToken = '';
let currentUser = null;

// Security: Clear any keys from localStorage
function clearLocalKeys() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('key') && key !== 'astreon_token' && key !== 'astreon_user') {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Check authentication
async function checkAuth() {
    // Clear any local keys on page load (security)
    clearLocalKeys();
    
    currentToken = localStorage.getItem('astreon_token');
    const userStr = localStorage.getItem('astreon_user');
    
    if (!currentToken || !userStr) {
        // No auth, redirect to login
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userStr);
    } catch (e) {
        // Invalid user data
        localStorage.removeItem('astreon_token');
        localStorage.removeItem('astreon_user');
        window.location.href = 'index.html';
        return false;
    }
    
    // Verify token is still valid
    try {
        const response = await fetch(`${API}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            logout();
            return false;
        }
        
        document.getElementById('username-display').textContent = currentUser.username;
        
        // Display account credentials
        document.getElementById('account-id').textContent = currentUser.id;
        document.getElementById('api-token').textContent = currentToken;
        document.getElementById('account-username').textContent = currentUser.username;
        
        // Update code examples
        const codeAccountId = document.getElementById('code-account-id');
        const codeApiToken = document.getElementById('code-api-token');
        if (codeAccountId) codeAccountId.textContent = currentUser.id;
        if (codeApiToken) codeApiToken.textContent = currentToken;
        
        // Update examples tab
        const exampleAccountId = document.getElementById('example-account-id');
        const exampleApiToken = document.getElementById('example-api-token');
        if (exampleAccountId) exampleAccountId.textContent = currentUser.id;
        if (exampleApiToken) exampleApiToken.textContent = currentToken;
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

function logout() {
    // Clear all auth data and any cached keys
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// Toggle amount input based on duration
document.getElementById('duration')?.addEventListener('change', function() {
    const amountGroup = document.getElementById('amount-group');
    if (this.value === 'lifetime') {
        amountGroup.style.display = 'none';
    } else {
        amountGroup.style.display = 'block';
    }
});

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API}/keys/stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('stat-total').textContent = data.stats.total;
            document.getElementById('stat-active').textContent = data.stats.active;
            document.getElementById('stat-used').textContent = data.stats.used;
            document.getElementById('stat-expired').textContent = data.stats.expired;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Generate key
async function generateKey() {
    const format = document.getElementById('format').value;
    const duration = document.getElementById('duration').value;
    const amount = document.getElementById('amount').value;
    
    if (!format || !format.includes('*')) {
        alert('Format must include at least one * for random characters');
        return;
    }
    
    try {
        const response = await fetch(`${API}/keys/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken, format, duration, amount })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('generated-key').textContent = data.key;
            document.getElementById('generated-result').style.display = 'block';
            
            let info = `Duration: ${duration === 'lifetime' ? 'Lifetime' : `${amount} ${duration}(s)`}`;
            if (data.data.expiresAt) {
                info += ` | Expires: ${new Date(data.data.expiresAt).toLocaleString()}`;
            }
            document.getElementById('key-info').textContent = info;
            
            loadKeys();
            loadStats();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Connection error. Make sure server is running.');
    }
}

// Copy key to clipboard
function copyKey() {
    const key = document.getElementById('generated-key').textContent;
    navigator.clipboard.writeText(key).then(() => {
        alert('Key copied!');
    });
}

// Copy credential to clipboard
function copyCredential(elementId) {
    const value = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(value).then(() => {
        alert('Copied to clipboard!');
    });
}

// Load all keys
async function loadKeys() {
    try {
        const response = await fetch(`${API}/keys/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('keys-table');
            tbody.innerHTML = '';
            
            if (data.keys.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="loading">No keys generated yet</td></tr>';
                return;
            }
            
            const sortedKeys = data.keys.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            sortedKeys.forEach(key => {
                const tr = document.createElement('tr');
                
                let status = 'Active';
                let statusClass = 'status-active';
                
                if (key.expiresAt) {
                    const expiry = new Date(key.expiresAt);
                    if (expiry < new Date()) {
                        status = 'Expired';
                        statusClass = 'status-expired';
                    }
                }
                
                if (key.usedBy) {
                    status = 'Used';
                    statusClass = 'status-used';
                }
                
                const expiryText = key.expiresAt 
                    ? new Date(key.expiresAt).toLocaleString() 
                    : 'Never';
                
                const ip = key.ip || '-';
                const lastCheck = key.lastCheck 
                    ? new Date(key.lastCheck).toLocaleString() 
                    : '-';
                
                // HWID Lock display
                let hwidDisplay = '';
                if (key.hwid) {
                    hwidDisplay = `
                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                            <code style="font-size: 0.75rem;">${key.hwid}</code>
                            <span class="status status-used" style="font-size: 0.65rem;"><i class="fas fa-lock"></i> Locked</span>
                        </div>
                    `;
                } else {
                    hwidDisplay = '<span class="status status-active" style="font-size: 0.75rem;"><i class="fas fa-unlock"></i> Not Locked</span>';
                }
                
                tr.innerHTML = `
                    <td><code>${key.key}</code></td>
                    <td><span class="status ${statusClass}">${status}</span></td>
                    <td>${expiryText}</td>
                    <td>${hwidDisplay}</td>
                    <td>${ip}</td>
                    <td>${new Date(key.createdAt).toLocaleString()}</td>
                    <td>${lastCheck}</td>
                    <td>
                        <div class="actions">
                            <button class="btn btn-action" onclick="openAddTimeModal('${key.key}')"><i class="fas fa-clock"></i> Add Time</button>
                            <button class="btn btn-action" onclick="resetHWID('${key.key}')" ${!key.hwid ? 'disabled' : ''}><i class="fas fa-unlock-alt"></i> Reset HWID</button>
                            <button class="btn btn-danger" onclick="deleteKey('${key.key}')"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </td>
                `;
                
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading keys:', error);
    }
}

// Open add time modal
function openAddTimeModal(key) {
    if (!key) return;
    currentModalKey = key;
    const modal = document.getElementById('addTimeModal');
    const modalKey = document.getElementById('modal-key');
    if (modal && modalKey) {
        modalKey.textContent = key;
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

// Close add time modal
function closeAddTimeModal() {
    const modal = document.getElementById('addTimeModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    currentModalKey = '';
}

// Add time to key
async function addTime() {
    const duration = document.getElementById('modal-duration').value;
    const amount = document.getElementById('modal-amount').value;
    
    if (!amount || amount < 1) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        const response = await fetch(`${API}/keys/addtime`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken, key: currentModalKey, duration, amount })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Added ${amount} ${duration}(s) to key`);
            closeAddTimeModal();
            loadKeys();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error adding time');
    }
}

// Reset HWID
async function resetHWID(key) {
    if (!confirm(`Reset HWID for key: ${key}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API}/keys/resethwid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: currentToken, key })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('HWID reset successfully');
            loadKeys();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error resetting HWID');
    }
}

// Delete key
async function deleteKey(key) {
    if (!confirm(`Delete key: ${key}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API}/keys/${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': currentToken
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadKeys();
            loadStats();
        } else {
            alert('Error deleting key');
        }
    } catch (error) {
        alert('Error deleting key');
    }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('addTimeModal');
    if (modal) {
        // Ensure modal is hidden on page load
        modal.style.display = 'none';
        modal.classList.remove('active');
        
        // Close when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAddTimeModal();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeAddTimeModal();
            }
        });
    }
});

// Tab navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load data if needed
    if (tabName === 'keys') {
        loadKeys();
    } else if (tabName === 'overview') {
        loadStats();
    }
}

// Copy code to clipboard
function copyCode(elementId) {
    const codeElement = document.getElementById(elementId);
    // Get text content (strips HTML tags)
    const text = codeElement.textContent || codeElement.innerText;
    
    // Replace placeholders with actual values
    let finalText = text;
    if (currentUser && currentUser.id) {
        finalText = finalText.replace(/YOUR_ACCOUNT_ID/g, currentUser.id);
    }
    if (currentToken) {
        finalText = finalText.replace(/YOUR_API_TOKEN/g, currentToken);
    }
    
    navigator.clipboard.writeText(finalText).then(() => {
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #0d1117; border: 1px solid #3fb950; color: #3fb950; padding: 16px 24px; border-radius: 8px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        notification.innerHTML = '<i class="fas fa-check-circle"></i> Code copied to clipboard!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }).catch(() => {
        alert('Failed to copy. Please select and copy manually.');
    });
}

// Show file content in modal
async function showFile(filename) {
    try {
        // Try to fetch from current domain first (frontend deployment)
        let response = await fetch(`/${filename}`);
        
        // If not found, try backend
        if (!response.ok) {
            response = await fetch(`${API.replace('/api', '')}/${filename}`);
        }
        
        if (!response.ok) {
            // If still not found, show instructions
            alert(`To view ${filename}:\n\n1. Go to your local project folder\n2. Open ${filename} in your editor\n\nThese files are in the frontend folder.`);
            return;
        }
        
        const content = await response.text();
        
        // Create modal to display file
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90vh; overflow: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #30363d;">
                    <h2 style="margin: 0; color: #c9d1d9;"><i class="fas fa-file-code"></i> ${filename}</h2>
                    <button onclick="this.closest('.modal').remove()" style="background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
                <pre style="background: #0d1117; padding: 20px; border-radius: 8px; overflow-x: auto; border: 1px solid #30363d;"><code style="color: #c9d1d9; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6;">${escapeHtml(content)}</code></pre>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    } catch (error) {
        alert(`To view ${filename}:\n\n1. Go to your local project folder\n2. Open ${filename} in your editor\n\nThese files are in the root of your Astreon auth folder.`);
    }
}

// Escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Download file
async function downloadFile(filename) {
    try {
        // Try to fetch from current domain first (frontend deployment)
        let response = await fetch(`/${filename}`);
        
        // If not found, try backend
        if (!response.ok) {
            response = await fetch(`${API.replace('/api', '')}/${filename}`);
        }
        
        if (!response.ok) {
            alert(`To download ${filename}:\n\n1. Go to your local project folder\n2. Copy ${filename} from the frontend folder\n3. Add it to your C++ project`);
            return;
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        alert(`To download ${filename}:\n\n1. Go to your local project folder\n2. Copy ${filename} from the frontend folder\n3. Add it to your C++ project`);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAuth()) {
        loadStats();
    }
});

