// Event listener for the personal info form submission
document.getElementById('personal-info-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    // Collect form values
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

    // Simulating a save operation (this can be expanded to save in a database)
    console.log("Personal Info Saved:", { name, email, phone });

    // Notify the user that their information has been saved
    alert("Personal information saved successfully!");
});