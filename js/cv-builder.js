// cv-builder.js
import { auth, db, checkAuth, showMessage } from './auth.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Add html2pdf library
const html2pdfScript = document.createElement('script');
html2pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
document.head.appendChild(html2pdfScript);

let currentStep = 1;
let selectedTemplate = null;
let cvData = {
    template: '',
    personalInfo: {},
    education: [],
    experience: [],
    skills: [],
    lastSaved: null
};

// Debug logging with emojis
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🎨 [CV Builder] ${message}`, data || '');

    const debugLog = document.getElementById('debugLog');
    if (debugLog) {
        debugLog.textContent += `${timestamp}: ${message}\n`;
        if (data) debugLog.textContent += JSON.stringify(data, null, 2) + '\n';
        debugLog.textContent += '------------------------\n';
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    debugLog('🚀 Initializing CV Builder');

    // Set up debug panel toggle
    const toggleDebug = document.getElementById('toggleDebug');
    const debugPanel = document.getElementById('debugPanel');
    const clearDebug = document.getElementById('clearDebug');

    if (toggleDebug && debugPanel) {
        toggleDebug.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            toggleDebug.innerHTML = debugPanel.classList.contains('hidden') ?
                '<i class="fas fa-bug mr-2"></i>Debug Info' :
                '<i class="fas fa-bug mr-2"></i>Hide Debug';
        });
    }

    if (clearDebug) {
        clearDebug.addEventListener('click', () => {
            if (document.getElementById('debugLog')) {
                document.getElementById('debugLog').textContent = '';
                debugLog('🧹 Debug log cleared');
            }
        });
    }

    // Initialize template selection
    initializeTemplateSelection();

    // Set up navigation buttons
    setupNavigation();

    // Load any existing CV data
    await loadExistingCV();

    debugLog('✅ CV Builder initialized');
});

function initializeTemplateSelection() {
    const templateCards = document.querySelectorAll('.template-card');

    templateCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selection from all cards
            templateCards.forEach(c => {
                c.classList.remove('ring-2', 'ring-academic-tertiary', 'border-academic-tertiary');
                c.classList.add('border-gray-100');
            });

            // Add selection to clicked card
            card.classList.remove('border-gray-100');
            card.classList.add('ring-2', 'ring-academic-tertiary', 'border-academic-tertiary');

            selectedTemplate = card.dataset.template;
            debugLog('📝 Selected template:', selectedTemplate);

            // Enable next button
            document.getElementById('nextBtn').classList.remove('opacity-50', 'cursor-not-allowed');

            // Show confirmation
            showMessage('message', `Selected ${card.querySelector('h3').textContent} template`, 'success');
        });
    });
}

function setupNavigation() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');

    nextBtn.addEventListener('click', () => {
        if (currentStep === 1 && !selectedTemplate) {
            showMessage('message', 'Please select a template first', 'error');
            return;
        }

        if (currentStep < 3) {
            currentStep++;
            updateStepUI();
            loadStepContent();
        } else {
            finalizeCV();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepUI();
            loadStepContent();
        }
    });
}

async function loadExistingCV() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return;

    try {
        const cvDoc = await getDoc(doc(db, "cvs", userId));
        if (cvDoc.exists()) {
            cvData = { ...cvData, ...cvDoc.data() };
            debugLog('📂 Loaded existing CV data', cvData);

            if (cvData.template) {
                selectedTemplate = cvData.template;
                const templateCard = document.querySelector(`[data-template="${cvData.template}"]`);
                if (templateCard) {
                    templateCard.click();
                }
            }
        }
    } catch (error) {
        debugLog('❌ Error loading CV data', error);
    }
}

function updateStepUI() {
    debugLog('🔄 Updating step UI', { currentStep });

    // Update progress bars and circles
    for (let i = 1; i <= 3; i++) {
        const bar = document.getElementById(`step${i}Bar`);
        const circle = document.getElementById(`step${i}Circle`);

        if (i < currentStep) {
            bar?.classList.replace('bg-gray-200', 'bg-academic-tertiary');
            circle?.classList.replace('bg-gray-200', 'bg-academic-tertiary');
            circle?.querySelector('span')?.classList.replace('text-gray-600', 'text-white');
        } else if (i === currentStep) {
            circle?.classList.replace('bg-gray-200', 'bg-academic-tertiary');
            circle?.querySelector('span')?.classList.replace('text-gray-600', 'text-white');
        }
    }

    // Update buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.classList.toggle('hidden', currentStep === 1);
    nextBtn.textContent = currentStep === 3 ? 'Finish & Download' : 'Next';
    nextBtn.innerHTML = currentStep === 3 ?
        '<i class="fas fa-download mr-2"></i>Finish & Download' :
        'Next<i class="fas fa-arrow-right ml-2"></i>';
}

function loadStepContent() {
    debugLog('📄 Loading content for step', currentStep);

    // Hide all steps
    ['templateStep', 'informationStep', 'finishStep'].forEach(step => {
        document.getElementById(step).classList.add('hidden');
    });

    switch (currentStep) {
        case 1:
            document.getElementById('templateStep').classList.remove('hidden');
            break;
        case 2:
            loadInformationForm();
            break;
        case 3:
            loadPreview();
            break;
    }
}

function loadInformationForm() {
    const container = document.getElementById('informationStep');
    container.classList.remove('hidden');

    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <form id="cvForm" class="space-y-8">
                <!-- Personal Information -->
                <div>
                    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Personal Information</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" name="fullName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Professional Title</label>
                            <input type="text" name="title" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" name="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Phone</label>
                            <input type="tel" name="phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                        </div>
                    </div>
                </div>

                <!-- Education -->
                <div>
                    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Education</h3>
                    <div id="educationFields" class="space-y-4">
                        <div class="education-entry bg-gray-50 p-4 rounded-lg">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Degree</label>
                                    <input type="text" name="degree" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Institution</label>
                                    <input type="text" name="institution" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Graduation Year</label>
                                    <input type="text" name="gradYear" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">GPA</label>
                                    <input type="text" name="gpa" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="addEducationField()" class="mt-2 text-academic-tertiary hover:text-academic-primary transition-colors">
                        <i class="fas fa-plus-circle mr-2"></i>Add More Education
                    </button>
                </div>

                <!-- Experience -->
                <div>
                    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Experience</h3>
                    <div id="experienceFields" class="space-y-4">
                        <div class="experience-entry bg-gray-50 p-4 rounded-lg">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Position</label>
                                    <input type="text" name="position" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Company</label>
                                    <input type="text" name="company" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Duration</label>
                                    <input type="text" name="duration" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea name="description" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="addExperienceField()" class="mt-2 text-academic-tertiary hover:text-academic-primary transition-colors">
                        <i class="fas fa-plus-circle mr-2"></i>Add More Experience
                    </button>
                </div>

                <!-- Skills -->
                <div>
                    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Skills</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
                            <textarea name="skills" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Populate form with existing data if any
    if (cvData.personalInfo) {
        Object.entries(cvData.personalInfo).forEach(([key, value]) => {
            const input = container.querySelector(`[name="${key}"]`);
            if (input) input.value = value;
        });
    }

    // Add form submission handler
    const form = container.querySelector('#cvForm');
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('input', debounce(saveFormData, 1000));
}

function loadPreview() {
    const container = document.getElementById('finishStep');
    container.classList.remove('hidden');

    // Generate preview based on template and form data
    const previewHTML = generateCVPreview();

    container.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-serif font-bold text-academic-primary">Preview Your CV</h2>
                <div class="space-x-4">
                    <button onclick="downloadCV('pdf')" class="px-4 py-2 bg-academic-tertiary text-white rounded-lg hover:bg-academic-tertiary/90 transition-colors">
                        <i class="fas fa-file-pdf mr-2"></i>Download PDF
                    </button>
<button onclick="downloadCV('word')" class="px-4 py-2 bg-academic-primary text-white rounded-lg hover:bg-academic-dark transition-colors">
                        <i class="fas fa-file-word mr-2"></i>Download Word
                    </button>
                </div>
            </div>
            <div id="cvPreview" class="bg-white shadow-lg rounded-lg p-8">
                ${previewHTML}
            </div>
        </div>
    `;
}

