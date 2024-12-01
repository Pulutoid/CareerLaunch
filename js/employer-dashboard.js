// employer-dashboard.js
import { auth, db, checkAuth } from './auth.js';
import {
    doc, getDoc, collection, getDocs,
    query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { initializeJobPosting } from './job-posting.js';

// Debug utilities
const DEBUG = true;
function debugLog(message, data = null) {
    if (!DEBUG) return;
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `🏢 [Employer] ${message}`;
    console.log(logEntry, data ? data : '');

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.textContent += `${timestamp}: ${logEntry}\n`;
        if (data) debugLog.textContent += JSON.stringify(data, null, 2) + '\n';
        debugLog.textContent += '------------------------\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('🚀 Initializing employer dashboard');
    initializeJobPosting();

    // Debug panel toggle
    const toggleDebug = document.getElementById('toggleDebug');
    const debugPanel = document.getElementById('debugPanel');
    const clearDebug = document.getElementById('clearDebug');

    if (toggleDebug && debugPanel) {
        toggleDebug.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            toggleDebug.textContent = debugPanel.classList.contains('hidden')
                ? 'Show Debug Info'
                : 'Hide Debug Info';
        });
    }

    if (clearDebug) {
        clearDebug.addEventListener('click', () => {
            if (document.getElementById('debugLog')) {
                document.getElementById('debugLog').textContent = '';
                debugLog('Debug log cleared');
            }
        });
    }

    // Verify employer access
    checkAuth(['employer']);

    // Get employer ID and validate
    const employerId = localStorage.getItem('loggedInUserId');
    if (!employerId) {
        debugLog('⚠️ No employer ID found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    try {
        // Load employer profile
        debugLog('📂 Loading employer profile');
        const employerData = await loadEmployerProfile(employerId);
        updateProfileDisplay(employerData);

        // Initialize components
        debugLog('🔄 Initializing dashboard components');
        await Promise.all([
            loadEmployerStats(employerId),
            loadJobListings(employerId),
            loadRecentApplications(employerId),
            initializeApplicationTrendsChart(employerId)
        ]);

        // Set up event listeners
        setupEventListeners();

        debugLog('✅ Dashboard initialization complete');

    } catch (error) {
        debugLog('❌ Error initializing dashboard', {
            error: error.message,
            stack: error.stack
        });
        document.getElementById('debugPanel')?.classList.remove('hidden');
    }
});

async function loadEmployerProfile(employerId) {
    debugLog('Loading employer profile', { employerId });

    try {
        const profileDoc = await getDoc(doc(db, "users", employerId));
        if (!profileDoc.exists()) {
            throw new Error('Employer profile not found');
        }

        const profileData = profileDoc.data();
        debugLog('Profile loaded successfully', profileData);
        return profileData;
    } catch (error) {
        debugLog('Error loading profile', error);
        throw error;
    }
}

function updateProfileDisplay(profileData) {
    debugLog('Updating profile display');

    // Update profile elements
    document.getElementById('companyName').textContent = profileData.companyName || 'Company Name';
    document.getElementById('companyPosition').textContent = profileData.companyPosition || 'Position';
    document.getElementById('userDisplayName').textContent = profileData.username || 'User';

    // Update completion percentage
    const completion = calculateProfileCompletion(profileData);
    const progressBar = document.querySelector('#profileCompletion .bg-kfupm-500');
    const percentageText = document.querySelector('#profileCompletion p');

    if (progressBar) progressBar.style.width = `${completion}%`;
    if (percentageText) percentageText.textContent = `Profile completion: ${completion}%`;
}

function calculateProfileCompletion(profileData) {
    const requiredFields = [
        'companyName',
        'companyPosition',
        'email',
        'phone',
        'industry',
        'companySize',
        'location'
    ];

    const completedFields = requiredFields.filter(field =>
        profileData[field] && profileData[field].toString().trim() !== ''
    );

    return Math.round((completedFields.length / requiredFields.length) * 100);
}

async function loadEmployerStats(employerId) {
    debugLog('Loading employer statistics');

    try {
        const statsDoc = await getDoc(doc(db, "statistics", employerId));
        const stats = statsDoc.data() || {};

        // Update stats display
        document.getElementById('activeJobs').textContent = stats.activeJobs || 0;
        document.getElementById('totalApplications').textContent = stats.totalApplications || 0;
        document.getElementById('profileViews').textContent = stats.profileViews || 0;
        document.getElementById('scheduledInterviews').textContent = stats.scheduledInterviews || 0;

        debugLog('Statistics updated successfully');
    } catch (error) {
        debugLog('Error loading statistics', error);
    }
}

