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

const firebaseConfig = {
    apiKey: "AIzaSyDQGumhrZfKOosLkcYf_Ya2e14MO4l04W0",
    authDomain: "careerlaunchkfupm.firebaseapp.com",
    projectId: "careerlaunchkfupm",
    storageBucket: "careerlaunchkfupm.appspot.com",
    messagingSenderId: "176436849347",
    appId: "1:176436849347:web:7513f2b3ce700c356a9076",
    measurementId: "G-JKV7QHC5CZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// Dashboard State Management
const dashboardState = {
    userProfile: null,
    statistics: null,
    activities: [],
    unsubscribeListeners: []
};

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await initializeDashboard(user);
    } else {
        window.location.href = 'login.html';
    }
});

async function initializeDashboard(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        dashboardState.userProfile = userDoc.data();

        updateUIWithUserData();
        setupActivityListener(user.uid);
        loadStatistics(user.uid);
        initializeCharts();
    } catch (error) {
        console.error('Dashboard initialization error:', error);
    }
}

function updateUIWithUserData() {
    const profile = dashboardState.userProfile;
    document.getElementById('userName').textContent = profile.username || 'User';
    document.getElementById('userDisplayName').textContent = profile.email;

    const completionPercentage = calculateProfileCompletion(profile);
    updateProfileCompletionUI(completionPercentage);
}

function calculateProfileCompletion(profile) {
    const requiredFields = ['username', 'email', 'phone', 'education', 'skills'];
    const completedFields = requiredFields.filter(field => profile[field]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
}

function setupActivityListener(userId) {
    const activityQuery = query(
        collection(db, "userActivities"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(10)
    );

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                addActivityToFeed(change.doc.data());
            }
        });
    });

    dashboardState.unsubscribeListeners.push(unsubscribe);
}

async function loadStatistics(userId) {
    try {
        const statsDoc = await getDoc(doc(db, "userStats", userId));
        dashboardState.statistics = statsDoc.data() || {
            profileViews: 0,
            applicationsSent: 0,
            interviewsScheduled: 0,
            cvDownloads: 0
        };
        updateStatisticsUI();
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function updateStatisticsUI() {
    const stats = dashboardState.statistics;
    document.getElementById('profileViews').textContent = stats.profileViews;
    document.getElementById('applicationsSent').textContent = stats.applicationsSent;
    document.getElementById('interviewsScheduled').textContent = stats.interviewsScheduled;
    document.getElementById('cvDownloads').textContent = stats.cvDownloads;
}

function addActivityToFeed(activity) {
    const activityList = document.getElementById('activityList');
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item';
    activityElement.innerHTML = `
        <p>${activity.description}</p>
        <small>${new Date(activity.timestamp).toLocaleString()}</small>
    `;
    activityList.insertBefore(activityElement, activityList.firstChild);
}

function initializeCharts() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Profile Activity',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        dashboardState.unsubscribeListeners.forEach(unsubscribe => unsubscribe());
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
});