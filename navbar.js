// navbar.js
document.addEventListener("DOMContentLoaded", function() {
    // Function to load the navbar
    function loadNavbar() {
        fetch('navbar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load navbar.');
                }
                return response.text();
            })
            .then(data => {
                document.getElementById('navbar').innerHTML = data;
                setActiveLink(); // Highlight the active link
            })
            .catch(error => {
                console.error('Error loading navbar:', error);
            });
    }

    // Function to set the active link based on the current page
    function setActiveLink() {
        const currentPage = window.location.pathname.split("/").pop();
        // Default to index.html if root is accessed
        const page = currentPage === "" ? "index.html" : currentPage;
        const activeLink = document.querySelector(`.nav-links a[href="${page}"]`);

        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Initialize the navbar loading
    loadNavbar();
});
