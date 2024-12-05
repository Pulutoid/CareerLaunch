// dashboard.js
import { auth, db, checkAuth } from './auth.js';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Debug utility
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry, data);

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.textContent += logEntry + '\n';
        if (data) {
            debugLog.textContent += JSON.stringify(data, null, 2) + '\n';
        }
        debugLog.textContent += '------------------------\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

// Check Firestore connection
async function checkFirestoreConnection() {
    debugLog('Checking Firestore connection...');
    try {
        const testDoc = await getDoc(doc(db, "test", "test"));
        debugLog('Firestore connection test:', { success: true });
        return true;
    } catch (error) {
        debugLog('Firestore connection error:', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        return false;
    }
}

// Test Firestore Access
async function testFirestoreAccess() {
    debugLog('🔍 Testing Firestore access...');

    try {
        // First, test if db is defined
        if (!db) {
            debugLog('❌ ERROR: Firebase db object is undefined');
            return false;
        }
        debugLog('✓ Firebase db object exists');

        // Try to write to a test collection
        const testData = {
            timestamp: new Date(),
            test: 'test'
        };

        // Test write
        debugLog('Attempting to write test document...');
        const testRef = doc(db, 'test', 'test-doc');
        await setDoc(testRef, testData);
        debugLog('✓ Successfully wrote to Firestore');

        // Test read
        debugLog('Attempting to read test document...');
        const testDoc = await getDoc(testRef);
        if (testDoc.exists()) {
            debugLog('✓ Successfully read from Firestore', testDoc.data());
        } else {
            debugLog('❌ Test document not found');
            return false;
        }

        debugLog('✅ All Firestore tests passed');
        return true;

    } catch (error) {
        debugLog('❌ Firestore test failed:', {
            errorCode: error.code,
            errorMessage: error.message,
            fullError: error
        });
        return false;
    }
}

let activeInterviewSection = null;
// Update profile display
function updateProfileDisplay(userData) {
    debugLog('Updating profile display with user data', userData);

    const elements = {
        userName: document.getElementById('userName'),
        studentId: document.getElementById('studentId'),
        userMajor: document.getElementById('userMajor'),
        userGPA: document.getElementById('userGPA'),
        userSkills: document.getElementById('userSkills'),
        userGradDate: document.getElementById('userGradDate')
    };

    // Log which elements were found
    debugLog('Profile elements found:',
        Object.fromEntries(
            Object.entries(elements)
                .map(([key, element]) => [key, !!element])
        )
    );

    // Update each element if it exists
    if (elements.userName) elements.userName.textContent = userData.username || 'Student';
    if (elements.studentId) elements.studentId.textContent = `Student ID: ${userData.studentId || 'Not set'}`;
    if (elements.userMajor) elements.userMajor.textContent = `Major: ${userData.major || 'Not set'}`;
    if (elements.userGPA) elements.userGPA.textContent = `GPA: ${userData.gpa || 'Not set'}`;
    if (elements.userSkills) elements.userSkills.textContent = `Skills: ${Array.isArray(userData.skills) ? userData.skills.join(', ') : 'None added'}`;
    if (elements.userGradDate) elements.userGradDate.textContent = `Expected Graduation: ${userData.graduationDate || 'Not set'}`;

    debugLog('Profile display updated');
}



console.log('[Dashboard] Initializing dashboard module');

document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Page loaded, initializing dashboard');

    // Add debug panel toggle
    const toggleDebug = document.getElementById('toggleDebug');
    const debugPanel = document.getElementById('debugPanel');
    if (toggleDebug && debugPanel) {
        toggleDebug.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            toggleDebug.textContent = debugPanel.classList.contains('hidden')
                ? 'Show Debug Info'
                : 'Hide Debug Info';
        });
    }

    // Get userId and validate
    const userId = localStorage.getItem('loggedInUserId');
    const accountType = localStorage.getItem('accountType');

    debugLog('Checking user credentials', {
        userIdFound: !!userId,
        accountType: accountType
    });

    if (!userId) {
        debugLog('No user ID found in localStorage, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    // Check Firestore connection first
    const isConnected = await checkFirestoreConnection();
    if (!isConnected) {
        debugLog('Failed to connect to Firestore, showing error message');
        const debugLog = document.getElementById('debugLog');
        if (debugLog) {
            debugLog.textContent += "⚠️ Failed to connect to Firebase. Please check:\n";
            debugLog.textContent += "1. Firebase config is correct\n";
            debugLog.textContent += "2. Internet connection is stable\n";
            debugLog.textContent += "3. Firebase project is active\n";
        }
        return;
    }

    try {
        // Fetch user data
        debugLog(`Attempting to fetch user data`, { userId, accountType });
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            debugLog('No user document found in Firestore', { userId });
            document.getElementById('debugPanel').classList.remove('hidden');
            return;
        }

        const userData = userDoc.data();
        debugLog('User data fetched successfully', {
            hasUsername: !!userData.username,
            hasEmail: !!userData.email,
            hasStudentId: !!userData.studentId,
            fields: Object.keys(userData)
        });

        // Update profile display
        updateProfileDisplay(userData);

        // Update completion percentage
        const completionPercentage = calculateProfileCompletion(userData);
        const progressBar = document.querySelector('#profileCompletion .bg-kfupm-500');
        const percentageText = document.querySelector('#profileCompletion p');

        if (progressBar) {
            progressBar.style.width = `${completionPercentage}%`;
            debugLog('Updated progress bar', { completionPercentage });
        }
        if (percentageText) {
            percentageText.textContent = `Profile completion: ${completionPercentage}%`;
        }

        // Update stats
        if (accountType === 'student') {
            await updateStudentStats(userId);
        }

        // Initialize activity chart
        initializeActivityChart(userId, accountType);

        // Load recent activity
        await loadRecentActivity(userId);
        // Load user's CVs
        await loadUserCVs(userId);

        // Initialize interview counts and data
        await loadPendingInterviews();
        await loadConfirmedInterviews();
        debugLog('🎯 Initial interview data loaded');

    } catch (error) {
        debugLog('Error loading dashboard:', {
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        // Show debug panel automatically when there's an error
        document.getElementById('debugPanel').classList.remove('hidden');
    }

    const togglePending = document.getElementById('togglePending');
    const toggleConfirmed = document.getElementById('toggleConfirmed');
    const pendingSection = document.getElementById('pendingInterviews');
    const confirmedSection = document.getElementById('confirmedInterviews');

    if (togglePending && toggleConfirmed) {
        togglePending.addEventListener('click', () => toggleInterviewSection('pending'));
        toggleConfirmed.addEventListener('click', () => toggleInterviewSection('confirmed'));
    }



});

function toggleInterviewSection(section) {
    debugLog('🔄 Toggling interview section', { section });

    const sections = {
        pending: {
            button: document.getElementById('togglePending'),
            content: document.getElementById('pendingInterviews')
        },
        confirmed: {
            button: document.getElementById('toggleConfirmed'),
            content: document.getElementById('confirmedInterviews')
        }
    };

    if (activeInterviewSection === section) {
        // Hide section if clicking the active one
        sections[section].content.classList.add('hidden');
        sections[section].button.classList.remove('text-academic-primary');
        activeInterviewSection = null;
    } else {
        // Hide all sections first
        Object.values(sections).forEach(s => {
            s.content.classList.add('hidden');
            s.button.classList.remove('text-academic-primary');
        });

        // Show selected section
        sections[section].content.classList.remove('hidden');
        sections[section].button.classList.add('text-academic-primary');
        activeInterviewSection = section;

        // Load content if needed
        if (section === 'pending') {
            loadPendingInterviews();
        } else {
            loadConfirmedInterviews();
        }
    }
}

async function loadPendingInterviews() {
    debugLog('📥 Starting to load pending interviews');
    const container = document.getElementById('pendingInterviewsList');

    if (!container) {
        debugLog('❌ pendingInterviewsList container not found in DOM');
        return;
    }

    try {
        const userId = localStorage.getItem('loggedInUserId');
        debugLog('🔍 Looking for interviews with userId:', userId);

        // Log the query we're about to make
        debugLog('📊 Creating query with params:', {
            collection: 'interviews',
            studentId: userId,
            status: 'pending'
        });

        const interviewsQuery = query(
            collection(db, "interviews"),
            where("studentId", "==", userId),
            where("status", "==", "pending")
        );

        debugLog('🔄 Executing query...');
        const snapshot = await getDocs(interviewsQuery);

        debugLog('📦 Query results:', {
            empty: snapshot.empty,
            size: snapshot.size,
            docs: snapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data()
            }))
        });

        container.innerHTML = '';

        if (snapshot.empty) {
            debugLog('ℹ️ No pending interviews found');
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    No pending interview requests
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const interview = doc.data();
            debugLog('🎯 Processing interview:', {
                id: doc.id,
                companyName: interview.companyName,
                status: interview.status,
                data: interview
            });
            container.appendChild(createInterviewCard(doc.id, interview, 'pending'));
        });

        // Update counter
        const countElement = document.querySelector('.pending-count');
        if (countElement) {
            countElement.textContent = snapshot.size;
            debugLog('🔢 Updated pending count:', snapshot.size);
        } else {
            debugLog('❌ Could not find pending-count element');
        }

    } catch (error) {
        debugLog('❌ Error loading pending interviews:', {
            error: error.message,
            stack: error.stack,
            code: error.code
        });
        container.innerHTML = `
            <div class="text-center text-red-500 py-4">
                Error loading interview requests
            </div>`;
    }
}