// Add these helper functions
function addEducationField() {
    const container = document.getElementById('educationFields');
    const newField = document.createElement('div');
    newField.className = 'education-entry bg-gray-50 p-4 rounded-lg';
    newField.innerHTML = `
        <div class="flex justify-between mb-2">
            <div></div>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Degree</label>
                <input type="text" name="degree" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Institution</label>
                <input type="text" name="institution" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Graduation Year</label>
                <input type="text" name="gradYear" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">GPA</label>
                <input type="text" name="gpa" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
        </div>
    `;
    container.appendChild(newField);
}

function addExperienceField() {
    const container = document.getElementById('experienceFields');
    const newField = document.createElement('div');
    newField.className = 'experience-entry bg-gray-50 p-4 rounded-lg';
    newField.innerHTML = `
        <div class="flex justify-between mb-2">
            <div></div>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Position</label>
                <input type="text" name="position" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Company</label>
                <input type="text" name="company" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Duration</label>
                <input type="text" name="duration" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
            </div>
        </div>
    `;
    container.appendChild(newField);
}

function generateEducationHTML() {
    if (!cvData.education || cvData.education.length === 0) {
        return '<p class="text-gray-500">No education entries yet</p>';
    }

    return cvData.education.map(edu => `
        <div class="mb-4">
            <h3 class="font-bold">${edu.degree || 'Degree'}</h3>
            <p class="text-academic-primary">${edu.institution || 'Institution'}</p>
            <div class="flex justify-between text-sm text-gray-600">
                <span>${edu.gradYear || 'Year'}</span>
                <span>GPA: ${edu.gpa || 'N/A'}</span>
            </div>
        </div>
    `).join('');
}

