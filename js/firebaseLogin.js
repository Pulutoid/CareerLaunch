// firebaseLogin.js
import { auth, db, showMessage } from './auth.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

console.log('[Login] Initializing Firebase login module');

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Login] DOM Content Loaded, initializing login form');

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const forgotPasswordLink = document.getElementById('forgotPassword');

    // Log presence/absence of essential elements
    console.log('[Login] Form elements found:', {
        loginForm: !!loginForm,
        emailInput: !!emailInput,
        passwordInput: !!passwordInput,
        forgotPasswordLink: !!forgotPasswordLink
    });

    async function handleLoginSuccess(user) {
        console.log('[Login] Login successful, processing user data', { userId: user.uid, email: user.email });

        try {
            console.log('[Login] Fetching user document from Firestore');
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.data();
            console.log('[Login] User data retrieved:', {
                accountType: userData.accountType,
                username: userData.username,
                uid: user.uid
            });

            // Store user data in localStorage
            console.log('[Login] Storing user data in localStorage');
            localStorage.setItem('loggedInUserId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('accountType', userData.accountType);
            if (userData?.username) {
                localStorage.setItem('username', userData.username);
            }

            showMessage('loginMessage', 'Login successful! Redirecting...', 'success');

            // Route based on account type
            console.log(`[Login] Determining redirect for account type: ${userData.accountType}`);
            setTimeout(() => {
                let redirectUrl;
                switch (userData.accountType) {
                    case 'student':
                        redirectUrl = 'student-dashboard.html';
                        break;
                    case 'employer':
                        redirectUrl = 'employer-student-dashboard.html';
                        break;
                    case 'admin':
                        redirectUrl = 'admin-student-dashboard.html';
                        break;
                    default:
                        redirectUrl = 'student-dashboard.html';
                }
                console.log(`[Login] Redirecting to: ${redirectUrl}`);
                window.location.href = redirectUrl;
            }, 2000);
        } catch (error) {
            console.error('[Login] Error fetching user data:', error);
            showMessage('loginMessage', 'Error accessing user data', 'error');
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        console.log('[Login] Login attempt initiated');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        console.log('[Login] Validating login inputs:', {
            emailProvided: !!email,
            passwordProvided: !!password
        });

        if (!email || !password) {
            console.warn('[Login] Missing required fields');
            showMessage('loginMessage', 'Please enter both email and password', 'error');
            return;
        }

        try {
            console.log('[Login] Attempting Firebase authentication');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('[Login] Firebase authentication successful');
            await handleLoginSuccess(userCredential.user);
        } catch (error) {
            console.error('[Login] Authentication error:', {
                code: error.code,
                message: error.message
            });

            const errorMessages = {
                'auth/invalid-credential': 'Invalid email or password',
                'auth/user-disabled': 'This account has been disabled',
                'auth/user-not-found': 'No account found with this email',
                'auth/too-many-requests': 'Too many failed attempts. Please try again later',
                'default': 'An error occurred during login'
            };

            const errorMessage = errorMessages[error.code] || errorMessages.default;
            console.warn(`[Login] Showing error message to user: ${errorMessage}`);
            showMessage('loginMessage', errorMessage, 'error');
        }
    }

    async function handlePasswordReset(email) {
        console.log('[Login] Password reset requested for email:', email);

        try {
            console.log('[Login] Sending password reset email');
            await sendPasswordResetEmail(auth, email);
            console.log('[Login] Password reset email sent successfully');
            showMessage('loginMessage', 'Password reset email sent! Check your inbox.', 'success');
        } catch (error) {
            console.error('[Login] Password reset error:', {
                code: error.code,
                message: error.message
            });

            const errorMessages = {
                'auth/invalid-email': 'Please enter a valid email address',
                'auth/user-not-found': 'No account found with this email',
                'default': 'Error sending reset email'
            };

            const errorMessage = errorMessages[error.code] || errorMessages.default;
            console.warn(`[Login] Showing password reset error: ${errorMessage}`);
            showMessage('loginMessage', errorMessage, 'error');
        }
    }

    // Event Listeners
    if (loginForm) {
        console.log('[Login] Adding login form submit listener');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.warn('[Login] Login form element not found');
    }

    if (forgotPasswordLink) {
        console.log('[Login] Adding forgot password link listener');
        forgotPasswordLink.addEventListener('click', async (event) => {
            event.preventDefault();
            console.log('[Login] Forgot password link clicked');

            const email = emailInput.value.trim();
            console.log('[Login] Checking email field for reset:', { emailProvided: !!email });

            if (!email) {
                console.warn('[Login] No email provided for password reset');
                showMessage('loginMessage', 'Please enter your email address first', 'info');
                emailInput.focus();
                return;
            }

            await handlePasswordReset(email);
        });
    } else {
        console.warn('[Login] Forgot password link element not found');
    }

    console.log('[Login] Login module initialization complete');
});