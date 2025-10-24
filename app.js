// app.js

/**
 * This script contains shared functionality used across multiple pages,
 * such as loading the sidebar, handling logout, and the user profile dropdown.
 */
document.addEventListener('DOMContentLoaded', () => {

    /**
     * ------------------------------------------------------------------------
     * Sidebar Loader
     * ------------------------------------------------------------------------
     * Fetches sidebar.html and injects it into the #main-sidebar placeholder.
     * It also highlights the link corresponding to the current page.
     */
    const loadSidebar = () => {
        fetch('sidebar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(html => {
                const sidebarPlaceholder = document.getElementById('main-sidebar');
                if (sidebarPlaceholder) {
                    sidebarPlaceholder.innerHTML = html;
                    
                    // Now that the sidebar is loaded, add logout functionality to its button
                    const logoutButton = sidebarPlaceholder.querySelector('.logout-button');
                    if (logoutButton) {
                        logoutButton.addEventListener('click', handleLogout);
                    }
                    
                    // Highlight the active navigation link
                    highlightCurrentPage();
                }
            })
            .catch(error => {
                console.error('Error fetching sidebar:', error);
                // Optional: Provide a fallback message in the UI
                const sidebarPlaceholder = document.getElementById('main-sidebar');
                if(sidebarPlaceholder) {
                    sidebarPlaceholder.innerHTML = '<p class="p-4 text-red-500">Could not load sidebar.</p>';
                }
            });
    };
    
    const highlightCurrentPage = () => {
        // Get the current page filename (e.g., "dashboard.html") and handle the base case for "index.html"
        let currentPageFile = window.location.pathname.split('/').pop();
        if (currentPageFile === '' || currentPageFile === 'index.html') {
            currentPageFile = 'dashboard.html';
        }
        
        // Find the corresponding navigation link in the sidebar
        const navLink = document.querySelector(`nav a[href="${currentPageFile}"]`);
        
        if (navLink) {
            navLink.classList.add('bg-indigo-50', 'text-indigo-700', 'font-semibold');
            navLink.classList.remove('hover:bg-gray-100');
        }
    };

    /**
     * ------------------------------------------------------------------------
     * Reusable Logout Functionality
     * ------------------------------------------------------------------------
     */
    const handleLogout = (e) => {
        if (e) e.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
            // In a real app, you'd clear session data.
            alert('Logging out...');
            window.location.href = 'login.html';
        }
    };
    
    // Attach logout to any element with the class 'logout-button' in the main document.
    // This covers the user dropdown menu link.
    document.querySelectorAll('.logout-button').forEach(button => {
        button.addEventListener('click', handleLogout);
    });


    /**
     * ------------------------------------------------------------------------
     * Reusable User Dropdown Menu
     * ------------------------------------------------------------------------
     */
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');

    if (userMenuButton && userMenu) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            if (userMenu && !userMenu.classList.contains('hidden')) {
                userMenu.classList.add('hidden');
            }
        });
    }

    // --- INITIALIZATION ---
    // Load the sidebar only if a placeholder exists on the current page.
    if (document.getElementById('main-sidebar')) {
        loadSidebar();
    }
});

