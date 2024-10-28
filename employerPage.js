// Event listener for the student search form
document.getElementById('search-student-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const studentId = document.getElementById('student-id').value;

    // Simulating a search operation (replace this with actual database call)
    console.log("Searching for Student ID:", studentId);

    // Mock student data
    const studentData = {
        id: studentId,
        name: "John Doe",
        email: "johndoe@example.com",
        skills: ["JavaScript", "HTML", "CSS", "React"]
    };

    // Display the student information (this can be expanded for real data)
    const resultDiv = document.getElementById('student-result');
    resultDiv.innerHTML = `
        <p><strong>Name:</strong> ${studentData.name}</p>
        <p><strong>Email:</strong> ${studentData.email}</p>
        <p><strong>Skills:</strong> ${studentData.skills.join(", ")}</p>
    `;
});