// Example JavaScript for clearing sessionStorage or localStorage on logout
function handleLogout() {
    // Clear any stored user data
    sessionStorage.clear(); // or localStorage.clear();
    window.location.href = 'logout.html'; // Redirect to logout page
}

// Call handleLogout() when logging out, e.g., on a logout button click in the navbar
document.getElementById('logout-button').addEventListener('click', handleLogout);
