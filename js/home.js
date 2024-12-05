// home.js
import { auth, db } from './auth.js';

function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🏠 [Home] ${message}`, data || '');
}

import { logout } from './auth.js';

// Add this near the top after the debugLog function
window.handleLogout = async () => {
    debugLog('🚪 Logout requested');
    try {
        await logout();
        debugLog('✅ Logout successful');
        window.location.href = 'login.html';
    } catch (error) {
        debugLog('❌ Logout failed', error);
        alert('Error logging out. Please try again.');
    }
};


document.addEventListener('DOMContentLoaded', () => {
    debugLog('Initializing home page');

    const elements = {
        guestNav: document.getElementById('guestNav'),
        userNav: document.getElementById('userNav'),
        signUpBtn: document.getElementById('signUpBtn'),
        studentDashboardBtn: document.getElementById('studentDashboardBtn'),
        employerDashboardBtn: document.getElementById('employerDashboardBtn')
    };

    const userData = {
        userId: localStorage.getItem('loggedInUserId'),
        accountType: localStorage.getItem('accountType'),
        username: localStorage.getItem('username')
    };

    debugLog('User data retrieved', userData);

    if (userData.userId) {
        // User is logged in
        elements.guestNav.classList.add('hidden');
        elements.userNav.classList.remove('hidden');
        elements.signUpBtn.classList.add('hidden');

        // Show appropriate dashboard button based on account type
        switch (userData.accountType) {
            case 'student':
                elements.studentDashboardBtn.classList.remove('hidden');
                debugLog('Showing student dashboard button');
                break;
            case 'employer':
                elements.employerDashboardBtn.classList.remove('hidden');
                debugLog('Showing employer dashboard button');
                break;
            default:
                debugLog('Unknown account type', userData.accountType);
        }

        // Update navigation links based on user type
        const dashboardLink = document.getElementById('dashboardLink');
        if (dashboardLink) {
            dashboardLink.href = userData.accountType === 'employer'
                ? 'employer-dashboard.html'
                : 'student-dashboard.html';
        }
    } else {
        // No user logged in
        elements.guestNav.classList.remove('hidden');
        elements.userNav.classList.add('hidden');
        elements.signUpBtn.classList.remove('hidden');
        elements.studentDashboardBtn.classList.add('hidden');
        elements.employerDashboardBtn.classList.add('hidden');
        debugLog('No user logged in, showing guest navigation');
    }
});