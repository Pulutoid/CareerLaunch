// Event listener for the login form submission
document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simulate login process (in reality, verify credentials with Firebase or backend)
    console.log("User attempting to log in with:", { email, password });

    // Mock validation (replace this with actual user verification)
    if (email === "test@example.com" && password === "123456") {
        alert("Login successful!");
        // Redirect to the main page or dashboard after successful login
        window.location.href = "index.html";
    } else {
        alert("Invalid credentials! Please try again.");
    }
});