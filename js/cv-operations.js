// cv-operations.js
import { auth, db } from './auth.js';
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Add html2pdf library
const html2pdfScript = document.createElement('script');
html2pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
document.head.appendChild(html2pdfScript);

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
        const userId = localStorage.getItem('loggedInUserId');
        if (!userId) {
            throw new Error('No user ID found - user might not be logged in');
        }
        debugLog('✓ Found user ID', { userId });

        const newCV = {
            id: `cv_${Date.now()}`,
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

export async function saveCVToProfile(cvData, selectedTemplate, currentCvId) {
    debugLog('🎯 Saving CV to profile');
    
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        throw new Error('No user ID found');
    }

    if (!currentCvId) {
        currentCvId = `cv_${Date.now()}`;
    }

    const cvToSave = {
        id: currentCvId,
        name: `${cvData.personalInfo?.fullName || 'Untitled'} CV - ${new Date().toLocaleDateString()}`,
        template: selectedTemplate,
        ...cvData,
        lastModified: new Date().toISOString(),
        userId: userId
    };

    debugLog('📝 Saving CV data', cvToSave);

    try {
        // Save CV document
        await setDoc(doc(db, "cvs", currentCvId), cvToSave);

        // Update user's CV list
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error('User document not found');
        }

        const userData = userDoc.data();
        const cvList = userData.cvs || [];
        
        const cvReference = {
            id: currentCvId,
            name: cvToSave.name,
            lastModified: cvToSave.lastModified
        };

        const existingIndex = cvList.findIndex(cv => cv.id === currentCvId);
        if (existingIndex > -1) {
            cvList[existingIndex] = cvReference;
        } else {
            cvList.push(cvReference);
        }

        await updateDoc(userRef, { cvs: cvList });
        debugLog('✅ CV saved successfully');
        return { success: true, cvId: currentCvId };
    } catch (error) {
        debugLog('❌ Error saving CV', error);
        throw error;
    }
}

export async function downloadCV(cvPreview, cvData, format = 'pdf') {
    debugLog('📥 Starting CV download', { format });

    try {
        if (format === 'pdf') {
            const opt = {
                margin: 1,
                filename: `${cvData.personalInfo?.fullName || 'CV'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            if (typeof html2pdf === 'undefined') {
                throw new Error('PDF library not loaded');
            }

            await html2pdf().set(opt).from(cvPreview).save();
            debugLog('✅ PDF download complete');
            return true;
        } else if (format === 'png') {
            const canvas = await html2canvas(cvPreview, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
            });

            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `${cvData.personalInfo?.fullName || 'CV'}.png`;
            link.click();
            
            debugLog('✅ PNG download complete');
            return true;
        }
    } catch (error) {
        debugLog('❌ Error downloading CV', error);
        throw error;
    }
}