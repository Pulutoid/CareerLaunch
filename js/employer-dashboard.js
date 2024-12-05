// employer-dashboard.js
import { auth, db, checkAuth } from './auth.js';
import {
    doc, getDoc, collection, getDocs,
    query, where, orderBy, limit, serverTimestamp,
    addDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { initializeJobPosting } from './job-posting.js';
let currentJobId = null;

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
                    <span id="application-count-${job.id}">...</span>
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

            // Update application count after adding the row
            updateApplicationCount(job.id);
        });

    } catch (error) {
        debugLog('❌ Error loading jobs:', error);
        table.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error loading jobs</td></tr>`;
    }
}
async function updateApplicationCount(jobId) {
    debugLog('📊 Updating application count', { jobId });

    try {
        const applicationsQuery = query(
            collection(db, "applications"),
            where("jobId", "==", jobId)
        );

        const querySnapshot = await getDocs(applicationsQuery);
        const count = querySnapshot.size;

        const countElement = document.getElementById(`application-count-${jobId}`);
        if (countElement) {
            countElement.textContent = count;
            debugLog('✅ Updated application count', { jobId, count });
        }

        return count;
    } catch (error) {
        debugLog('❌ Error updating application count', error);
        return 0;
    }
}

async function loadJobApplications(jobId) {
    debugLog('📨 Loading applications for job', { jobId });
    const container = document.getElementById('applicationsContainer');

    try {
        const applicationsQuery = query(
            collection(db, "applications"),
            where("jobId", "==", jobId)
        );

        const querySnapshot = await getDocs(applicationsQuery);

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p class="mb-2">No applications received yet</p>
                    <p class="text-sm">Applications will appear here once students apply</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        querySnapshot.forEach(doc => {
            const application = doc.data();
            container.innerHTML += `
            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h5 class="font-medium text-gray-900">${application.userName || 'Anonymous'}</h5>
                        <p class="text-sm text-gray-500">Applied: ${formatDate(application.createdAt)}</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full ${getApplicationStatusStyle(application.status)}">
                        ${application.status}
                    </span>
                </div>
                <p class="text-sm text-gray-600 mt-2 line-clamp-3">${application.coverLetter || 'No cover letter provided'}</p>
                <div class="mt-3 flex gap-2">
                    <button onclick="viewCV('${application.cvId}', '${doc.id}')" 
                        class="text-sm text-academic-tertiary hover:text-academic-primary">
                        <i class="fas fa-file-alt mr-1"></i> View CV
                    </button>
                </div>
             <div class="mt-3 pt-3 border-t border-gray-200">
    <button onclick="showInterviewModal('${doc.id}', '${application.userId}', '${application.userName}')" 
        class="w-full py-2 px-4 bg-academic-primary text-white rounded-md hover:bg-academic-dark transition-colors text-sm">
        <i class="fas fa-calendar-plus mr-1"></i> Schedule Interview
    </button>
</div>
            </div>
        `;
        });

    } catch (error) {
        debugLog('❌ Error loading applications:', error);
        container.innerHTML = `
            <div class="text-center text-red-500">
                Error loading applications. Please try again.
            </div>`;
    }
}

function getApplicationStatusStyle(status) {
    const styles = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'reviewing': 'bg-blue-100 text-blue-800',
        'interview_requested': 'bg-purple-100 text-purple-800',  // Added this line
        'accepted': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
}


// Update the viewJobDetails function to also load applications
window.viewJobDetails = async (jobId) => {
    debugLog('🔍 Viewing job details', { jobId });
    currentJobId = jobId
    const modal = document.getElementById('jobDetailsModal');
    const content = document.getElementById('modalContent');

    try {
        // Load job details
        const jobDoc = await getDoc(doc(db, "jobs", jobId));
        if (!jobDoc.exists()) {
            throw new Error('Job not found');
        }

        const job = jobDoc.data();
        document.getElementById('modalJobTitle').textContent = job.title;

        // Update job details panel
        content.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Overview</h4>
                    <div class="mt-2 flex flex-wrap gap-4">
                        <span class="text-sm text-gray-600">
                            <i class="fas fa-building mr-1"></i> ${job.department}
                        </span>
                        <span class="text-sm text-gray-600">
                            <i class="fas fa-map-marker-alt mr-1"></i> ${job.location}
                        </span>
                        <span class="text-sm text-gray-600">
                            <i class="fas fa-clock mr-1"></i> ${job.employmentType}
                        </span>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Description</h4>
                    <p class="mt-2 text-gray-600">${job.description}</p>
                </div>
                
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Requirements</h4>
                    <p class="mt-2 text-gray-600">${job.requirements}</p>
                </div>
                
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Required Skills</h4>
                    <div class="mt-2 flex flex-wrap gap-2">
                        ${job.skills.map(skill => `
                            <span class="px-3 py-1 bg-academic-warm/10 text-academic-primary rounded-full text-sm">
                                ${skill}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <div class="pt-4 border-t">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-500">
                            Posted: ${formatDate(job.createdAt)}
                        </span>
                        <span class="text-sm text-gray-500">
                            Deadline: ${formatDate(job.deadline)}
                        </span>
                    </div>
                </div>
            </div>
        `;

        // Load applications
        debugLog('📥 Loading applications for job', { jobId });
        const applicationsQuery = query(
            collection(db, "applications"),
            where("jobId", "==", jobId)
        );

        const applicationsSnapshot = await getDocs(applicationsQuery);
        const applications = applicationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        debugLog('📊 Found applications', { count: applications.length });
        updateApplicationsDisplay(jobId, applications);

        // Show modal
        modal.classList.remove('hidden');

    } catch (error) {
        debugLog('❌ Error loading job details:', error);
        showMessage('message', 'Error loading job details', 'error');
    }
};


window.closeJobModal = () => {
    debugLog('🔍 Closing job modal');
    document.getElementById('jobDetailsModal').classList.add('hidden');
    document.getElementById('applicationModal').classList.add('hidden'); // Also close application modal if open
};

// Close the job details modal
window.closeJobDetailsModal = () => {
    debugLog('🔍 Closing job details modal');
    document.getElementById('jobDetailsModal').classList.add('hidden');
};

// View CV function
window.viewCV = async (cvId, applicationId = null) => {
    debugLog('📄 Opening CV viewer', { cvId, applicationId });

    try {
        // Verify CV exists first
        const cvDoc = await getDoc(doc(db, "cvs", cvId));
        if (!cvDoc.exists()) {
            debugLog('❌ CV not found', { cvId });
            showMessage('message', 'CV not found', 'error');
            return;
        }

        // Build URL with both CV and application context
        let cvViewerUrl = `cv-viewer.html?cvId=${cvId}`;
        if (applicationId) {
            cvViewerUrl += `&applicationId=${applicationId}`;
        }

        // Open in new tab
        const newWindow = window.open(cvViewerUrl, '_blank');
        if (!newWindow) {
            debugLog('⚠️ Popup blocked, showing fallback message');
            showMessage('message', 'Please allow popups to view CV', 'warning');
        }

        debugLog('✅ CV viewer opened', { cvId, applicationId });
    } catch (error) {
        debugLog('❌ Error viewing CV', error);
        showMessage('message', 'Error loading CV', 'error');
    }
};

window.requestInterview = async (applicationId, studentId) => {
    debugLog('📅 Requesting interview', { applicationId, studentId });

    try {
        const employerId = localStorage.getItem('loggedInUserId');
        if (!employerId) {
            throw new Error('Not authenticated');
        }

        // Create interview request
        const interviewData = {
            applicationId: applicationId,
            employerId: employerId,
            studentId: studentId,
            status: 'pending',
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        };

        debugLog('💾 Creating interview request', interviewData);

        const interviewRef = await addDoc(collection(db, "interviews"), interviewData);

        // Update application to show interview requested
        await updateDoc(doc(db, "applications", applicationId), {
            hasInterviewRequest: true,
            lastUpdated: serverTimestamp()
        });

        debugLog('✅ Interview request created successfully', { interviewId: interviewRef.id });
        showMessage('message', 'Interview request sent successfully!', 'success');

    } catch (error) {
        debugLog('❌ Error requesting interview', error);
        showMessage('message', 'Error sending interview request', 'error');
    }
};

let currentInterviewData = null;

window.showInterviewModal = (applicationId, studentId, studentName) => {
    debugLog('🎯 Opening interview modal', { applicationId, studentId, studentName });

    // Store data for form submission
    currentInterviewData = { applicationId, studentId, studentName };

    // Reset form
    document.getElementById('interviewRequestForm').reset();

    // Set minimum date to tomorrow for all date inputs
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateTime = tomorrow.toISOString().slice(0, 16);

    document.querySelectorAll('.proposed-date').forEach(input => {
        input.min = minDateTime;
    });

    // Show modal
    document.getElementById('interviewRequestModal').classList.remove('hidden');
};

window.closeInterviewModal = () => {
    debugLog('🔍 Closing interview modal');

    // Reset form state
    const submitBtn = document.getElementById('submitInterviewBtn');
    const successMsg = document.getElementById('interviewSuccessMessage');

    submitBtn.style.display = 'block';
    submitBtn.style.opacity = '1';
    successMsg.classList.add('hidden');

    // Clear form
    document.getElementById('interviewRequestForm').reset();

    // Hide modal
    document.getElementById('interviewRequestModal').classList.add('hidden');
    currentInterviewData = null;
};

// Add this after your existing event listeners in the DOMContentLoaded section
document.getElementById('interviewRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    debugLog('📝 Processing interview request submission');

    try {
        if (!currentInterviewData) {
            throw new Error('No interview data found');
        }

        const employerId = localStorage.getItem('loggedInUserId');
        const companyName = localStorage.getItem('companyName');

        // Collect proposed dates (filter out empty ones)
        const proposedDates = Array.from(document.querySelectorAll('.proposed-date'))
            .map(input => input.value)
            .filter(date => date);

        if (proposedDates.length === 0) {
            throw new Error('Please provide at least one proposed date');
        }

        debugLog('🕒 Collected dates', {
            allInputs: document.querySelectorAll('.proposed-date').length,
            proposedDates: proposedDates,
            values: Array.from(document.querySelectorAll('.proposed-date')).map(input => input.value)
        });

        const interviewData = {
            applicationId: currentInterviewData.applicationId,
            employerId: employerId,
            jobId: currentJobId,
            companyName: companyName,
            studentId: currentInterviewData.studentId,
            studentName: currentInterviewData.studentName,
            position: document.getElementById('interviewType').value,
            proposedTimes: proposedDates.map(date => new Date(date)), // Convert to Date objects
            duration: parseInt(document.getElementById('interviewDuration').value),
            location: document.getElementById('interviewLocation').value,
            notes: document.getElementById('interviewNotes').value,
            status: 'pending',
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        };

        const interviewRef = await addDoc(collection(db, "interviews"), interviewData);

        // Update application status and add interview reference
        await updateDoc(doc(db, "applications", currentInterviewData.applicationId), {
            hasInterviewRequest: true,
            status: 'interview_requested',
            lastUpdated: serverTimestamp(),
            interviewId: interviewRef.id
        });

        // Update the status badge in the UI immediately
        const statusBadge = document.querySelector(`[data-application-id="${currentInterviewData.applicationId}"] .status-badge`);
        if (statusBadge) {
            statusBadge.className = `px-2 py-1 text-xs rounded-full ${getApplicationStatusStyle('interview_requested')}`;
            statusBadge.textContent = 'Interview Requested';
        }

        debugLog('✅ Updated application status to interview_requested', { applicationId: currentInterviewData.applicationId });

        // Success handling - ADDED HERE instead of in catch block
        debugLog('✅ Interview request created successfully', { interviewId: interviewRef.id });

        // Show success state
        const submitBtn = document.getElementById('submitInterviewBtn');
        const successMsg = document.getElementById('interviewSuccessMessage');

        // Hide submit button with fade
        submitBtn.style.opacity = '0';
        submitBtn.style.transition = 'opacity 0.3s';

        // Show success message after brief delay
        setTimeout(() => {
            submitBtn.style.display = 'none';
            successMsg.classList.remove('hidden');
            successMsg.style.opacity = '0';
            successMsg.style.transition = 'opacity 0.3s';

            requestAnimationFrame(() => {
                successMsg.style.opacity = '1';
            });
        }, 300);

    } catch (error) {
        debugLog('❌ Error creating interview request', error);
        showMessage('message', error.message || 'Error sending interview request', 'error');
    }
});


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

function updateApplicationsDisplay(jobId, applications) {
    debugLog('📊 Updating applications display', { jobId, applicationCount: applications.length });

    const containers = {
        pending: document.getElementById('pendingApplications'),
        interview: document.getElementById('interviewApplications'),
        confirmed: document.getElementById('confirmedApplications')
    };

    // Clear all containers
    Object.values(containers).forEach(container => {
        if (container) container.innerHTML = '';
    });

    // Counter for different statuses
    const counts = {
        pending: 0,
        interview: 0,
        confirmed: 0
    };

    applications.forEach(application => {
        const { container, count } = getApplicationContainer(application.status);
        if (containers[container]) {
            counts[count]++;
            containers[container].appendChild(
                createApplicationCard(application)
            );
        }
    });

    // Update counters in UI
    document.querySelector('.pending-count').textContent = counts.pending;
    document.querySelector('.interview-count').textContent = counts.interview;
    document.querySelector('.confirmed-count').textContent = counts.confirmed;

    // Show "no applications" message if needed
    Object.entries(containers).forEach(([key, container]) => {
        if (container && container.children.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-4 text-sm">
                    No ${key} applications
                </div>`;
        }
    });
}

