// dashboard.js
import { auth, db, checkAuth } from './auth.js';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and redirect if needed
    checkAuth(['student', 'employer', 'admin']);

    const userId = localStorage.getItem('loggedInUserId');
    const accountType = localStorage.getItem('accountType');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // Redirect admin users to admin dashboard
    if (accountType === 'admin') {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Initialize dashboard elements
    const userNameElement = document.getElementById('userName');
    const profileViews = document.getElementById('profileViews');
    const applicationsSent = document.getElementById('applicationsSent');
    const interviewsScheduled = document.getElementById('interviewsScheduled');
    const cvDownloads = document.getElementById('cvDownloads');
    const activityList = document.getElementById('activityList');
    const profileCompletion = document.getElementById('profileCompletion');

    try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();

        // Update username
        if (userNameElement) {
            userNameElement.textContent = userData.username;
        }

        // Calculate and update profile completion
        const completionPercentage = calculateProfileCompletion(userData);
        if (profileCompletion) {
            const progressBar = profileCompletion.querySelector('.bg-kfupm-500'); // Updated to KFUPM color
            if (progressBar) {
                progressBar.style.width = `${completionPercentage}%`;
            }
            const percentageText = profileCompletion.querySelector('p');
            if (percentageText) {
                percentageText.textContent = `Profile completion: ${completionPercentage}%`;
            }
        }

        // Update statistics based on account type
        if (userData.accountType === 'student') {
            await updateStudentStats(userId);
            // Update labels for student dashboard
            updateDashboardLabels('student');
        } else if (userData.accountType === 'employer') {
            await updateEmployerStats(userId);
            // Update labels for employer dashboard
            updateDashboardLabels('employer');
        }

        // Initialize activity chart
        initializeActivityChart(userId, userData.accountType);

        // Load recent activity
        await loadRecentActivity(userId);

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
});

// Update dashboard labels based on user type
function updateDashboardLabels(accountType) {
    const labels = {
        student: {
            profileViews: 'Profile Views',
            applicationsSent: 'Applications Sent',
            interviewsScheduled: 'Interviews Scheduled',
            cvDownloads: 'CV Downloads'
        },
        employer: {
            profileViews: 'Company Profile Views',
            applicationsSent: 'Applications Received',
            interviewsScheduled: 'Interviews Scheduled',
            cvDownloads: 'Active Job Postings'
        }
    };

    const currentLabels = labels[accountType];
    
    // Update the labels in the UI
    Object.keys(currentLabels).forEach(key => {
        const element = document.querySelector(`#${key}`);
        if (element && element.previousElementSibling) {
            element.previousElementSibling.textContent = currentLabels[key];
        }
    });
}

// Calculate profile completion percentage
function calculateProfileCompletion(userData) {
    const requiredFields = {
        student: ['username', 'email', 'studentId', 'education', 'skills'],
        employer: ['username', 'email', 'companyName', 'companyPosition', 'companyDescription'],
        admin: ['username', 'email']
    };

    const fields = requiredFields[userData.accountType] || [];
    const completedFields = fields.filter(field => userData[field]);
    return Math.round((completedFields.length / fields.length) * 100);
}

// Update student-specific statistics
async function updateStudentStats(userId) {
    try {
        const stats = await getDoc(doc(db, "statistics", userId));
        const data = stats.data() || {};

        if (profileViews) profileViews.textContent = data.profileViews || 0;
        if (applicationsSent) applicationsSent.textContent = data.applicationsSent || 0;
        if (interviewsScheduled) interviewsScheduled.textContent = data.interviewsScheduled || 0;
        if (cvDownloads) cvDownloads.textContent = data.cvDownloads || 0;
    } catch (error) {
        console.error('Error updating student stats:', error);
    }
}

// Update employer-specific statistics
async function updateEmployerStats(userId) {
    try {
        const stats = await getDoc(doc(db, "statistics", userId));
        const data = stats.data() || {};

        // Update employer-specific UI elements
        if (profileViews) profileViews.textContent = data.companyViews || 0;
        if (applicationsSent) applicationsSent.textContent = data.applicationsReceived || 0;
        if (interviewsScheduled) interviewsScheduled.textContent = data.interviewsScheduled || 0;
        if (cvDownloads) cvDownloads.textContent = data.activeJobPostings || 0;
    } catch (error) {
        console.error('Error updating employer stats:', error);
    }
}

// Initialize activity chart
function initializeActivityChart(userId, accountType) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const chartLabel = accountType === 'employer' ? 'Company Activity' : 'Profile Activity';
    const chartColor = '#006B3F'; // KFUPM green

    // Sample data - replace with actual data from Firebase
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: chartLabel,
            data: [12, 19, 3, 5, 2, 3],
            borderColor: chartColor,
            backgroundColor: `${chartColor}20`,
            tension: 0.1,
            fill: true
        }]
    };

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Load recent activity
async function loadRecentActivity(userId) {
    if (!activityList) return;

    try {
        const activitiesQuery = query(
            collection(db, "activities"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc"),
            limit(5)
        );

        const activities = await getDocs(activitiesQuery);
        activityList.innerHTML = ''; // Clear existing activities

        activities.forEach(doc => {
            const activity = doc.data();
            const activityElement = document.createElement('div');
            activityElement.className = 'flex items-center p-3 border-b border-gray-200';
            
            activityElement.innerHTML = `
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-kfupm-100 flex items-center justify-center">
                    <i class="text-kfupm-500 ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-900">${activity.description}</p>
                    <p class="text-sm text-gray-500">${formatTimestamp(activity.timestamp)}</p>
                </div>
            `;

            activityList.appendChild(activityElement);
        });

        if (activities.size === 0) {
            activityList.innerHTML = '<p class="text-gray-500 text-center py-4">No recent activity</p>';
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

// Helper function to get activity icon
function getActivityIcon(type) {
    const icons = {
        'application': 'fas fa-paper-plane',
        'interview': 'fas fa-calendar-check',
        'profile': 'fas fa-user-edit',
        'cv': 'fas fa-file-alt',
        'default': 'fas fa-bell'
    };
    return icons[type] || icons.default;
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((date - new Date()) / (1000 * 60 * 60 * 24)),
        'day'
    );
}