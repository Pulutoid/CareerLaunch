// auth.js - Common authentication utilities
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Message display utility
function showMessage(messageId, message, type = 'info', duration = 5000) {
    const messageDiv = document.getElementById(messageId);
    if (!messageDiv) return;

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

    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, duration);
}

// Check authentication state
function checkAuth(allowedTypes = null) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userNav = document.getElementById('userNav');
            const guestNav = document.getElementById('guestNav');
            const userDisplayName = document.getElementById('userDisplayName');
            
            if (userNav) userNav.classList.remove('hidden');
            if (guestNav) guestNav.classList.add('hidden');
            if (userDisplayName) userDisplayName.textContent = localStorage.getItem('username') || user.email;

            // Check if user type is allowed on this page
            if (allowedTypes) {
                const userType = localStorage.getItem('accountType');
                if (!allowedTypes.includes(userType)) {
                    window.location.href = 'unauthorized.html';
                }
            }
        } else {
            const userNav = document.getElementById('userNav');
            const guestNav = document.getElementById('guestNav');
            
            if (userNav) userNav.classList.add('hidden');
            if (guestNav) guestNav.classList.remove('hidden');

            // Redirect to login if authentication is required
            const requiresAuth = document.body.hasAttribute('data-requires-auth');
            if (requiresAuth) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Logout function
async function logout() {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

export { auth, db, showMessage, checkAuth, logout };