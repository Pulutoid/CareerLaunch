import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Firebase configuration
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

// UI Elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPassword');

// Message display utility
function showMessage(message, type = 'info', duration = 5000) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.opacity = 1;

    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, duration);
}

// Handle login success
async function handleLoginSuccess(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        localStorage.setItem('loggedInUserId', user.uid);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('accountType', userData.accountType);
        if (userData?.username) {
            localStorage.setItem('username', userData.username);
        }

        showMessage('Login successful! Redirecting...', 'success');
        
        // Route based on account type
        setTimeout(() => {
            switch(userData.accountType) {
                case 'student':
                    window.location.href = 'student-dashboard.html';
                    break;
                case 'employer':
                    window.location.href = 'employer-dashboard.html';
                    break;
                case 'admin':
                    window.location.href = 'admin-dashboard.html';
                    break;
                default:
                    window.location.href = 'index.html';
            }
        }, 2000);
    } catch (error) {
        console.error('Error fetching user data:', error);
        window.location.href = 'index.html';
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage('Please enter both email and password', 'error');
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleLoginSuccess(userCredential.user);
    } catch (error) {
        const errorMessages = {
            'auth/invalid-credential': 'Invalid email or password',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later',
            'default': 'An error occurred during login'
        };

        showMessage(errorMessages[error.code] || errorMessages.default, 'error');
        console.error('Login error:', error);
    }
}

// Handle password reset
async function handlePasswordReset(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        const errorMessages = {
            'auth/invalid-email': 'Please enter a valid email address',
            'auth/user-not-found': 'No account found with this email',
            'default': 'Error sending reset email'
        };

        showMessage(errorMessages[error.code] || errorMessages.default, 'error');
        console.error('Password reset error:', error);
    }
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);

forgotPasswordLink.addEventListener('click', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (!email) {
        showMessage('Please enter your email address first', 'info');
        emailInput.focus();
        return;
    }

    await handlePasswordReset(email);
});