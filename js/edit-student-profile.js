// edit-student-profile.js
import { auth, db, checkAuth, showMessage } from './auth.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Debug logging utility
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

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('🚀 Initializing edit profile page');

    // Add debug panel toggle and clear functionality
    const toggleDebug = document.getElementById('toggleDebug');
    const debugPanel = document.getElementById('debugPanel');
    const clearDebug = document.getElementById('clearDebug');

    if (toggleDebug && debugPanel) {
        toggleDebug.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            const isHidden = debugPanel.classList.contains('hidden');
            toggleDebug.innerHTML = isHidden ?
                '<i class="fas fa-bug mr-2"></i>Debug Info' :
                '<i class="fas fa-bug mr-2"></i>Hide Debug';
            debugLog('Debug panel visibility toggled');
        });
    }

    if (clearDebug) {
        clearDebug.addEventListener('click', () => {
            const debugLog = document.getElementById('debugLog');
            if (debugLog) {
                debugLog.textContent = '';
                debugLog('Debug log cleared');
            }
        });
    }

    // Check authentication and ensure user is a student
    checkAuth(['student']);

    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        debugLog('❌ No user ID found in localStorage');
        showMessage('message', 'Authentication error. Please log in again.', 'error');
        window.location.href = 'login.html';
        return;
    }

    debugLog('✓ User authenticated', { userId });

    // Form elements
    const form = document.getElementById('editProfileForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Load current profile data
    try {
        debugLog('📡 Fetching user data from Firestore');

        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            debugLog('❌ No user document found in Firestore', { userId });
            showMessage('message', 'Error loading profile data', 'error');
            return;
        }

        const userData = userSnap.data();
        debugLog('✓ User data retrieved', {
            fields: Object.keys(userData),
            hasUsername: !!userData.username,
            hasEmail: !!userData.email,
            hasStudentId: !!userData.studentId
        });

        // Populate form fields
        document.getElementById('username').value = userData.username || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('studentId').value = userData.studentId || '';
        document.getElementById('major').value = userData.major || '';
        document.getElementById('gpa').value = userData.gpa || '';
        document.getElementById('graduationDate').value = userData.graduationDate || '';
        document.getElementById('skills').value = Array.isArray(userData.skills)
            ? userData.skills.join(', ')
            : userData.skills || '';

        debugLog('✓ Form fields populated');

    } catch (error) {
        debugLog('❌ Error fetching user data', {
            error: error.message,
            stack: error.stack
        });
        showMessage('message', 'Error loading profile data. Check debug panel for details.', 'error');
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        debugLog('📝 Form submission started');

        // Show loading overlay
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        try {
            const updatedData = {
                username: document.getElementById('username').value.trim(),
                major: document.getElementById('major').value.trim(),
                gpa: parseFloat(document.getElementById('gpa').value) || 0,
                graduationDate: document.getElementById('graduationDate').value,
                skills: document.getElementById('skills').value
                    .split(',')
                    .map(skill => skill.trim())
                    .filter(skill => skill.length > 0),
                lastUpdated: new Date().toISOString()
            };

            debugLog('Prepared update data', updatedData);

            // Validate data
            if (!updatedData.username) {
                debugLog('❌ Validation failed: Username required');
                showMessage('message', 'Username is required', 'error');
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
                return;
            }

            if (updatedData.gpa < 0 || updatedData.gpa > 4) {
                debugLog('❌ Validation failed: Invalid GPA value', { gpa: updatedData.gpa });
                showMessage('message', 'GPA must be between 0 and 4', 'error');
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
                return;
            }

            // Update Firestore
            debugLog('📡 Updating Firestore document');
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, updatedData);

            debugLog('✅ Profile updated successfully');
            showMessage('message', 'Profile updated successfully!', 'success');

            // Redirect after short delay
            debugLog('🔄 Redirecting to dashboard in 2 seconds');
            setTimeout(() => {
                window.location.href = 'student-dashboard.html';  // Updated redirect URL
            }, 2000);

        } catch (error) {
            debugLog('❌ Error updating profile', {
                error: error.message,
                code: error.code,
                stack: error.stack
            });
            showMessage('message', 'Error updating profile. Check debug panel for details.', 'error');
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
        }
    });

    // Handle cancel button
    cancelBtn.addEventListener('click', () => {
        debugLog('🔙 Cancel clicked, returning to dashboard');
        window.location.href = 'student-dashboard.html';  // Updated redirect URL
    });
});