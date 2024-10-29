// firebaseSignup.js
import { auth, db, showMessage } from './auth.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const accountTypeSelect = document.getElementById('accountType');
    const adminKeySection = document.getElementById('adminKeySection');
    const studentIdSection = document.getElementById('studentIdSection');
    const companySection = document.getElementById('companySection');

    const ADMIN_KEY = "kfupm-admin-2024";

    // Show/hide additional fields based on account type
    if (accountTypeSelect) {
        accountTypeSelect.addEventListener('change', () => {
            const accountType = accountTypeSelect.value;
            
            // Hide all sections first
            adminKeySection?.classList.add('hidden');
            studentIdSection?.classList.add('hidden');
            companySection?.classList.add('hidden');
            
            // Show relevant sections
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

    // Validate password strength
    function validatePassword(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        if (!requirements.minLength) return "Password must be at least 8 characters long";
        if (!requirements.hasUpperCase || !requirements.hasLowerCase) {
            return "Password must contain both uppercase and lowercase letters";
        }
        if (!requirements.hasNumbers) return "Password must contain at least one number";
        if (!requirements.hasSpecialChar) return "Password must contain at least one special character";
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
            showMessage('signUpMessage', 'Please fill in all required fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('signUpMessage', 'Passwords do not match', 'error');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            showMessage('signUpMessage', passwordError, 'error');
            return;
        }

        // Account type specific validation
        if (accountType === 'admin') {
            const adminKey = document.getElementById('adminKey').value;
            if (adminKey !== ADMIN_KEY) {
                showMessage('signUpMessage', 'Invalid admin key', 'error');
                return;
            }
        } else if (accountType === 'student') {
            const studentId = document.getElementById('studentId').value.trim();
            if (!studentId) {
                showMessage('signUpMessage', 'Student ID is required', 'error');
                return;
            }
        } else if (accountType === 'employer') {
            const companyName = document.getElementById('companyName').value.trim();
            const companyPosition = document.getElementById('companyPosition').value.trim();
            if (!companyName || !companyPosition) {
                showMessage('signUpMessage', 'Company information is required', 'error');
                return;
            }
        }

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Prepare user data
            const userData = {
                username,
                email,
                accountType,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                profileComplete: false
            };

            // Add account type specific data
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
                    userData.adminLevel = 1; // Basic admin level
                    break;
            }

            // Store user data in Firestore
            await setDoc(doc(db, "users", user.uid), userData);

            showMessage('signUpMessage', 'Account created successfully! Redirecting...', 'success');
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

            showMessage('signUpMessage', errorMessages[error.code] || errorMessages.default, 'error');
            console.error('Signup error:', error);
        }
    }

    // Add form submit event listener
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});