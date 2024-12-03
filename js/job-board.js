// job-board.js
import { auth, db, showMessage } from './auth.js';
import {
    collection, query, where, orderBy, getDocs, addDoc,
    serverTimestamp, doc, getDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Debug utility (enhanced version)
function debugLog(message, data = null, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
        info: '📘',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        loading: '🔄'
    }[type] || '📘';

    const logEntry = `${emoji} [JobBoard] ${message}`;
    console.log(logEntry, data ? data : '');

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.textContent += `[${timestamp}] ${logEntry}\n`;
        if (data) {
            debugLog.textContent += JSON.stringify(data, null, 2) + '\n';
        }
        debugLog.textContent += '------------------------\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}


function setupEventListeners() {
    debugLog('Setting up event listeners');

    // Search and filters
    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const typeFilter = document.getElementById('typeFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const applicationForm = document.getElementById('applicationForm');

    debugLog('Found elements', {
        searchInput: !!searchInput,
        departmentFilter: !!departmentFilter,
        typeFilter: !!typeFilter,
        clearFiltersBtn: !!clearFiltersBtn,
        applicationForm: !!applicationForm
    });

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            debugLog('Search input changed');
            filterJobs();
        }, 300));
    }

    if (departmentFilter) {
        departmentFilter.addEventListener('change', () => {
            debugLog('Department filter changed');
            filterJobs();
        });
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            debugLog('Type filter changed');
            filterJobs();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            debugLog('Clearing filters');
            clearFilters();
        });
    }

    if (applicationForm) {
        applicationForm.addEventListener('submit', (e) => {
            debugLog('Application form submitted');
            handleApplicationSubmit(e);
        });
    }
}

let currentJobId = null;
let jobsCache = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Initializing job board page');

    // Set up debug panel
    initializeDebugPanel();

    // Check authentication
    const userId = localStorage.getItem('loggedInUserId');
    const accountType = localStorage.getItem('accountType');

    debugLog('Checking user credentials', { userId, accountType });

    if (!userId || accountType !== 'student') {
        debugLog('Invalid access attempt', { userId, accountType }, 'error');
        window.location.href = 'login.html';
        return;
    }

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    debugLog('Loading initial data', null, 'loading');
    try {
        await Promise.all([
            loadJobs(),
            loadUserCVs()
        ]);
        debugLog('Initial data load complete', null, 'success');
    } catch (error) {
        debugLog('Error during initialization', error, 'error');
    }
});

function initializeDebugPanel() {
    const toggleDebug = document.getElementById('toggleDebug');
    const debugPanel = document.getElementById('debugPanel');
    const clearDebug = document.getElementById('clearDebug');

    if (toggleDebug && debugPanel) {
        toggleDebug.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            const isVisible = !debugPanel.classList.contains('hidden');
            debugLog(`Debug panel ${isVisible ? 'shown' : 'hidden'}`);
        });
    }

    if (clearDebug) {
        clearDebug.addEventListener('click', () => {
            const debugLog = document.getElementById('debugLog');
            if (debugLog) {
                debugLog.textContent = '';
                debugLog('Debug log cleared', null, 'success');
            }
        });
    }
}

