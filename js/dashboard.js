// dashboard.js
import { auth, db, checkAuth } from './auth.js';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

console.log('[Dashboard] Initializing dashboard module');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Dashboard] DOM Content Loaded, initializing dashboard');
    
    // Check authentication and redirect if needed
    console.log('[Dashboard] Checking authentication');
    checkAuth(['student', 'employer', 'admin']);

    const userId = localStorage.getItem('loggedInUserId');
    const accountType = localStorage.getItem('accountType');
    console.log(`[Dashboard] User ID: ${userId}, Account Type: ${accountType}`);

    if (!userId) {
        console.warn('[Dashboard] No user ID found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    // Redirect admin users to admin dashboard
    if (accountType === 'admin') {
        console.log('[Dashboard] Admin user detected, redirecting to admin dashboard');
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Initialize dashboard elements
    console.log('[Dashboard] Initializing dashboard elements');
    const userNameElement = document.getElementById('userName');
    const profileViews = document.getElementById('profileViews');
    const applicationsSent = document.getElementById('applicationsSent');
    const interviewsScheduled = document.getElementById('interviewsScheduled');
    const cvDownloads = document.getElementById('cvDownloads');
    const activityList = document.getElementById('activityList');
    const profileCompletion = document.getElementById('profileCompletion');

    try {
        // Fetch user data
        console.log(`[Dashboard] Fetching user data for ID: ${userId}`);
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();
        console.log('[Dashboard] User data fetched:', { ...userData, password: '[REDACTED]' });

        // Update username
        if (userNameElement) {
            userNameElement.textContent = userData.username;
            console.log(`[Dashboard] Updated username display: ${userData.username}`);
        }

        // Calculate and update profile completion
        console.log('[Dashboard] Calculating profile completion');
        const completionPercentage = calculateProfileCompletion(userData);
        if (profileCompletion) {
            const progressBar = profileCompletion.querySelector('.bg-kfupm-500');
            if (progressBar) {
                progressBar.style.width = `${completionPercentage}%`;
                console.log(`[Dashboard] Updated progress bar width: ${completionPercentage}%`);
            }
            const percentageText = profileCompletion.querySelector('p');
            if (percentageText) {
                percentageText.textContent = `Profile completion: ${completionPercentage}%`;
                console.log(`[Dashboard] Updated completion text: ${completionPercentage}%`);
            }
        }

        // Update statistics based on account type
        console.log(`[Dashboard] Updating statistics for account type: ${userData.accountType}`);
        if (userData.accountType === 'student') {
            await updateStudentStats(userId);
            updateDashboardLabels('student');
        } else if (userData.accountType === 'employer') {
            await updateEmployerStats(userId);
            updateDashboardLabels('employer');
        }

        console.log('[Dashboard] Initializing activity chart');
        initializeActivityChart(userId, userData.accountType);

        console.log('[Dashboard] Loading recent activity');
        await loadRecentActivity(userId);

    } catch (error) {
        console.error('[Dashboard] Error loading dashboard:', error);
    }
});

function updateDashboardLabels(accountType) {
    console.log(`[Dashboard] Updating dashboard labels for account type: ${accountType}`);
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
    
    Object.keys(currentLabels).forEach(key => {
        const element = document.querySelector(`#${key}`);
        if (element && element.previousElementSibling) {
            element.previousElementSibling.textContent = currentLabels[key];
            console.log(`[Dashboard] Updated ${key} label to: ${currentLabels[key]}`);
        } else {
            console.warn(`[Dashboard] Could not find element for ${key} label`);
        }
    });
}

function calculateProfileCompletion(userData) {
    console.log('[Dashboard] Calculating profile completion');
    const requiredFields = {
        student: ['username', 'email', 'studentId', 'education', 'skills'],
        employer: ['username', 'email', 'companyName', 'companyPosition', 'companyDescription'],
        admin: ['username', 'email']
    };

    const fields = requiredFields[userData.accountType] || [];
    const completedFields = fields.filter(field => userData[field]);
    const percentage = Math.round((completedFields.length / fields.length) * 100);
    
    console.log(`[Dashboard] Profile completion: ${percentage}% (${completedFields.length}/${fields.length} fields completed)`);
    return percentage;
}

async function updateStudentStats(userId) {
    console.log(`[Dashboard] Updating student stats for user: ${userId}`);
    try {
        const stats = await getDoc(doc(db, "statistics", userId));
        const data = stats.data() || {};
        console.log('[Dashboard] Retrieved student statistics:', data);

        if (profileViews) profileViews.textContent = data.profileViews || 0;
        if (applicationsSent) applicationsSent.textContent = data.applicationsSent || 0;
        if (interviewsScheduled) interviewsScheduled.textContent = data.interviewsScheduled || 0;
        if (cvDownloads) cvDownloads.textContent = data.cvDownloads || 0;
        
        console.log('[Dashboard] Updated student statistics in UI');
    } catch (error) {
        console.error('[Dashboard] Error updating student stats:', error);
    }
}

async function updateEmployerStats(userId) {
    console.log(`[Dashboard] Updating employer stats for user: ${userId}`);
    try {
        const stats = await getDoc(doc(db, "statistics", userId));
        const data = stats.data() || {};
        console.log('[Dashboard] Retrieved employer statistics:', data);

        if (profileViews) profileViews.textContent = data.companyViews || 0;
        if (applicationsSent) applicationsSent.textContent = data.applicationsReceived || 0;
        if (interviewsScheduled) interviewsScheduled.textContent = data.interviewsScheduled || 0;
        if (cvDownloads) cvDownloads.textContent = data.activeJobPostings || 0;
        
        console.log('[Dashboard] Updated employer statistics in UI');
    } catch (error) {
        console.error('[Dashboard] Error updating employer stats:', error);
    }
}

function initializeActivityChart(userId, accountType) {
    console.log(`[Dashboard] Initializing activity chart for user: ${userId}`);
    const ctx = document.getElementById('activityChart');
    if (!ctx) {
        console.warn('[Dashboard] Activity chart canvas not found');
        return;
    }

    const chartLabel = accountType === 'employer' ? 'Company Activity' : 'Profile Activity';
    const chartColor = '#006B3F'; // KFUPM green

    console.log(`[Dashboard] Creating chart with label: ${chartLabel}`);
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
    console.log('[Dashboard] Activity chart initialized');
}

async function loadRecentActivity(userId) {
    console.log(`[Dashboard] Loading recent activity for user: ${userId}`);
    if (!activityList) {
        console.warn('[Dashboard] Activity list element not found');
        return;
    }

    try {
        const activitiesQuery = query(
            collection(db, "activities"),
            where("userId", "==", userId),
            orderBy("timestamp", "desc"),
            limit(5)
        );

        console.log('[Dashboard] Fetching recent activities');
        const activities = await getDocs(activitiesQuery);
        activityList.innerHTML = '';

        console.log(`[Dashboard] Retrieved ${activities.size} activities`);
        activities.forEach(doc => {
            const activity = doc.data();
            console.log('[Dashboard] Processing activity:', activity);
            
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
            console.log('[Dashboard] No activities found');
            activityList.innerHTML = '<p class="text-gray-500 text-center py-4">No recent activity</p>';
        }
    } catch (error) {
        console.error('[Dashboard] Error loading activities:', error);
    }
}

function getActivityIcon(type) {
    const icons = {
        'application': 'fas fa-paper-plane',
        'interview': 'fas fa-calendar-check',
        'profile': 'fas fa-user-edit',
        'cv': 'fas fa-file-alt',
        'default': 'fas fa-bell'
    };
    const icon = icons[type] || icons.default;
    console.log(`[Dashboard] Getting icon for activity type ${type}: ${icon}`);
    return icon;
}

function formatTimestamp(timestamp) {
    if (!timestamp) {
        console.warn('[Dashboard] No timestamp provided for formatting');
        return '';
    }
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const formatted = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((date - new Date()) / (1000 * 60 * 60 * 24)),
        'day'
    );
    console.log(`[Dashboard] Formatted timestamp: ${formatted}`);
    return formatted;
}