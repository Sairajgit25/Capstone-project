// The URL of your deployed Python backend
const API_URL = 'https://price-tracker-mf2g.onrender.com';

$(document).ready(function() {
    // --- Authentication State Listener ---
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            $('#dashboard-link').removeClass('hidden');
            $('#auth-container').html(`
                <button id="logout-btn" class="text-2xl text-red-500 dark:text-red-400 hover:scale-110 transition-transform">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `);
        } else {
            // User is signed out
            $('#dashboard-link').addClass('hidden');
            $('#auth-container').html(`
                <button id="login-btn" class="text-2xl text-purple-600 dark:text-purple-400 hover:scale-110 transition-transform">
                    <i class="fas fa-user-circle"></i>
                </button>
            `);
        }
    });

    // --- Event Delegation for Login/Logout ---
    $(document).on('click', '#login-btn', handleLogin);
    $(document).on('click', '#logout-btn', handleLogout);
    
    // --- Load Dynamic Content ---
    loadBestDeals();

    // --- UI Effects ---
    // Navbar scroll effect
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 10) {
            $('#navbar').addClass('shadow-lg').removeClass('shadow-md');
        } else {
            $('#navbar').removeClass('shadow-lg').addClass('shadow-md');
        }
    });

    // Dark Mode Toggle
    // ... (keep the dark mode toggle logic exactly as it was) ...
    
    // --- Dark Mode Toggle ---
    const darkModeToggle = $('#dark-mode-toggle');
    const html = $('html');

    // On page load, check for saved theme
    if (localStorage.getItem('theme') === 'dark') {
        html.addClass('dark');
        darkModeToggle.html('<i class="fas fa-sun"></i>');
    }

    darkModeToggle.on('click', function() {
        if (html.hasClass('dark')) {
            html.removeClass('dark');
            localStorage.setItem('theme', 'light');
            darkModeToggle.html('<i class="fas fa-moon"></i>');
        } else {
            html.addClass('dark');
            localStorage.setItem('theme', 'dark');
            darkModeToggle.html('<i class="fas fa-sun"></i>');
        }
    });
});

// --- Dynamic Content Loading ---
async function loadBestDeals() {
    try {
        const response = await fetch(`${API_URL}/best-deals`);
        const deals = await response.json();
        const container = $('#best-deals-container');
        container.empty(); // Clear existing content

        deals.forEach(deal => {
            const productUrl = `product.html?url=${encodeURIComponent(deal.url)}`;
            const cardHtml = `
                <a href="${productUrl}" class="product-card-link">
                    <div class="product-card">
                        <img src="${deal.image}" alt="${deal.title}" class="w-full h-48 object-cover rounded-t-lg">
                        <div class="p-4">
                            <h3 class="text-lg font-semibold mb-2 truncate">${deal.title}</h3>
                            <div class="flex justify-between items-center">
                                <span class="text-xl font-bold text-green-500">₹${deal.price}</span>
                                <span class="text-yellow-400"><i class="fas fa-star"></i> ${deal.rating}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
            container.append(cardHtml);
        });
    } catch (error) {
        console.error("Failed to load best deals:", error);
        $('#best-deals-container').html('<p class="text-red-500">Could not load deals. Please try again later.</p>');
    }
}


// --- Authentication Functions ---
function handleLogin() {
    // ... (keep the entire SweetAlert2 login logic as it was) ...
     // --- Login Modal using SweetAlert2 ---
$('#login-btn').on('click', function() {
    Swal.fire({
        title: 'Login / Sign In',
        // ... (keep the same HTML as before)
        html: `...`, 
        confirmButtonText: 'Login',
        // ... (keep customClass and other options)
        preConfirm: () => {
            const email = Swal.getPopup().querySelector('#swal-email').value;
            const password = Swal.getPopup().querySelector('#swal-password').value;
            if (!email || !password) {
                Swal.showValidationMessage(`Please enter email and password`);
                return false; // Stop the confirmation
            }

            // Perform login with Firebase
            return firebase.auth().signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    return userCredential.user;
                })
                .catch(error => {
                    Swal.showValidationMessage(`Login Failed: ${error.message}`);
                    return false;
                });
        }
    }).then((result) => {
        // This 'result' is the userCredential object from Firebase
        if (result.isConfirmed && result.value) {
            Swal.fire({
                title: 'Logged In!',
                text: `Welcome back, ${result.value.email}`,
                icon: 'success'
            });
            // You can now update the UI to show the user is logged in
        }
    });
});
}

function handleLogout() {
    firebase.auth().signOut().then(() => {
        Swal.fire('Logged Out', 'You have been successfully logged out.', 'success');
    }).catch(error => {
        console.error("Logout Error:", error);
        Swal.fire('Error', 'Failed to log out.', 'error');
    });
}

// --- Tracking Form Submission ---
// ... (keep the $('#track-form').on('submit', ...) logic exactly as it was) ...

$('#track-form').on('submit', async function(event) {
    event.preventDefault(); // Stop the form from navigating away

    const productUrl = $(this).find('input[type="search"]').val();
    if (!productUrl) {
        Swal.fire('Oops...', 'Please enter a product URL to track!', 'warning');
        return;
    }

    // 1. Check if user is logged in
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        Swal.fire('Login Required', 'You must be logged in to track products.', 'error');
        return;
    }

    // 2. Get the Firebase ID Token (this is our JWT)
    const idToken = await currentUser.getIdToken(true);

    // 3. Send the request to our backend API using fetch()
    try {
        const response = await fetch(`${API_URL}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // This is the crucial part for authentication!
                'Authorization': `Bearer ${idToken}` 
            },
            body: JSON.stringify({
                url: productUrl
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // If the server responded with an error (e.g., 400, 500)
            throw new Error(data.error || 'Something went wrong on the server.');
        }

        // Success!
        Swal.fire({
            title: 'Success!',
            text: `Now tracking "${data.data.title}"`,
            icon: 'success'
        });
        
        // Optionally, redirect to the product page or a dashboard
        // window.location.href = 'product.html'; 

    } catch (error) {
        console.error('Tracking Error:', error);
        Swal.fire('Tracking Failed', error.message, 'error');
    }
});