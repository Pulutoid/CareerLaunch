// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Your Firebase configuration
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

// Helper function to show messages
function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('signUpMessage');
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.className = `message ${type}`;
    messageDiv.style.opacity = 1;

    setTimeout(() => {
        messageDiv.style.opacity = 0;
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 500);
    }, 5000);
}

// Handle form submission
document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Get form values
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Basic validation
    if (password !== confirmPassword) {
        showMessage('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long');
        return;
    }

    try {
        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Store additional user data in Firestore
        const userData = {
            username: username,
            email: email,
            createdAt: new Date().toISOString()
        };

        // Set the user document in Firestore
        await setDoc(doc(db, "users", user.uid), userData);

        // Show success message
        showMessage('Account created successfully! Redirecting...', 'success');

        // Store user ID in localStorage (optional)
        localStorage.setItem('loggedInUserId', user.uid);

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        // Handle specific error cases
        switch (error.code) {
            case 'auth/email-already-in-use':
                showMessage('This email address is already registered');
                break;
            case 'auth/invalid-email':
                showMessage('Please enter a valid email address');
                break;
            case 'auth/operation-not-allowed':
                showMessage('Email/password accounts are not enabled. Please contact support.');
                break;
            case 'auth/weak-password':
                showMessage('Please choose a stronger password');
                break;
            default:
                showMessage('An error occurred during signup. Please try again.');
                console.error('Signup error:', error);
        }
    }
});