function generateExperienceHTML() {
    if (!cvData.experience || cvData.experience.length === 0) {
        return '<p class="text-gray-500">No experience entries yet</p>';
    }

    return cvData.experience.map(exp => `
        <div class="mb-4">
            <h3 class="font-bold">${exp.position || 'Position'}</h3>
            <p class="text-academic-primary">${exp.company || 'Company'}</p>
            <p class="text-sm text-gray-600">${exp.duration || 'Duration'}</p>
            <p class="mt-2">${exp.description || 'Description'}</p>
        </div>
    `).join('');
}

function generateSkillsHTML() {
    if (!cvData.skills || cvData.skills.length === 0) {
        return '<p class="text-gray-500">No skills listed yet</p>';
    }

    return `
        <div class="flex flex-wrap gap-2">
            ${cvData.skills.map(skill => `
                <span class="px-3 py-1 bg-gray-100 rounded-full text-sm">${skill}</span>
            `).join('')}
        </div>
    `;
}



function generateCVPreview() {
    // Get selected template and generate HTML based on the template
    const templateStyles = {
        professional: {
            containerClass: 'max-w-4xl mx-auto font-sans',
            headerClass: 'bg-gray-100 p-8 rounded-t-lg',
            sectionClass: 'my-6',
        },
        academic: {
            containerClass: 'max-w-4xl mx-auto font-serif',
            headerClass: 'border-b-2 border-academic-primary pb-4',
            sectionClass: 'my-8',
        },
        creative: {
            containerClass: 'max-w-4xl mx-auto font-sans',
            headerClass: 'bg-academic-tertiary text-white p-8 rounded-lg',
            sectionClass: 'my-6',
        }
    };

    const style = templateStyles[selectedTemplate];

    return `
        <div class="${style.containerClass}">
            <header class="${style.headerClass}">
                <h1 class="text-3xl font-bold">${cvData.personalInfo.fullName || 'Your Name'}</h1>
                <p class="text-xl mt-2">${cvData.personalInfo.title || 'Professional Title'}</p>
                <div class="mt-4 text-sm">
                    <p>${cvData.personalInfo.email || 'email@example.com'}</p>
                    <p>${cvData.personalInfo.phone || 'Phone Number'}</p>
                </div>
            </header>

            <main class="p-8">
                <!-- Education Section -->
                <section class="${style.sectionClass}">
                    <h2 class="text-2xl font-bold mb-4">Education</h2>
                    ${generateEducationHTML()}
                </section>

                <!-- Experience Section -->
                <section class="${style.sectionClass}">
                    <h2 class="text-2xl font-bold mb-4">Experience</h2>
                    ${generateExperienceHTML()}
                </section>

                <!-- Skills Section -->
                <section class="${style.sectionClass}">
                    <h2 class="text-2xl font-bold mb-4">Skills</h2>
                    ${generateSkillsHTML()}
                </section>
            </main>
        </div>
    `;
}