async function loadConfirmedInterviews() {
    debugLog('📥 Loading confirmed interviews');
    const container = document.getElementById('confirmedInterviewsList');
    if (!container) return;

    try {
        const userId = localStorage.getItem('loggedInUserId');
        const interviewsQuery = query(
            collection(db, "interviews"),
            where("studentId", "==", userId),
            where("status", "==", "confirmed")
        );

        const snapshot = await getDocs(interviewsQuery);
        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    No confirmed interviews yet
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const interview = doc.data();
            container.appendChild(createInterviewCard(doc.id, interview, 'confirmed'));
        });

        // Update counter
        document.querySelector('.confirmed-count').textContent = snapshot.size;

    } catch (error) {
        debugLog('❌ Error loading confirmed interviews:', error);
        container.innerHTML = `
            <div class="text-center text-red-500 py-4">
                Error loading confirmed interviews
            </div>`;
    }
}

function createInterviewCard(id, interview, type) {
    debugLog('🎨 Creating interview card', { id, type, interview });

    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm border border-gray-100 p-6';

    // Get first proposed time or fallback
    const firstTime = interview.proposedTimes?.[0];
    const formattedDate = firstTime ? new Date(firstTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Time to be determined';

    card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h4 class="font-medium text-lg text-gray-900">${interview.companyName || 'Company'}</h4>
                <p class="text-sm text-gray-600">${interview.position || 'Position not specified'}</p>
                <p class="text-sm text-gray-500 mt-2">
                    <i class="fas fa-calendar-alt mr-2"></i>${formattedDate}
                </p>
                ${interview.location ? `
                    <p class="text-sm text-gray-500">
                        <i class="fas fa-location-dot mr-2"></i>${interview.location}
                    </p>
                ` : ''}
                ${interview.duration ? `
                    <p class="text-sm text-gray-500">
                        <i class="fas fa-clock mr-2"></i>Duration: ${interview.duration} minutes
                    </p>
                ` : ''}
            </div>
            <div class="flex flex-col gap-2">
                <button onclick="viewInterviewDetails('${id}')" 
                    class="px-4 py-2 text-academic-primary border border-academic-primary/20 rounded-lg hover:bg-academic-warm/10 transition-colors">
                    <i class="fas fa-eye mr-2"></i>View Details
                </button>
                ${type === 'pending' ? `
                    <button onclick="handleInterview('${id}', 'accept')" 
                        class="px-4 py-2 bg-academic-primary text-white rounded-lg hover:bg-academic-dark transition-colors">
                        Accept
                    </button>
                    <button onclick="handleInterview('${id}', 'decline')"
                        class="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        Decline
                    </button>
                ` : ''}
            </div>
        </div>
        ${interview.notes ? `
            <div class="mt-4 pt-4 border-t border-gray-100">
                <p class="text-sm text-gray-600">${interview.notes}</p>
            </div>
        ` : ''}
    `;

    return card;
}



// Add this function and make it available globally
window.handleInterview = async (interviewId, action) => {
    debugLog('🤝 Handling interview action', { interviewId, action });

    try {
        const interviewRef = doc(db, "interviews", interviewId);

        if (action === 'accept') {
            await updateDoc(interviewRef, {
                status: 'confirmed',
                confirmedAt: serverTimestamp()
            });
            debugLog('✅ Interview accepted');
        } else {
            await updateDoc(interviewRef, {
                status: 'declined',
                declinedAt: serverTimestamp()
            });
            debugLog('❌ Interview declined');
        }

        // Refresh both sections
        loadPendingInterviews();
        loadConfirmedInterviews();

    } catch (error) {
        debugLog('❌ Error handling interview:', error);
        alert('Error updating interview status. Please try again.');
    }
};

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
    debugLog('📬 Loading recent applications...');

    const activityList = document.getElementById('applicationsTable');
    if (!activityList) {
        debugLog('⚠️ Applications table not found');
        return;
    }

    try {
        const applicationsQuery = query(
            collection(db, "applications"),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(applicationsQuery);
        activityList.innerHTML = '';

        debugLog(`📊 Found ${querySnapshot.size} applications`);

        if (querySnapshot.empty) {
            activityList.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-500 mb-4">No applications submitted yet</p>
                    <a href="job-board.html" 
                       class="inline-flex items-center justify-center bg-academic-primary text-white px-6 py-2.5 rounded-lg hover:bg-academic-dark transition-colors">
                        <i class="fas fa-search mr-2"></i>Browse Jobs
                    </a>
                </div>`;
            return;
        }

        querySnapshot.forEach(doc => {
            const application = doc.data();
            const submittedDate = application.createdAt ?
                new Date(application.createdAt.toDate()).toLocaleDateString() : 'N/A';

            const applicationCard = document.createElement('div');
            applicationCard.className = 'bg-white rounded-lg shadow-md p-6 mb-4';
            applicationCard.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="font-medium text-lg text-gray-900">${application.jobTitle}</h3>
                        <p class="text-sm text-gray-600">${application.companyName}</p>
                        <p class="text-xs text-gray-500 mt-1">Applied: ${submittedDate}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm ${getStatusStyle(application.status)}">
                        ${application.status}
                    </span>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <div class="text-sm text-gray-600">
                        <p class="line-clamp-2">${application.coverLetter}</p>
                    </div>
                    <div class="mt-4 flex justify-between items-center">
                        <span class="text-sm text-gray-500">
                            CV Used: ${application.cvId}
                        </span>
                        <button onclick="viewApplicationDetails('${doc.id}')" 
                            class="text-kfupm-500 hover:text-kfupm-600 text-sm font-medium">
                            View Details
                        </button>
                    </div>
                </div>
            `;
            activityList.appendChild(applicationCard);
        });

    } catch (error) {
        debugLog('❌ Error loading applications:', error);
        activityList.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4">
                Error loading applications. Please try again later.
            </div>`;
    }
}

// Add this helper function for status styling
function getStatusStyle(status) {
    const styles = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'reviewing': 'bg-blue-100 text-blue-800',
        'accepted': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800',
        'default': 'bg-gray-100 text-gray-600'
    };
    return styles[status?.toLowerCase()] || styles.default;
}


