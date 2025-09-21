document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://price-tracker-mf2g.onrender.com';

    // 1. Get the product URL from the browser's query parameter
    const params = new URLSearchParams(window.location.search);
    const productUrl = params.get('url');

    if (!productUrl) {
        document.getElementById('product-title').innerText = 'Product Not Found';
        document.getElementById('product-description').innerText = 'No product URL was provided. Please go back to the homepage and select a product.';
        return;
    }

    // 2. Fetch the product details from our backend
    fetchProductDetails(productUrl);
});

async function fetchProductDetails(url) {
    try {
        const response = await fetch(`${API_URL}/product-details?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch product details.');
        }
        const data = await response.json();
        
        // 3. Populate the page with the fetched data
        updateProductPage(data);

    } catch (error) {
        console.error('Error fetching product details:', error);
        document.getElementById('product-title').innerText = 'Error';
        document.getElementById('product-description').innerText = 'Could not load product details. The product might be unavailable or the link is broken.';
    }
}

function updateProductPage(data) {
    document.getElementById('page-title').innerText = `${data.title} - PriceTracker`;
    document.getElementById('product-title').innerText = data.title;
    document.getElementById('product-image').src = data.image;
    document.getElementById('product-description').innerText = "Detailed specifications and user reviews can be found on the retailer's page.";
    
    // Set store links
    if (data.url.includes('amazon')) {
        document.getElementById('amazon-link').href = data.url;
    } else if (data.url.includes('flipkart')) {
        document.getElementById('flipkart-link').href = data.url;
    }

    // Calculate prices from history
    const prices = data.price_history.map(entry => entry.price);
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    
    document.getElementById('current-price').innerText = `₹${data.price.toLocaleString()}`;
    document.getElementById('highest-price').innerText = `₹${highestPrice.toLocaleString()}`;
    document.getElementById('lowest-price').innerText = `₹${lowestPrice.toLocaleString()}`;
    
    // 4. Update the Chart.js graph
    updatePriceChart(data.price_history);
}

function updatePriceChart(priceHistory) {
    const ctx = document.getElementById('priceHistoryChart').getContext('2d');
    
    const labels = priceHistory.map(entry => new Date(entry.date).toLocaleDateString());
    const prices = priceHistory.map(entry => entry.price);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (₹)',
                data: prices,
                borderColor: 'rgb(168, 85, 247)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                       callback: function(value) {
                            return '₹' + value.toLocaleString();
                       }
                    }
                }
            }
        }
    });
}