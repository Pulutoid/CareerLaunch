// firebaseLogin.js
import { auth, db, showMessage } from './auth.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const forgotPasswordLink = document.getElementById('forgotPassword');

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

            showMessage('loginMessage', 'Login successful! Redirecting...', 'success');
            
            // Route based on account type
            setTimeout(() => {
                switch(userData.accountType) {
                    case 'student':
                        window.location.href = 'dashboard.html';
                        break;
                    case 'employer':
                        window.location.href = 'employer-dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin-dashboard.html';
                        break;
                    default:
                        window.location.href = 'dashboard.html';
                }
            }, 2000);
        } catch (error) {
            console.error('Error fetching user data:', error);
            showMessage('loginMessage', 'Error accessing user data', 'error');
        }
    }

    // Handle login
    async function handleLogin(event) {
        event.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('loginMessage', 'Please enter both email and password', 'error');
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

            showMessage('loginMessage', errorMessages[error.code] || errorMessages.default, 'error');
            console.error('Login error:', error);
        }
    }

    // Handle password reset
    async function handlePasswordReset(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage('loginMessage', 'Password reset email sent! Check your inbox.', 'success');
        } catch (error) {
            const errorMessages = {
                'auth/invalid-email': 'Please enter a valid email address',
                'auth/user-not-found': 'No account found with this email',
                'default': 'Error sending reset email'
            };

            showMessage('loginMessage', errorMessages[error.code] || errorMessages.default, 'error');
        }
    }

    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (event) => {
            event.preventDefault();
            const email = emailInput.value.trim();

            if (!email) {
                showMessage('loginMessage', 'Please enter your email address first', 'info');
                emailInput.focus();
                return;
            }

            await handlePasswordReset(email);
        });
    }
});