async function loadJobs() {
    debugLog('📥 Loading jobs from Firestore', null, 'loading');
    const jobsGrid = document.getElementById('jobsGrid');

    try {
        // Simple query for all active jobs - no employer filter
        const jobsQuery = query(
            collection(db, "jobs"),
            where("status", "==", "active")
        );

        debugLog('🔍 Executing jobs query', { query: 'status == active' });
        const querySnapshot = await getDocs(jobsQuery);

        // Clear loading state and cache
        jobsGrid.innerHTML = '';
        jobsCache = [];
        const departments = new Set();

        debugLog(`📊 Found ${querySnapshot.size} jobs`);

        if (querySnapshot.empty) {
            debugLog('⚠️ No active jobs found');
            jobsGrid.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    No active job postings found
                </div>
            `;
            return;
        }

        querySnapshot.forEach(doc => {
            const jobData = doc.data();
            const job = {
                id: doc.id,
                title: jobData.title || 'Untitled Position',
                department: jobData.department || 'Unspecified Department',
                location: jobData.location || 'Location not specified',
                employmentType: jobData.employmentType || 'full-time',
                description: jobData.description || '',
                requirements: jobData.requirements || '',
                skills: Array.isArray(jobData.skills) ? jobData.skills : [],
                deadline: jobData.deadline,
                status: jobData.status || 'active',
                employerId: jobData.employerId,
                companyName: jobData.companyName || 'Company Name Not Available',
                createdAt: jobData.createdAt,
                applications: jobData.applications || []
            };

            jobsCache.push(job);
            if (job.department) departments.add(job.department);

            debugLog('🏢 Processing job', {
                id: job.id,
                title: job.title,
                company: job.companyName
            });

            jobsGrid.appendChild(createJobCard(job));
        });

        // Update department filter options
        populateDepartmentFilter(departments);
        debugLog(`✅ Successfully loaded ${jobsCache.length} jobs`);

    } catch (error) {
        debugLog('❌ Error loading jobs', {
            error: error.message,
            stack: error.stack
        }, 'error');
        showMessage('message', 'Error loading jobs. Please try again.', 'error');
        jobsGrid.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                Error loading jobs. Please try again later.
            </div>
        `;
    }
}

function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow';
    card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-medium text-gray-900">${job.title}</h3>
            <span class="px-2 py-1 text-sm rounded-full ${getJobTypeStyle(job.employmentType)}">
                ${job.employmentType}
            </span>
        </div>
        <p class="text-sm text-gray-600 mb-2">${job.companyName}</p>
        <p class="text-sm text-gray-500 mb-4">${job.department} • ${job.location}</p>
        <p class="text-sm text-gray-600 mb-4 line-clamp-2">${job.description}</p>
        <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">
                Posted ${formatDate(job.createdAt)}
            </span>
            <button onclick="viewJobDetails('${job.id}')" 
                class="px-4 py-2 text-kfupm-500 hover:text-kfupm-600">
                View Details
            </button>
        </div>
    `;
    return card;
}

async function loadUserCVs() {
    debugLog('📄 Loading user CVs');
    const cvSelect = document.getElementById('cvSelect');
    if (!cvSelect) return;

    try {
        const userId = localStorage.getItem('loggedInUserId');
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();

        if (userData?.cvs?.length > 0) {
            cvSelect.innerHTML = userData.cvs.map(cv => `
                <option value="${cv.id}">${cv.name}</option>
            `).join('');
        } else {
            cvSelect.innerHTML = '<option value="">No CVs available - Please create one first</option>';
        }
    } catch (error) {
        debugLog('❌ Error loading CVs', error);
    }
}

// Make these functions available globally for onclick handlers
// ... (previous code remains the same until the viewJobDetails function) ...

window.viewJobDetails = async (jobId) => {
    debugLog('🔍 Viewing job details', { jobId });
    currentJobId = jobId;

    const job = jobsCache.find(j => j.id === jobId);
    if (!job) return;

    const modal = document.getElementById('jobDetailsModal');
    const content = document.getElementById('modalContent');

    document.getElementById('modalJobTitle').textContent = job.title;
    content.innerHTML = `
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-lg font-medium">${job.companyName}</p>
                <p class="text-gray-600">${job.department} • ${job.location}</p>
            </div>
            <span class="px-3 py-1 rounded-full ${getJobTypeStyle(job.employmentType)}">
                ${job.employmentType}
            </span>
        </div>
        <div class="prose max-w-none">
            <h4 class="text-lg font-medium mb-2">Description</h4>
            <p class="text-gray-600">${job.description}</p>
            
            <h4 class="text-lg font-medium mt-4 mb-2">Requirements</h4>
            <p class="text-gray-600">${job.requirements}</p>
            
            <div class="mt-4">
                <h4 class="text-lg font-medium mb-2">Required Skills</h4>
                <div class="flex flex-wrap gap-2">
                    ${job.skills.map(skill => `
                        <span class="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            ${skill}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="mt-4 p-4 bg-gray-50 rounded-md">
            <p class="text-sm text-gray-600">
                <i class="fas fa-calendar-alt mr-2"></i>
                Application Deadline: ${formatDate(job.deadline)}
            </p>
        </div>
        <div class="mt-6 flex justify-end">
            <button id="applyButton" 
                onclick="showApplicationModal()"
                class="px-6 py-2 bg-kfupm-500 text-white rounded-lg hover:bg-kfupm-600 transition-colors">
                Apply Now
            </button>
        </div>
    </div>
`;

    // Add this before modal.classList.remove('hidden');
    const userId = localStorage.getItem('loggedInUserId');
    const hasApplied = await checkExistingApplication(jobId, userId);

    // Update the apply button based on application status
    const applyButton = document.getElementById('applyButton');
    if (applyButton) {
        if (hasApplied) {
            applyButton.textContent = 'Already Applied';
            applyButton.disabled = true;
            applyButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            applyButton.textContent = 'Apply Now';
            applyButton.disabled = false;
            applyButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    modal.classList.remove('hidden');
};

window.closeJobModal = () => {
    debugLog('🔍 Closing job details modal');
    document.getElementById('jobDetailsModal').classList.add('hidden');
    currentJobId = null;
};

window.showApplicationModal = () => {
    debugLog('📝 Showing application modal', { currentJobId });
    const applicationModal = document.getElementById('applicationModal');
    if (!applicationModal) {
        debugLog('❌ Application modal not found');
        return;
    }

    // Store the job ID in the modal's dataset
    applicationModal.dataset.jobId = currentJobId;
    closeJobModal();
    applicationModal.classList.remove('hidden');
};

window.closeApplicationModal = () => {
    debugLog('📝 Closing application modal');
    document.getElementById('applicationModal').classList.add('hidden');
    document.getElementById('applicationForm').reset();
};

async function handleApplicationSubmit(event) {
    event.preventDefault();
    debugLog('📤 Starting application submission process');

    const applicationModal = document.getElementById('applicationModal');
    const jobId = applicationModal?.dataset.jobId;
    if (!jobId) {
        debugLog('❌ No job ID found for application', null, 'error');
        showMessage('message', 'Error: Job details not found. Please try again.', 'error');
        return;
    }

    const coverLetter = document.getElementById('coverLetter').value.trim();
    const cvId = document.getElementById('cvSelect').value;

    const userId = localStorage.getItem('loggedInUserId');
    const userName = localStorage.getItem('username');

    // Validation
    if (!coverLetter) {
        showMessage('message', 'Please write a cover letter', 'error');
        return;
    }

    if (!cvId) {
        showMessage('message', 'Please select a CV or create one first', 'error');
        return;
    }

    try {
        debugLog('🔍 Finding job details', { jobId: jobId });
        const job = jobsCache.find(j => j.id === jobId);
        if (!job) {
            throw new Error('Job details not found');
        }

        // Create application object
        const application = {
            jobId: jobId,
            jobTitle: job.title,
            userId: userId,
            userName: userName,
            employerId: job.employerId,
            companyName: job.companyName,
            coverLetter: coverLetter,
            cvId: cvId,
            status: 'pending',
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        };

        debugLog('💾 Saving application to Firestore', application);
        const applicationRef = await addDoc(collection(db, "applications"), application);

        // Update job's applications array
        const jobRef = doc(db, "jobs", jobId);
        await updateDoc(jobRef, {
            applications: arrayUnion(applicationRef.id)
        });

        // Update user's applications array
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            applications: arrayUnion(applicationRef.id)
        });

        debugLog('✅ Application submitted successfully');
        showMessage('message', 'Application submitted successfully!', 'success');
        closeApplicationModal();

    } catch (error) {
        debugLog('❌ Error submitting application', error);
        showMessage('message', 'Error submitting application. Please try again.', 'error');
    }
}

function filterJobs() {
    debugLog('🔍 Filtering jobs');

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const department = document.getElementById('departmentFilter').value;
    const type = document.getElementById('typeFilter').value;

    const filteredJobs = jobsCache.filter(job => {
        const matchesSearch = !searchTerm ||
            job.title.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm) ||
            job.companyName.toLowerCase().includes(searchTerm);

        const matchesDepartment = !department || job.department === department;
        const matchesType = !type || job.employmentType === type;

        return matchesSearch && matchesDepartment && matchesType;
    });

    const jobsGrid = document.getElementById('jobsGrid');
    jobsGrid.innerHTML = '';
    filteredJobs.forEach(job => jobsGrid.appendChild(createJobCard(job)));
}

function clearFilters() {
    debugLog('🧹 Clearing filters');

    document.getElementById('searchInput').value = '';
    document.getElementById('departmentFilter').value = '';
    document.getElementById('typeFilter').value = '';

    filterJobs();
}

function populateDepartmentFilter(departments) {
    const filter = document.getElementById('departmentFilter');
    if (!filter) return;

    filter.innerHTML = '<option value="">All Departments</option>' +
        Array.from(departments).sort().map(dept =>
            `<option value="${dept}">${dept}</option>`
        ).join('');
}

// Utility functions
function getJobTypeStyle(type) {
    const styles = {
        'full-time': 'bg-green-100 text-green-800',
        'part-time': 'bg-blue-100 text-blue-800',
        'internship': 'bg-yellow-100 text-yellow-800',
        'contract': 'bg-purple-100 text-purple-800'
    };
    return styles[type] || 'bg-gray-100 text-gray-800';
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((date - new Date()) / (1000 * 60 * 60 * 24)),
        'day'
    );
}

async function checkExistingApplication(jobId, userId) {
    debugLog('🔍 Checking for existing application', { jobId, userId });

    try {
        const q = query(
            collection(db, "applications"),
            where("jobId", "==", jobId),
            where("userId", "==", userId)
        );

        const querySnapshot = await getDocs(q);
        const hasApplied = !querySnapshot.empty;

        debugLog(`${hasApplied ? '⚠️ Found' : '✅ No'} existing application`);
        return hasApplied;
    } catch (error) {
        debugLog('❌ Error checking existing application', error);
        return false;
    }
}


// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make debug functions available globally
window.debugLog = debugLog;
window.filterJobs = filterJobs;
window.clearFilters = clearFilters;



// Export functions that might be needed by other modules
export {
    loadJobs,
    filterJobs,
    handleApplicationSubmit,
    debugLog
};