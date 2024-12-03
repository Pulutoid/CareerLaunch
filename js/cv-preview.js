// cv-preview.js
console.log('🎨 CV Preview module loaded');
// Template styling configurations
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

function generateEducationHTML(education = []) {
    if (!education || education.length === 0) {
        return '<p class="text-gray-600">No education entries yet</p>';
    }

    return education.map(edu => `
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

function generateExperienceHTML(experience = []) {
    if (!experience || experience.length === 0) {
        return '<p class="text-gray-600">No experience entries yet</p>';
    }

    return experience.map(exp => `
        <div>
            <h3 class="text-lg font-semibold text-gray-800">${exp.position || 'Position'}</h3>
            <p class="text-gray-600">${exp.company || 'Company'}</p>
            <p class="text-sm text-gray-500">${exp.duration || 'Duration'}</p>
            <p class="mt-2 text-gray-700">${exp.description || 'Description'}</p>
        </div>
    `).join('');
}

function generateSkillsHTML(skills = { technical: [], soft: [] }) {
    const technicalSkills = skills?.technical || [];
    const softSkills = skills?.soft || [];
    
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

function generateCVPreview(cvData, selectedTemplate) {
    console.log('🎨 Generating preview with template:', selectedTemplate);
    
    if (!cvData) {
        console.error('❌ No CV data provided');
        return '<p class="text-red-500">Error: No CV data available</p>';
    }
        const style = templateStyles[selectedTemplate];
    if (!style) {
        console.error('Invalid template selected:', selectedTemplate);
        return '<p class="text-red-500">Error: Invalid template selected</p>';
    }

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
                        ${generateEducationHTML(cvData.education)}
                    </div>
                </section>

                <!-- Experience Section -->
                <section class="${style.sectionClass}">
                    <h2 class="${style.titleClass}">Experience</h2>
                    <div class="space-y-4">
                        ${generateExperienceHTML(cvData.experience)}
                    </div>
                </section>

                <!-- Skills Section -->
                <section class="${style.sectionClass}">
                    <h2 class="${style.titleClass}">Skills</h2>
                    <div class="flex flex-wrap gap-2">
                        ${generateSkillsHTML(cvData.skills)}
                    </div>
                </section>
            </main>

            <footer class="bg-gray-900 text-white text-center py-4">
                <p>&copy; ${new Date().getFullYear()} ${cvData.personalInfo.fullName || 'Your Name'}. All rights reserved.</p>
            </footer>
        </div>
    `;
}

// Export functions for use in cv-builder.js
export {
    generateCVPreview,
    generateEducationHTML,
    generateExperienceHTML,
    generateSkillsHTML
};