function getApplicationContainer(status) {
    switch (status?.toLowerCase()) {
        case 'pending':
        case 'reviewing':
            return { container: 'pending', count: 'pending' };
        case 'interview_requested':
            return { container: 'interview', count: 'interview' };
        case 'interview_confirmed':
            return { container: 'confirmed', count: 'confirmed' };
        case 'interview_declined':
            return { container: 'pending', count: 'pending' }; // Show declined ones in pending
        default:
            return { container: 'pending', count: 'pending' };
    }
}

function createApplicationCard(application) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-sm border border-gray-100 p-4';

    const statusInfo = getStatusInfo(application.status);
    const date = application.confirmedInterviewTime ?
        new Date(application.confirmedInterviewTime.toDate ?
            application.confirmedInterviewTime.toDate() :
            application.confirmedInterviewTime
        ).toLocaleString() : null;

    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-medium text-gray-900">${application.userName}</h4>
                <p class="text-sm text-gray-500">Applied: ${formatDate(application.createdAt)}</p>
            </div>
            <span class="px-2 py-1 text-xs rounded-full ${statusInfo.style}">
                ${statusInfo.label}
            </span>
        </div>
        <div class="text-sm text-gray-600 mb-3">
            <p class="line-clamp-2">${application.coverLetter}</p>
        </div>
        ${date ? `
            <div class="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                <i class="fas fa-calendar-check mr-1"></i>
                Interview scheduled: ${date}
            </div>
        ` : ''}
        <div class="flex justify-end gap-2 mt-3">
            <button onclick="viewCV('${application.cvId}')" 
                class="px-3 py-1.5 text-sm text-academic-primary hover:bg-academic-warm/10 rounded transition-colors">
                <i class="fas fa-file-alt mr-1"></i>View CV
            </button>
            ${(application.status === 'pending' || application.status === 'reviewing') ? `
                <button onclick="showInterviewModal('${application.id}', '${application.userId}', '${application.userName}')"
                    class="px-3 py-1.5 text-sm bg-academic-primary text-white rounded hover:bg-academic-dark transition-colors">
                    <i class="fas fa-calendar-plus mr-1"></i>Schedule Interview
                </button>
            ` : application.status === 'interview_requested' ? `
                <span class="text-sm text-purple-600">
                    <i class="fas fa-clock mr-1"></i>Awaiting Response
                </span>
            ` : application.status === 'interview_confirmed' ? `
                <span class="text-sm text-green-600">
                    <i class="fas fa-check-circle mr-1"></i>Interview Confirmed
                </span>
            ` : ''}
        </div>
    `;

    return card;
}

function getStatusInfo(status) {
    const statusMap = {
        'pending': {
            label: 'Pending Review',
            style: 'bg-yellow-100 text-yellow-800'
        },
        'reviewing': {
            label: 'Under Review',
            style: 'bg-blue-100 text-blue-800'
        },
        'interview_requested': {
            label: 'Interview Requested',
            style: 'bg-purple-100 text-purple-800'
        },
        'interview_confirmed': {
            label: 'Interview Scheduled',
            style: 'bg-green-100 text-green-800'
        },
        'interview_declined': {
            label: 'Interview Declined',
            style: 'bg-red-100 text-red-800'
        }
    };

    return statusMap[status] || {
        label: 'Pending',
        style: 'bg-gray-100 text-gray-600'
    };
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