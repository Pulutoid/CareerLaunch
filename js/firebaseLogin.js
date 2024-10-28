/**
 * firebaseLogin.js
 * A modular Firebase authentication system for handling user login
 * Features:
 * - Email/Password authentication
 * - User session management
 * - Error handling and user feedback
 * - Password reset functionality
 */

// ======= Firebase SDK Imports =======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// ======= Firebase Configuration =======
const firebaseConfig = {
    apiKey: "AIzaSyDQGumhrZfKOosLkcYf_Ya2e14MO4l04W0",
    authDomain: "careerlaunchkfupm.firebaseapp.com",
    projectId: "careerlaunchkfupm",
    storageBucket: "careerlaunchkfupm.appspot.com",
    messagingSenderId: "176436849347",
    appId: "1:176436849347:web:7513f2b3ce700c356a9076",
    measurementId: "G-JKV7QHC5CZ"
};

// ======= Firebase Initialization =======
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// ======= UI Element References =======
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPassword');

// ======= Message Display Utility =======
/**
 * Shows a message to the user with optional type styling
 * @param {string} message - The message to display
 * @param {string} type - Message type ('success', 'error', or 'info')
 * @param {number} duration - How long to show the message (in milliseconds)
 */
function showMessage(message, type = 'info', duration = 5000) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    messageDiv.style.opacity = 1;

    // Auto-hide the message after duration
    setTimeout(() => {
        messageDiv.style.opacity = 0;
        setTimeout(() => messageDiv.style.display = 'none', 500);
    }, duration);
}

// ======= User Session Management =======
/**
 * Handles post-login success actions
 * @param {Object} user - Firebase user object
 */
async function handleLoginSuccess(user) {
    try {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        // Store necessary user info in localStorage
        localStorage.setItem('loggedInUserId', user.uid);
        localStorage.setItem('userEmail', user.email);
        if (userData?.username) {
            localStorage.setItem('username', userData.username);
        }

        // Show success message and redirect
        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'homepage.html';
        }, 2000);
    } catch (error) {
        console.error('Error fetching user data:', error);
        // Still redirect even if getting additional data fails
        window.location.href = 'homepage.html';
    }
}

// ======= Login Handler =======
/**
 * Attempts to log in the user with provided credentials
 * @param {string} email - User's email
 * @param {string} password - User's password
 */
async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleLoginSuccess(userCredential.user);
    } catch (error) {
        // Handle specific error cases with user-friendly messages
        const errorMessages = {
            'auth/invalid-credential': 'Invalid email or password. Please try again.',
            'auth/user-disabled': 'This account has been disabled. Please contact support.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'default': 'An error occurred during login. Please try again.'
        };

        showMessage(errorMessages[error.code] || errorMessages.default, 'error');
        console.error('Login error:', error);
    }
}

// ======= Password Reset Handler =======
/**
 * Sends a password reset email to the user
 * @param {string} email - User's email address
 */
async function handlePasswordReset(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        const errorMessages = {
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-not-found': 'No account found with this email.',
            'default': 'Error sending reset email. Please try again.'
        };

        showMessage(errorMessages[error.code] || errorMessages.default, 'error');
        console.error('Password reset error:', error);
    }
}

// ======= Event Listeners =======
// Login form submission
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('Please enter both email and password.', 'error');
        return;
    }

    await loginUser(email, password);
});

// Forgot password link
forgotPasswordLink.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
        showMessage('Please enter your email address first.', 'info');
        emailInput.focus();
        return;
    }

    await handlePasswordReset(email);
});