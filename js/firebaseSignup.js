// firebaseSignup.js
import { auth, db, showMessage } from './auth.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

console.log('[Signup] Initializing Firebase signup module');

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Signup] DOM Content Loaded, initializing signup form');
    
    const signupForm = document.getElementById('signup-form');
    const accountTypeSelect = document.getElementById('accountType');
    const adminKeySection = document.getElementById('adminKeySection');
    const studentIdSection = document.getElementById('studentIdSection');
    const companySection = document.getElementById('companySection');

    // Log presence/absence of essential elements
    console.log('[Signup] Form elements found:', {
        signupForm: !!signupForm,
        accountTypeSelect: !!accountTypeSelect,
        adminKeySection: !!adminKeySection,
        studentIdSection: !!studentIdSection,
        companySection: !!companySection
    });

    const ADMIN_KEY = "kfupm-admin-2024";

    // Show/hide additional fields based on account type
    if (accountTypeSelect) {
        console.log('[Signup] Adding account type change listener');
        accountTypeSelect.addEventListener('change', () => {
            const accountType = accountTypeSelect.value;
            console.log(`[Signup] Account type changed to: ${accountType}`);
            
            // Hide all sections first
            console.log('[Signup] Hiding all conditional sections');
            adminKeySection?.classList.add('hidden');
            studentIdSection?.classList.add('hidden');
            companySection?.classList.add('hidden');
            
            // Show relevant sections
            console.log(`[Signup] Showing section for account type: ${accountType}`);
            switch(accountType) {
                case 'admin':
                    adminKeySection?.classList.remove('hidden');
                    break;
                case 'student':
                    studentIdSection?.classList.remove('hidden');
                    break;
                case 'employer':
                    companySection?.classList.remove('hidden');
                    break;
            }
        });
    }

    function validatePassword(password) {
        console.log('[Signup] Validating password strength');
        const requirements = {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        console.log('[Signup] Password requirements check:', {
            minLength: requirements.minLength,
            hasUpperCase: requirements.hasUpperCase,
            hasLowerCase: requirements.hasLowerCase,
            hasNumbers: requirements.hasNumbers,
            hasSpecialChar: requirements.hasSpecialChar
        });

        if (!requirements.minLength) return "Password must be at least 8 characters long";
        if (!requirements.hasUpperCase || !requirements.hasLowerCase) {
            return "Password must contain both uppercase and lowercase letters";
        }
        if (!requirements.hasNumbers) return "Password must contain at least one number";
        if (!requirements.hasSpecialChar) return "Password must contain at least one special character";
        return null;
    }

    async function handleSignup(event) {
        event.preventDefault();
        console.log('[Signup] Signup attempt initiated');

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const accountType = accountTypeSelect.value;

        console.log('[Signup] Collected form data:', { 
            username: username,
            email: email,
            accountType: accountType,
            passwordProvided: !!password,
            confirmPasswordProvided: !!confirmPassword
        });

        // Basic validation
        if (!username || !email || !password || !confirmPassword) {
            console.warn('[Signup] Missing required fields');
            showMessage('signUpMessage', 'Please fill in all required fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            console.warn('[Signup] Password mismatch');
            showMessage('signUpMessage', 'Passwords do not match', 'error');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            console.warn('[Signup] Password validation failed:', passwordError);
            showMessage('signUpMessage', passwordError, 'error');
            return;
        }

        // Account type specific validation
        console.log(`[Signup] Validating ${accountType} specific fields`);
        if (accountType === 'admin') {
            const adminKey = document.getElementById('adminKey').value;
            if (adminKey !== ADMIN_KEY) {
                console.warn('[Signup] Invalid admin key provided');
                showMessage('signUpMessage', 'Invalid admin key', 'error');
                return;
            }
        } else if (accountType === 'student') {
            const studentId = document.getElementById('studentId').value.trim();
            if (!studentId) {
                console.warn('[Signup] Missing student ID');
                showMessage('signUpMessage', 'Student ID is required', 'error');
                return;
            }
        } else if (accountType === 'employer') {
            const companyName = document.getElementById('companyName').value.trim();
            const companyPosition = document.getElementById('companyPosition').value.trim();
            if (!companyName || !companyPosition) {
                console.warn('[Signup] Missing company information');
                showMessage('signUpMessage', 'Company information is required', 'error');
                return;
            }
        }

        try {
            console.log('[Signup] Creating Firebase user account');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log('[Signup] User account created successfully:', { uid: user.uid });

            // Prepare user data
            console.log('[Signup] Preparing user data for Firestore');
            const userData = {
                username,
                email,
                accountType,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                profileComplete: false
            };

            // Add account type specific data
            console.log(`[Signup] Adding ${accountType}-specific data`);
            switch(accountType) {
                case 'student':
                    userData.studentId = document.getElementById('studentId').value.trim();
                    userData.cvs = [];
                    userData.applications = [];
                    break;
                case 'employer':
                    userData.companyName = document.getElementById('companyName').value.trim();
                    userData.companyPosition = document.getElementById('companyPosition').value.trim();
                    userData.jobPostings = [];
                    break;
                case 'admin':
                    userData.adminLevel = 1;
                    break;
            }

            console.log('[Signup] Storing user data in Firestore');
            await setDoc(doc(db, "users", user.uid), userData);
            console.log('[Signup] User data stored successfully');

            showMessage('signUpMessage', 'Account created successfully! Redirecting...', 'success');
            console.log('[Signup] Redirecting to login page');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            console.error('[Signup] Error during signup:', {
                code: error.code,
                message: error.message
            });

            const errorMessages = {
                'auth/email-already-in-use': 'An account with this email already exists',
                'auth/invalid-email': 'Invalid email address',
                'auth/operation-not-allowed': 'Account creation is currently disabled',
                'auth/weak-password': 'Password is too weak',
                'default': 'An error occurred during signup'
            };

            const errorMessage = errorMessages[error.code] || errorMessages.default;
            console.warn(`[Signup] Showing error message to user: ${errorMessage}`);
            showMessage('signUpMessage', errorMessage, 'error');
        }
    }

    // Add form submit event listener
    if (signupForm) {
        console.log('[Signup] Adding signup form submit listener');
        signupForm.addEventListener('submit', handleSignup);
    } else {
        console.warn('[Signup] Signup form element not found');
    }

    console.log('[Signup] Signup module initialization complete');
});