// cv-operations.js
import { auth, db } from './auth.js';
import { doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `📄 [CV] ${message}`;
    console.log(logEntry, data ? data : '');

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.textContent += `${timestamp}: ${logEntry}\n`;
        if (data) debugLog.textContent += JSON.stringify(data, null, 2) + '\n';
        debugLog.textContent += '------------------------\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

export async function saveCV(cvData) {
    debugLog('🔄 Starting CV save process', { cvData });

    try {
        // Get current user ID
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId) {
            throw new Error('No user ID found - user might not be logged in');
        }
        debugLog('✓ Found user ID', { userId });

        // Create CV object
        const newCV = {
            id: `cv_${Date.now()}`, // Generate unique ID
            name: cvData.title || 'Untitled CV',
            template: cvData.template,
            content: cvData,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        debugLog('📝 Created CV object', newCV);

        // Update user document with new CV
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            cvs: arrayUnion(newCV)
        });

        debugLog('✅ CV saved successfully');
        return { success: true, cvId: newCV.id };

    } catch (error) {
        debugLog('❌ Error saving CV', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}