async function loadUserCVs(userId) {
    debugLog('📄 Loading user CVs...');

    const cvList = document.getElementById('cvList');
    if (!cvList) {
        debugLog('⚠️ CV list element not found');
        return;
    }

    try {
        // Query CVs where userId matches
        const cvsQuery = query(
            collection(db, "cvs"),
            where("userId", "==", userId)
        );

        const cvSnapshot = await getDocs(cvsQuery);

        debugLog(`Found ${cvSnapshot.size} CVs`);

        // Clear loading message
        cvList.innerHTML = '';

        if (cvSnapshot.empty) {
            cvList.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-500 mb-4">No CVs created yet</p>
                    <a href="cv-builder.html" 
                       class="inline-flex items-center justify-center bg-academic-primary text-white px-6 py-2.5 rounded-lg hover:bg-academic-dark transition-colors">
                        <i class="fas fa-plus-circle mr-2"></i>Create Your First CV
                    </a>
                </div>`;
            return;
        }

        // Display each CV
        cvSnapshot.forEach(doc => {
            const cv = doc.data();
            const lastModified = cv.lastModified ? new Date(cv.lastModified).toLocaleDateString() : 'N/A';

            const cvCard = document.createElement('div');
            cvCard.className = 'bg-academic-warm/5 rounded-lg p-6 border border-academic-tertiary/20';
            cvCard.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="font-medium text-academic-primary">${cv.name || 'Untitled CV'}</h3>
                        <p class="text-sm text-gray-500">Last modified: ${lastModified}</p>
                    </div>
                    <span class="text-xs text-academic-tertiary bg-academic-warm/10 px-2 py-1 rounded">
                        ${cv.template || 'Standard'} Template
                    </span>
                </div>


                <div class="flex gap-2">
                    <button onclick="window.location.href='cv-builder.html?cvId=${doc.id}'"
                            class="flex-1 text-academic-primary hover:bg-academic-warm/10 px-3 py-1.5 rounded text-sm transition-colors">
                        <i class="fas fa-edit mr-1"></i> Edit & Download
                    </button>
                   
                    <button onclick="deleteCV('${doc.id}')"
                            class="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded text-sm transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cvList.appendChild(cvCard);
        });


    } catch (error) {
        debugLog('❌ Error loading CVs:', error);
        cvList.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4">
                Error loading CVs. Please try again later.
            </div>`;
    }
}

// Add delete CV function
async function deleteCV(cvId) {
    debugLog('🗑️ Attempting to delete CV:', cvId);

    if (!confirm('Are you sure you want to delete this CV?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, "cvs", cvId));
        debugLog('✅ CV deleted successfully');
        // Reload CVs
        const userId = localStorage.getItem('loggedInUserId');
        if (userId) {
            loadUserCVs(userId);
        }
    } catch (error) {
        debugLog('❌ Error deleting CV:', error);
        alert('Error deleting CV. Please try again.');
    }
}

// Make deleteCV available globally
window.deleteCV = deleteCV;


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

window.viewApplicationDetails = (applicationId) => {
    debugLog('🔍 Viewing application details', { applicationId });
    // Implement application details modal here
    alert('Application details feature coming soon!');
};


// Add this function to dashboard.js
window.debugCheckInterviews = async () => {
    const userId = localStorage.getItem('loggedInUserId');
    debugLog('🔍 Debug checking interviews for user:', userId);

    try {
        // Check all interviews regardless of status
        const allInterviewsQuery = query(
            collection(db, "interviews")
        );

        const snapshot = await getDocs(allInterviewsQuery);

        debugLog('📊 All interviews in database:', {
            total: snapshot.size,
            interviews: snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        });

        // Check specifically for user's interviews
        const userInterviewsQuery = query(
            collection(db, "interviews"),
            where("studentId", "==", userId)
        );

        const userSnapshot = await getDocs(userInterviewsQuery);

        debugLog('👤 User specific interviews:', {
            total: userSnapshot.size,
            interviews: userSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        });

    } catch (error) {
        debugLog('❌ Error during interview debug check:', {
            error: error.message,
            stack: error.stack
        });
    }
};

// Add near your other window functions
window.viewInterviewDetails = async (interviewId) => {
    debugLog('🔍 Opening interview details', { interviewId });
    const modal = document.getElementById('interviewDetailsModal');
    const modalContent = document.getElementById('interviewModalContent');
    const modalTitle = document.getElementById('modalTitle');

    try {
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (!interviewDoc.exists()) {
            debugLog('❌ Interview not found');
            return;
        }

        const interview = interviewDoc.data();
        debugLog('📄 Interview data loaded', interview);

        modalTitle.textContent = `Interview with ${interview.companyName || 'Company'}`;

        // Format proposed times safely
        const timesList = interview.proposedTimes?.map(timestamp => {
            // Handle both Firestore Timestamps and regular dates
            const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
            return isNaN(date.getTime()) ? null : `
                <div class="p-3 bg-academic-warm/5 rounded-lg">
                    <time datetime="${date.toISOString()}" class="font-medium">
                        ${date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}
                    </time>
                </div>
            `;
        }).filter(Boolean).join('') || 'No times proposed';

        modalContent.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Position</h4>
                    <p class="text-gray-600">${interview.position || 'Not specified'}</p>
                </div>

                <div>
                    <h4 class="text-lg font-medium text-gray-900">Location</h4>
                    <p class="text-gray-600">${interview.location || 'To be determined'}</p>
                </div>

                <div>
                    <h4 class="text-lg font-medium text-gray-900">Duration</h4>
                    <p class="text-gray-600">${interview.duration ? `${interview.duration} minutes` : 'Not specified'}</p>
                </div>

                <div>
                    <h4 class="text-lg font-medium text-gray-900">Proposed Interview Times</h4>
                    <div class="mt-2 space-y-2">
                        ${timesList}
                    </div>
                </div>

                ${interview.notes ? `
                    <div>
                        <h4 class="text-lg font-medium text-gray-900">Additional Notes</h4>
                        <p class="text-gray-600">${interview.notes}</p>
                    </div>
                ` : ''}

                ${interview.status === 'pending' ? `
                    <div class="pt-4 border-t border-gray-200">
                        <h4 class="text-lg font-medium text-gray-900 mb-2">Response Required</h4>
                        <p class="text-gray-600 mb-4">Please accept one of the proposed times or decline the interview request.</p>
                        <div class="flex gap-3">
                            <button onclick="handleInterview('${interviewId}', 'accept')" 
                                class="flex-1 px-4 py-2 bg-academic-primary text-white rounded-lg hover:bg-academic-dark transition-colors">
                                Accept Interview
                            </button>
                            <button onclick="handleInterview('${interviewId}', 'decline')"
                                class="flex-1 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                Decline
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');

    } catch (error) {
        debugLog('❌ Error loading interview details:', error);
        alert('Error loading interview details. Please try again.');
    }
};

window.closeInterviewModal = () => {
    debugLog('🔍 Closing interview details modal');
    document.getElementById('interviewDetailsModal').classList.add('hidden');
};