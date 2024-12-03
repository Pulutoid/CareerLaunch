// cv-builder.js
import { auth, db, checkAuth, showMessage } from './auth.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { saveCV } from './cv-operations.js';
// Add html2pdf library
const html2pdfScript = document.createElement('script');
html2pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
document.head.appendChild(html2pdfScript);

let currentStep = 1;
let selectedTemplate = null;
let currentCvId = null;
let cvData = {
    template: '',
    personalInfo: {
        fullName: '',
        title: '',
        email: '',
        phone: '',
        summary: '',
        objective: ''
    },
    education: [],
    experience: [],
    skills: {
        technical: [],
        soft: []
    },
    certifications: [],
    achievements: [],
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

    // Set up save button listener
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveCVToProfile);
    }

    
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

    nextBtn.addEventListener('click', async () => {  // Make this async
        if (currentStep === 1 && !selectedTemplate) {
            showMessage('message', 'Please select a template first', 'error');
            return;
        }

        if (currentStep < 3) {
            currentStep++;
            updateStepUI();
            loadStepContent();
        } else {
            // Changed from finalizeCV() to loadPreview()
            await loadPreview();  
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

// Replace the existing loadPreview() function
async function loadPreview() {
    debugLog('📄 Loading preview');
    const container = document.getElementById('finishStep');
    container.classList.remove('hidden');

    // Show save button in preview step
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.classList.remove('hidden');
    }

    try {
        // First save the current form data
        const formData = await saveFormData();
        if (formData) {
            cvData = formData; // Update the global cvData
            debugLog('📝 Form data updated for preview', cvData);
        }

        // Generate preview based on updated data
        const previewHTML = generateCVPreview();
        
   // Update the container.innerHTML part in loadPreview
container.innerHTML = `
<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-serif font-bold text-academic-primary">Preview Your CV</h2>
        <div class="space-x-4">
            <button onclick="window.downloadCV('pdf')" class="px-4 py-2 bg-academic-tertiary text-white rounded-lg hover:bg-academic-tertiary/90 transition-colors">
                <i class="fas fa-file-pdf mr-2"></i>Download PDF
            </button>
            <button onclick="window.downloadCV('png')" class="px-4 py-2 bg-academic-primary text-white rounded-lg hover:bg-academic-dark transition-colors">
                <i class="fas fa-file-image mr-2"></i>Download PNG
            </button>
        </div>
    </div>
    <div id="cvPreview" class="bg-white shadow-lg rounded-lg p-8">
        ${previewHTML}
    </div>
</div>
`;

        debugLog('✅ Preview loaded successfully');
    } catch (error) {
        debugLog('❌ Error loading preview', error);
        showMessage('message', 'Error generating preview', 'error');
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

    // Add this near the end of updateStepUI function
const saveBtn = document.getElementById('saveProfileBtn');
if (saveBtn) {
    saveBtn.classList.toggle('hidden', currentStep !== 3);
}
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

               <!-- Professional Summary -->
<div>
    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Professional Summary</h3>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">Career Objective</label>
            <textarea name="objective" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Professional Summary</label>
            <textarea name="summary" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
        </div>
    </div>
</div>

<!-- Skills -->
<div>
    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Skills</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label class="block text-sm font-medium text-gray-700">Technical Skills</label>
            <textarea name="technicalSkills" rows="3" placeholder="Programming languages, tools, etc." class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Soft Skills</label>
            <textarea name="softSkills" rows="3" placeholder="Leadership, communication, etc." class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary"></textarea>
        </div>
    </div>
</div>

<!-- Certifications -->
<div>
    <h3 class="text-lg font-serif font-semibold text-academic-primary mb-4">Certifications</h3>
    <div id="certificationFields" class="space-y-4">
        <div class="certification-entry bg-gray-50 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Certification Name</label>
                    <input type="text" name="certName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Issuing Organization</label>
                    <input type="text" name="certOrg" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Date Obtained</label>
                    <input type="month" name="certDate" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
                </div>
            </div>
        </div>
    </div>
    <button type="button" onclick="addCertificationField()" class="mt-2 text-academic-tertiary hover:text-academic-primary transition-colors">
        <i class="fas fa-plus-circle mr-2"></i>Add More Certifications
    </button>
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
        return '<p class="text-gray-600">No education entries yet</p>';
    }

    return cvData.education.map(edu => `
      <div>
        <h3 class="text-lg font-semibold text-gray-800">${edu.degree || 'Degree'}</h3>
        <p class="text-gray-600">${edu.institution || 'Institution'}</p>
        <div class="flex justify-between text-sm text-gray-500">
          <span>${edu.gradYear || 'Year'}</span>
          <span>GPA: ${edu.gpa || 'N/A'}</span>
        </div>
      </div>
    `).join('');
}


function generateExperienceHTML() {
    if (!cvData.experience || cvData.experience.length === 0) {
        return '<p class="text-gray-600">No experience entries yet</p>';
    }

    return cvData.experience.map(exp => `
      <div>
        <h3 class="text-lg font-semibold text-gray-800">${exp.position || 'Position'}</h3>
        <p class="text-gray-600">${exp.company || 'Company'}</p>
        <p class="text-sm text-gray-500">${exp.duration || 'Duration'}</p>
        <p class="mt-2 text-gray-700">${exp.description || 'Description'}</p>
      </div>
    `).join('');
}

function generateSkillsHTML() {
    const technicalSkills = cvData.skills?.technical || [];
    const softSkills = cvData.skills?.soft || [];
    
    if (technicalSkills.length === 0 && softSkills.length === 0) {
        return '<p class="text-gray-600">No skills listed yet</p>';
    }

    let html = '';
    
    if (technicalSkills.length > 0) {
        html += `
            <div class="mb-4">
                <h3 class="text-lg font-medium mb-2">Technical Skills</h3>
                <div class="flex flex-wrap gap-2">
                    ${technicalSkills.map(skill => `
                        <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">${skill}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (softSkills.length > 0) {
        html += `
            <div>
                <h3 class="text-lg font-medium mb-2">Soft Skills</h3>
                <div class="flex flex-wrap gap-2">
                    ${softSkills.map(skill => `
                        <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700">${skill}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    return html;
}

function generateCVPreview() {
    debugLog('🎨 Generating CV Preview', {
        template: selectedTemplate,
        hasPersonalInfo: !!cvData.personalInfo,
        hasEducation: (cvData.education || []).length,
        hasExperience: (cvData.experience || []).length,
        hasSkills: cvData.skills?.technical?.length || cvData.skills?.soft?.length
    });
    
    const templateStyles = {
        professional: {
            containerClass: 'max-w-4xl mx-auto font-sans bg-white shadow-lg rounded-lg overflow-hidden',
            headerClass: 'bg-gray-800 text-white p-6',
            sectionClass: 'mb-8',
            titleClass: 'text-2xl font-bold text-gray-800 mb-2',
            subtitleClass: 'text-lg font-medium mt-2',
            textClass: 'text-gray-600',
        },
        academic: {
            containerClass: 'max-w-4xl mx-auto font-serif bg-white shadow-lg rounded-lg overflow-hidden',
            headerClass: 'bg-academic-primary text-white p-6',
            sectionClass: 'mb-8',
            titleClass: 'text-2xl font-bold text-academic-primary mb-2',
            subtitleClass: 'text-lg font-medium mt-2',
            textClass: 'text-gray-600',
        },
        creative: {
            containerClass: 'max-w-4xl mx-auto font-sans bg-white shadow-lg rounded-lg overflow-hidden',
            headerClass: 'bg-gradient-to-r from-academic-tertiary to-academic-secondary text-white p-6',
            sectionClass: 'mb-8',
            titleClass: 'text-2xl font-bold text-academic-tertiary mb-2',
            subtitleClass: 'text-lg font-medium mt-2',
            textClass: 'text-gray-600',
        },
    };

    const style = templateStyles[selectedTemplate];

    return `
      <div class="${style.containerClass}">
        <header class="${style.headerClass}">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold">${cvData.personalInfo.fullName || 'Your Name'}</h1>
              <p class="${style.subtitleClass}">${cvData.personalInfo.title || 'Professional Title'}</p>
            </div>
            <div class="text-right">
              <p class="mb-1">${cvData.personalInfo.email || 'email@example.com'}</p>
              <p>${cvData.personalInfo.phone || 'Phone Number'}</p>
            </div>
          </div>
        </header>
  
        <main class="p-6">
          <!-- Summary Section -->
          <section class="${style.sectionClass}">
            <h2 class="${style.titleClass}">Summary</h2>
            <p class="${style.textClass}">${cvData.personalInfo.summary || 'A brief summary of your professional profile'}</p>
          </section>
  
          <!-- Education Section -->
          <section class="${style.sectionClass}">
            <h2 class="${style.titleClass}">Education</h2>
            <div class="space-y-4">
              ${generateEducationHTML(style)}
            </div>
          </section>
  
          <!-- Experience Section -->
          <section class="${style.sectionClass}">
            <h2 class="${style.titleClass}">Experience</h2>
            <div class="space-y-4">
              ${generateExperienceHTML(style)}
            </div>
          </section>
  
          <!-- Skills Section -->
          <section class="${style.sectionClass}">
            <h2 class="${style.titleClass}">Skills</h2>
            <div class="flex flex-wrap gap-2">
              ${generateSkillsHTML()}
            </div>
          </section>
        </main>
  
        <footer class="bg-gray-900 text-white text-center py-4">
          <p>&copy; ${new Date().getFullYear()} ${cvData.personalInfo.fullName || 'Your Name'}. All rights reserved.</p>
        </footer>
      </div>
    `;
}


// Find the saveFormData() function and update it
async function saveFormData() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return null;

    debugLog('💾 Collecting form data');

    const formData = {
        template: selectedTemplate,
        personalInfo: {
            fullName: document.querySelector('[name="fullName"]')?.value || '',
            title: document.querySelector('[name="title"]')?.value || '',
            email: document.querySelector('[name="email"]')?.value || '',
            phone: document.querySelector('[name="phone"]')?.value || '',
            objective: document.querySelector('[name="objective"]')?.value || '',
            summary: document.querySelector('[name="summary"]')?.value || '',
        },
        education: Array.from(document.querySelectorAll('.education-entry')).map(entry => ({
            degree: entry.querySelector('[name="degree"]')?.value || '',
            institution: entry.querySelector('[name="institution"]')?.value || '',
            gradYear: entry.querySelector('[name="gradYear"]')?.value || '',
            gpa: entry.querySelector('[name="gpa"]')?.value || '',
        })),
        experience: Array.from(document.querySelectorAll('.experience-entry')).map(entry => ({
            position: entry.querySelector('[name="position"]')?.value || '',
            company: entry.querySelector('[name="company"]')?.value || '',
            duration: entry.querySelector('[name="duration"]')?.value || '',
            description: entry.querySelector('[name="description"]')?.value || '',
        })),
        certifications: Array.from(document.querySelectorAll('.certification-entry')).map(entry => ({
            name: entry.querySelector('[name="certName"]')?.value || '',
            organization: entry.querySelector('[name="certOrg"]')?.value || '',
            date: entry.querySelector('[name="certDate"]')?.value || '',
        })),
        skills: {
            technical: document.querySelector('[name="technicalSkills"]')?.value.split(',').map(skill => skill.trim()).filter(Boolean),
            soft: document.querySelector('[name="softSkills"]')?.value.split(',').map(skill => skill.trim()).filter(Boolean),
        },
        lastSaved: new Date().toISOString()
    };

    debugLog('📝 Collected form data', formData);

    try {
        await setDoc(doc(db, "cvs", userId), formData);
        cvData = formData; // Update the global cvData
        debugLog('✅ Form data saved successfully');
        showMessage('message', 'Progress saved', 'success');
        return formData;
    } catch (error) {
        debugLog('❌ Error saving form data', error);
        showMessage('message', 'Error saving progress', 'error');
        return null;
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
        } else if (format === 'png') {
            // Use html2canvas library to capture the CV as an image
            const canvas = await html2canvas(cvPreview, {
                scale: 2, // Adjust the scale for better image quality
                useCORS: true, // Enable cross-origin resource sharing
                allowTaint: true, // Allow cross-origin images
            });

            // Convert the canvas to a PNG image
            const dataURL = canvas.toDataURL('image/png');

            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `${cvData.personalInfo?.fullName || 'CV'}.png`;
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
function addCertificationField() {
    const container = document.getElementById('certificationFields');
    const newField = document.createElement('div');
    newField.className = 'certification-entry bg-gray-50 p-4 rounded-lg';
    newField.innerHTML = `
        <div class="flex justify-between mb-2">
            <div></div>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Certification Name</label>
                <input type="text" name="certName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Issuing Organization</label>
                <input type="text" name="certOrg" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Date Obtained</label>
                <input type="month" name="certDate" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-academic-tertiary focus:ring-academic-tertiary">
            </div>
        </div>
    `;
    container.appendChild(newField);
}

// async function saveCVToProfile() {
//     debugLog('🎯 Attempting to save CV to profile');
    
//     const userId = localStorage.getItem('loggedInUserId');
//     if (!userId) {
//         debugLog('❌ No user ID found');
//         showMessage('message', 'Please log in to save your CV', 'error');
//         return;
//     }

//     try {
//         if (!currentCvId) {
//             currentCvId = `cv_${Date.now()}`;
//         }

//         const formData = await saveFormData(); // This gets the current form data
//         const cvToSave = {
//             id: currentCvId,
//             name: `${formData.personalInfo?.fullName || 'Untitled'} CV - ${new Date().toLocaleDateString()}`,
//             template: selectedTemplate,
//             ...formData
//         };

//         debugLog('📝 Saving CV data', cvToSave);

//         await setDoc(doc(db, "cvs", currentCvId), cvToSave);

//         const userRef = doc(db, "users", userId);
//         const userDoc = await getDoc(userRef);
//         const userData = userDoc.data();

//         const cvList = userData.cvs || [];
//         const existingIndex = cvList.findIndex(cv => cv.id === currentCvId);

//         if (existingIndex > -1) {
//             cvList[existingIndex] = {
//                 id: currentCvId,
//                 name: cvToSave.name,
//                 lastModified: cvToSave.lastModified
//             };
//         } else {
//             cvList.push({
//                 id: currentCvId,
//                 name: cvToSave.name,
//                 lastModified: cvToSave.lastModified
//             });
//         }

//         await updateDoc(userRef, { cvs: cvList });

//         debugLog('✅ CV saved successfully');
//         showMessage('message', 'CV saved to your profile!', 'success');

//     } catch (error) {
//         debugLog('❌ Error saving CV', error);
//         showMessage('message', 'Error saving CV. Please try again.', 'error');
//     }
// }

async function saveCVToProfile() {
    debugLog('🎯 Attempting to save CV to profile');
    
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        debugLog('❌ No user ID found');
        showMessage('message', 'Please log in to save your CV', 'error');
        return;
    }

    try {
        // Generate CV ID if not exists
        if (!currentCvId) {
            currentCvId = `cv_${Date.now()}`;
        }

        // Get current form data
        const formData = await saveFormData();
        if (!formData) {
            throw new Error('Failed to collect form data');
        }

        // Prepare CV data
        const cvToSave = {
            id: currentCvId,
            name: `${formData.personalInfo?.fullName || 'Untitled'} CV - ${new Date().toLocaleDateString()}`,
            template: selectedTemplate,
            data: formData, // Nest the form data
            lastModified: new Date().toISOString(),
            userId: userId // Add user reference
        };

        debugLog('📝 Saving CV data', cvToSave);

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
        
        // Update or add CV reference
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

        // Update user document
        await updateDoc(userRef, { cvs: cvList });

        debugLog('✅ CV saved successfully');
        showMessage('message', 'CV saved to your profile!', 'success');

    } catch (error) {
        debugLog('❌ Error saving CV', error);
        showMessage('message', 'Error saving CV. Please try again.', 'error');
    }
}

// Add to window object
window.addCertificationField = addCertificationField;

// Add function to Window object for onclick handlers
window.addEducationField = addEducationField;
window.addExperienceField = addExperienceField;
window.downloadCV = downloadCV;
