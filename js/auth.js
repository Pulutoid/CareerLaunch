// auth.js - Common authentication utilities
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

console.log('[Auth] Initializing authentication module');

const firebaseConfig = {
    apiKey: "AIzaSyDQGumhrZfKOosLkcYf_Ya2e14MO4l04W0",
    authDomain: "careerlaunchkfupm.firebaseapp.com",
    projectId: "careerlaunchkfupm",
    storageBucket: "careerlaunchkfupm.appspot.com",
    messagingSenderId: "176436849347",
    appId: "1:176436849347:web:7513f2b3ce700c356a9076",
    measurementId: "G-JKV7QHC5CZ"
};

// Initialize Firebase
console.log('[Auth] Attempting to initialize Firebase app');
const app = initializeApp(firebaseConfig);
console.log('[Auth] Firebase app initialized successfully');

const auth = getAuth();
console.log('[Auth] Auth instance created');

const db = getFirestore();
console.log('[Auth] Firestore instance created');

// Message display utility
function showMessage(messageId, message, type = 'info', duration = 5000) {
    console.log(`[Message] Displaying message: ${message} (Type: ${type}, Duration: ${duration}ms)`);

    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) {
        console.warn(`[Message] Message element with ID "${messageId}" not found`);
        return;
    }

    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.opacity = 1;

    // Add Tailwind classes based on message type
    const baseClasses = 'p-4 rounded-md mb-4 transition-opacity duration-300';
    const typeClasses = {
        info: 'bg-blue-100 text-blue-700',
        error: 'bg-red-100 text-red-700',
        success: 'bg-green-100 text-green-700'
    };

    messageDiv.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
    console.log(`[Message] Applied styles for message type: ${type}`);

    setTimeout(() => {
        messageDiv.style.opacity = 0;
        console.log(`[Message] Fading out message: ${message}`);
    }, duration);
}

// Check authentication state
function checkAuth(allowedTypes = null) {
    console.log('[Auth] Starting authentication check', allowedTypes ? `for allowed types: ${allowedTypes}` : '');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log(`[Auth] User authenticated: ${user.email}`);

            const userNav = document.getElementById('userNav');
            const guestNav = document.getElementById('guestNav');
            const userDisplayName = document.getElementById('userDisplayName');

            if (userNav) {
                userNav.classList.remove('hidden');
                console.log('[Auth] Showing user navigation');
            }
            if (guestNav) {
                guestNav.classList.add('hidden');
                console.log('[Auth] Hiding guest navigation');
            }
            if (userDisplayName) {
                userDisplayName.textContent = localStorage.getItem('username') || user.email;
                console.log(`[Auth] Updated display name: ${userDisplayName.textContent}`);
            }

            // Check if user type is allowed on this page
            if (allowedTypes) {
                const userType = localStorage.getItem('accountType');
                console.log(`[Auth] Checking user type: ${userType} against allowed types: ${allowedTypes}`);

                if (!allowedTypes.includes(userType)) {
                    console.warn(`[Auth] Unauthorized access attempt. User type: ${userType}, Required: ${allowedTypes}`);
                    window.location.href = 'unauthorized.html';
                }
            }
        } else {
            console.log('[Auth] No authenticated user');

            const userNav = document.getElementById('userNav');
            const guestNav = document.getElementById('guestNav');

            if (userNav) {
                userNav.classList.add('hidden');
                console.log('[Auth] Hiding user navigation');
            }
            if (guestNav) {
                guestNav.classList.remove('hidden');
                console.log('[Auth] Showing guest navigation');
            }

            // Redirect to login if authentication is required
            const requiresAuth = document.body.hasAttribute('data-requires-auth');
            if (requiresAuth) {
                console.log('[Auth] Authentication required, redirecting to login');
                window.location.href = 'login.html';
            }
        }
    });
}

// Logout function
async function logout() {
    console.log('[Auth] Attempting to log out user');
    try {
        await auth.signOut();
        console.log('[Auth] User signed out successfully');

        localStorage.clear();
        console.log('[Auth] Local storage cleared');

        window.location.href = 'login.html';
    } catch (error) {
        console.error('[Auth] Logout error:', error);
        throw error; // Re-throw the error for handling by the calling code
    }
}

// Make logout available globally
window.handleLogout = async () => {
    try {
        await logout();
        window.location.href = 'logout.html';
    } catch (error) {
        console.error('[Auth] Error during logout:', error);
        showMessage('message', 'Error logging out. Please try again.', 'error');
    }
};



export { auth, db, showMessage, checkAuth, logout };