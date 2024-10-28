// Event listener for the signup form submission
document.getElementById('signup-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Simple validation for matching passwords
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // Simulating saving user info (in reality, connect with Firebase or backend)
    console.log("User signed up with details:", { username, email });

    // Notify user of success
    alert("Account created successfully!");

    // Redirect to login page after successful signup
    window.location.href = "login.html";
});