async function saveFormData() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return;

    const formData = {
        template: selectedTemplate,
        personalInfo: {
            fullName: document.querySelector('[name="fullName"]')?.value,
            title: document.querySelector('[name="title"]')?.value,
            email: document.querySelector('[name="email"]')?.value,
            phone: document.querySelector('[name="phone"]')?.value,
        },
        education: Array.from(document.querySelectorAll('.education-entry')).map(entry => ({
            degree: entry.querySelector('[name="degree"]')?.value,
            institution: entry.querySelector('[name="institution"]')?.value,
            gradYear: entry.querySelector('[name="gradYear"]')?.value,
            gpa: entry.querySelector('[name="gpa"]')?.value,
        })),
        experience: Array.from(document.querySelectorAll('.experience-entry')).map(entry => ({
            position: entry.querySelector('[name="position"]')?.value,
            company: entry.querySelector('[name="company"]')?.value,
            duration: entry.querySelector('[name="duration"]')?.value,
            description: entry.querySelector('[name="description"]')?.value,
        })),
        skills: document.querySelector('[name="skills"]')?.value.split(',').map(skill => skill.trim()),
        lastSaved: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, "cvs", userId), formData);
        cvData = formData;
        showMessage('message', 'Progress saved', 'success');
        debugLog('💾 Form data saved', formData);
    } catch (error) {
        debugLog('❌ Error saving form data', error);
        showMessage('message', 'Error saving progress', 'error');
    }
}

async function downloadCV(format = 'pdf') {
    const cvPreview = document.getElementById('cvPreview');

    try {
        showMessage('message', 'Preparing download...', 'info');

        if (format === 'pdf') {
            const opt = {
                margin: 1,
                filename: `${cvData.personalInfo?.fullName || 'CV'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Make sure html2pdf is loaded
            if (typeof html2pdf === 'undefined') {
                throw new Error('PDF library not loaded');
            }

            await html2pdf().set(opt).from(cvPreview).save();
            showMessage('message', 'CV downloaded successfully', 'success');
        } else {
            // For Word format, create a styled HTML file
            const styles = `
                <style>
                    body { font-family: Arial, sans-serif; }
                    .section { margin: 20px 0; }
                    h1 { color: #1B3764; }
                    h2 { color: #006B3F; }
                </style>
            `;
            const blob = new Blob([styles + cvPreview.innerHTML], { type: 'application/msword' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${cvData.personalInfo?.fullName || 'CV'}.doc`;
            link.click();
            showMessage('message', 'CV downloaded successfully', 'success');
        }
    } catch (error) {
        debugLog('❌ Error downloading CV', error);
        showMessage('message', `Error downloading CV: ${error.message}`, 'error');
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

// Add function to Window object for onclick handlers
window.addEducationField = addEducationField;
window.addExperienceField = addExperienceField;
window.downloadCV = downloadCV;