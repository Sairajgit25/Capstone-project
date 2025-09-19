// The URL of your deployed Python backend
const API_URL = 'https://pricewise-backend.onrender.com'; // Use your actual Render URL

$(document).ready(function() {

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

});


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