async function loadJobListings(employerId) {
    debugLog('📜 Loading job listings - simple version');

    const table = document.getElementById('jobListingsTable');
    if (!table) return;

    table.innerHTML = `<tr><td colspan="5" class="text-center p-4">Loading...</td></tr>`;

    try {
        // Super simple query - just get all jobs for this employer
        const querySnapshot = await getDocs(collection(db, "jobs"));
        debugLog('Got jobs from Firebase:', querySnapshot.size);

        let jobs = [];
        querySnapshot.forEach(doc => {
            jobs.push({ id: doc.id, ...doc.data() });
        });

        // Sort on client side - much simpler!
        jobs.sort((a, b) => b.createdAt - a.createdAt);

        debugLog('Processed jobs:', jobs);

        if (jobs.length === 0) {
            table.innerHTML = `<tr><td colspan="5" class="text-center p-4">No jobs found</td></tr>`;
            return;
        }

        table.innerHTML = '';
        jobs.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${job.title}</div>
                    <div class="text-sm text-gray-500">${job.department || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${formatDate(job.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    ${job.applications?.length || 0}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(job.status)}">
                        ${job.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="viewJobDetails('${job.id}')" 
                        class="text-kfupm-500 hover:text-kfupm-600">
                        View Details
                    </button>
                </td>
            `;
            table.appendChild(row);
        });

    } catch (error) {
        debugLog('❌ Error loading jobs:', error);
        table.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading jobs</td></tr>`;
    }
}


async function loadRecentApplications(employerId) {
    debugLog('Loading recent applications');

    const container = document.getElementById('recentApplications');
    if (!container) return;

    try {
        const applicationsQuery = query(
            collection(db, "applications"),
            where("employerId", "==", employerId),
            orderBy("timestamp", "desc"),
            limit(5)
        );

        const applications = await getDocs(applicationsQuery);
        container.innerHTML = '';

        if (applications.empty) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    No applications received yet
                </div>`;
            return;
        }

        applications.forEach(doc => {
            const application = doc.data();
            container.innerHTML += `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <h4 class="font-medium">${application.studentName}</h4>
                        <p class="text-sm text-gray-600">${application.position}</p>
                        <p class="text-xs text-gray-500">${formatDate(application.timestamp)}</p>
                    </div>
                    <button onclick="viewApplication('${doc.id}')"
                        class="px-4 py-2 text-sm text-kfupm-500 hover:bg-kfupm-50 rounded-md">
                        Review
                    </button>
                </div>`;
        });

        debugLog('Recent applications loaded successfully');
    } catch (error) {
        debugLog('Error loading recent applications', error);
        container.innerHTML = `
            <div class="text-center text-red-500 py-4">
                Error loading applications
            </div>`;
    }
}

function initializeApplicationTrendsChart(employerId) {
    debugLog('Initializing application trends chart');

    const ctx = document.getElementById('applicationTrendsChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Applications Received',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#006B3F',
                backgroundColor: 'rgba(0, 107, 63, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
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

function setupEventListeners() {
    debugLog('🎯 Setting up event listeners');
    
    // Post new job button
    const postJobBtn = document.getElementById('postJobBtn');
    if (postJobBtn) {
        debugLog('Found post job button, adding listener');
        postJobBtn.addEventListener('click', () => {
            if (typeof window.showJobModal === 'function') {
                window.showJobModal();
            } else {
                debugLog('❌ showJobModal function not found');
            }
        });
    } else {
        debugLog('❌ Post job button not found');
    }

    // Filter buttons (your existing code)
    // ...
}


// Utility functions
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function filterJobListings(filter) {
    debugLog('Filtering job listings', { filter });
    // Implementation will depend on your filtering needs
}

// Export functions that might be needed by other modules
export {
    loadJobListings,
    filterJobListings
};

function getStatusStyle(status) {
    const styles = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-yellow-100 text-yellow-800',
        expired: 'bg-red-100 text-red-800',
        default: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || styles.default;
}

// Add this as a window function so it can be called from HTML
window.toggleJobStatus = async (jobId, currentStatus) => {
    debugLog('🔄 Toggling job status', { jobId, currentStatus });
    
    try {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await updateDoc(doc(db, "jobs", jobId), {
            status: newStatus,
            lastUpdated: serverTimestamp()
        });
        
        // Refresh the listings
        const employerId = localStorage.getItem('loggedInUserId');
        await loadJobListings(employerId, 'all');
        
        debugLog('✅ Job status updated successfully');
    } catch (error) {
        debugLog('❌ Error toggling job status', error);
    }
};