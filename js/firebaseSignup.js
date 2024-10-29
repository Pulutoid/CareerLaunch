import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

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

// Admin pre-shared key (in production, this should be securely stored)
const ADMIN_KEY = "kfupm-admin-2024";

// UI Elements
const signupForm = document.getElementById('signup-form');
const accountTypeSelect = document.getElementById('accountType');
const adminKeySection = document.getElementById('adminKeySection');
const studentIdSection = document.getElementById('studentIdSection');
const companySection = document.getElementById('companySection');

// Show/hide additional fields based on account type
accountTypeSelect.addEventListener('change', () => {
    const accountType = accountTypeSelect.value;
    
    // Hide all sections first
    adminKeySection.classList.add('hidden');
    studentIdSection.classList.add('hidden');
    companySection.classList.add('hidden');
    
    // Show relevant sections
    if (accountType === 'admin') {
        adminKeySection.classList.remove('hidden');
    } else if (accountType === 'student') {
        studentIdSection.classList.remove('hidden');
    } else if (accountType === 'employer') {
        companySection.classList.remove('hidden');
    }
});

// Message display utility
function showMessage(message, type = 'info', duration = 5000) {
    const messageDiv = document.getElementById('signUpMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.opacity = 1;

    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, duration);
}

// Validate password strength
function validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return "Password must be at least 8 characters long";
    }
    if (!hasUpperCase || !hasLowerCase) {
        return "Password must contain both uppercase and lowercase letters";
    }
    if (!hasNumbers) {
        return "Password must contain at least one number";
    }
    if (!hasSpecialChar) {
        return "Password must contain at least one special character";
    }
    return null;
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const accountType = accountTypeSelect.value;

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        showMessage(passwordError, 'error');
        return;
    }

    // Account type specific validation
    if (accountType === 'admin') {
        const adminKey = document.getElementById('adminKey').value;
        if (adminKey !== ADMIN_KEY) {
            showMessage('Invalid admin key', 'error');
            return;
        }
    } else if (accountType === 'student') {
        const studentId = document.getElementById('studentId').value.trim();
        if (!studentId) {
            showMessage('Student ID is required', 'error');
            return;
        }
    } else if (accountType === 'employer') {
        const companyName = document.getElementById('companyName').value.trim();
        const companyPosition = document.getElementById('companyPosition').value.trim();
        if (!companyName || !companyPosition) {
            showMessage('Company information is required', 'error');
            return;
        }
    }

    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Prepare user data based on account type
        const userData = {
            username,
            email,
            accountType,
            createdAt: new Date().toISOString()
        };

        if (accountType === 'student') {
            userData.studentId = document.getElementById('studentId').value.trim();
        } else if (accountType === 'employer') {
            userData.companyName = document.getElementById('companyName').value.trim();
            userData.companyPosition = document.getElementById('companyPosition').value.trim();
        }

        // Store additional user data in Firestore
        await setDoc(doc(db, "users", user.uid), userData);

        showMessage('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        const errorMessages = {
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Account creation is currently disabled',
            'auth/weak-password': 'Password is too weak',
            'default': 'An error occurred during signup'
        };

        showMessage(errorMessages[error.code] || errorMessages.default, 'error');
        console.error('Signup error:', error);
    }
}

// Add form submit event listener
signupForm.addEventListener('submit', handleSignup);