import { auth, db, showMessage } from './auth.js';
import { doc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Debug utilities
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `🏢 [JobPost] ${message}`;
    console.log(logEntry, data ? data : '');

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.textContent += `${timestamp}: ${logEntry}\n`;
        if (data) debugLog.textContent += JSON.stringify(data, null, 2) + '\n';
        debugLog.textContent += '------------------------\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

// Initialize job posting functionality
export function initializeJobPosting() {
    debugLog('🚀 Initializing job posting module');
    
    const modal = document.getElementById('postJobModal');
    const form = document.getElementById('jobPostForm');
    
    debugLog('📝 Checking required elements', {
        modalFound: !!modal,
        formFound: !!form
    });
    
    if (!modal || !form) {
        debugLog('❌ Required elements not found');
        return;
    }

    // Explicitly define modal functions on window object
    window.showJobModal = () => {
        debugLog('🔍 Show modal function called');
        if (!modal) {
            debugLog('❌ Modal element not found when showing');
            return;
        }
        modal.classList.remove('hidden');
        debugLog('✅ Modal shown successfully');

        // Set minimum date to today for deadline field
        const deadlineInput = document.getElementById('deadline');
        if (deadlineInput) {
            const today = new Date().toISOString().split('T')[0];
            deadlineInput.min = today;
            debugLog('📅 Set minimum date for deadline', { minDate: today });
        }
    };

    window.closeJobModal = () => {
        debugLog('🔍 Close modal function called');
        if (!modal) {
            debugLog('❌ Modal element not found when closing');
            return;
        }
        modal.classList.add('hidden');
        if (form) form.reset();
        debugLog('✅ Modal closed and form reset');
    };

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        debugLog('📝 Processing job posting submission');

        try {
            const employerId = localStorage.getItem('loggedInUserId');
            if (!employerId) {
                debugLog('❌ No employer ID found in localStorage');
                throw new Error('No employer ID found');
            }

            // Gather form data
            const formData = {
                title: document.getElementById('jobTitle').value.trim(),
                department: document.getElementById('department').value.trim(),
                location: document.getElementById('location').value.trim(),
                employmentType: document.getElementById('employmentType').value,
                description: document.getElementById('description').value.trim(),
                requirements: document.getElementById('requirements').value.trim(),
                skills: document.getElementById('skills').value.split(',').map(skill => skill.trim()),
                deadline: document.getElementById('deadline').value,
                status: 'active',
                employerId: employerId,
                companyName: localStorage.getItem('companyName'),
                createdAt: serverTimestamp(),
                applications: []
            };

            debugLog('📊 Collected form data', formData);

            // Validate data
            const validationErrors = validateJobPost(formData);
            if (validationErrors.length > 0) {
                debugLog('❌ Validation failed', validationErrors);
                showMessage('message', validationErrors[0], 'error');
                return;
            }

            // Save to Firestore
            debugLog('💾 Saving job posting to Firestore');
            const jobsRef = collection(db, 'jobs');
            const docRef = await addDoc(jobsRef, formData);
            
            debugLog('✅ Job posted successfully', { jobId: docRef.id });
            showMessage('message', 'Job posted successfully!', 'success');

            // Close modal and reset form
            window.closeJobModal();

            // Refresh job listings
            if (typeof window.loadJobListings === 'function') {
                debugLog('🔄 Refreshing job listings');
                await window.loadJobListings(employerId);
            } else {
                debugLog('⚠️ loadJobListings function not found');
            }

        } catch (error) {
            debugLog('❌ Error posting job', {
                error: error.message,
                stack: error.stack
            });
            showMessage('message', 'Error posting job. Please try again.', 'error');
        }
    });

    debugLog('✅ Job posting module initialized successfully');
}

// Validation helper
function validateJobPost(data) {
    debugLog('🔍 Validating job posting data');
    const errors = [];

    if (!data.title || data.title.length < 3) {
        errors.push('Job title must be at least 3 characters long');
    }
    if (!data.description || data.description.length < 50) {
        errors.push('Job description must be at least 50 characters long');
    }
    if (!data.requirements || data.requirements.length < 50) {
        errors.push('Requirements must be at least 50 characters long');
    }
    if (!data.skills || data.skills.length === 0) {
        errors.push('At least one skill is required');
    }
    if (!data.deadline) {
        errors.push('Application deadline is required');
    } else {
        const deadlineDate = new Date(data.deadline);
        const today = new Date();
        if (deadlineDate < today) {
            errors.push('Deadline cannot be in the past');
        }
    }

    debugLog('Validation results', { 
        valid: errors.length === 0, 
        errors 
    });

    return errors;
}