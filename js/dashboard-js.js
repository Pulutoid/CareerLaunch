import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { 
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
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

// UI Elements
const userDisplayName = document.getElementById('userDisplayName');
const userName = document.getElementById('userName');
const profileCompletion = document.getElementById('profileCompletion');
const profileViews = document.getElementById('profileViews');
const applicationsSent = document.getElementById('applicationsSent');
const interviewsScheduled = document.getElementById('interviewsScheduled');
const cvDownloads = document.getElementById('cvDownloads');
const activityList = document.getElementById('activityList');

// Check authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (userData) {
            userDisplayName.textContent = userData.username;
            userName.textContent = userData.username;
            
            // Calculate profile completion
            updateProfileCompletion(userData);
            
            // Load statistics
            loadUserStatistics(user.uid);
            
            // Load activity feed
            loadActivityFeed(user.uid);
        }
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
});

// Update profile completion percentage
function updateProfileCompletion(userData) {
    const requiredFields = ['username', 'email', 'phone', 'education', 'experience', 'skills'];
    const completedFields = requiredFields.filter(field => userData[field]);
    const completionPercentage = (completedFields.length / requiredFields.length) * 100;

    profileCompletion.innerHTML = `
        <div class="progress-bar">
            <div class="progress" style="width: ${completionPercentage}%"></div>
        </div>
        <p>Profile Completion: ${Math.round(completionPercentage)}%</p>
    `;
}

// Load user statistics
async function loadUserStatistics(userId) {
    const statsDoc = await getDoc(doc(db, "statistics", userId));
    const stats = statsDoc.data() || {};

    profileViews.textContent = stats.profileViews || 0;
    applicationsSent.textContent = stats.applicationsSent || 0;
    interviewsScheduled.textContent = stats.interviewsScheduled || 0;
    cvDownloads.textContent = stats.cvDownloads || 0;
}

// Load activity feed
function loadActivityFeed(userId) {
    const activitiesRef = collection(db, "activities");
    const q = query(
        activitiesRef,
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(5)
    );

    onSnapshot(q, (snapshot) => {
        activityList.innerHTML = '';
        snapshot.forEach(doc => {
            const activity = doc.data();
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';
            activityElement.innerHTML = `
                <p>${activity.description}</p>
                <small>${new Date(activity.timestamp).toLocaleDateString()}</small>
            `;
            activityList.appendChild(activityElement);
        });
    });
}

// Handle logout
document.querySelector('.nav-right').addEventListener('click', async (e) => {
    if (e.target.textContent === 'Logout') {
        try {
            await signOut(auth);
            window.location.href = 'logout.html';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }
});
