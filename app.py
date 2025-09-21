import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
from supabase import create_client, Client
from functools import wraps
import datetime

from scraper import scrape_product_data

# --- INITIALIZATION ---
load_dotenv()
app = Flask(__name__)
CORS(app) 

# Initialize Firebase Admin SDK
cred = credentials.Certificate(os.getenv('FIREBASE_CREDENTIALS_PATH'))
firebase_admin.initialize_app(cred)

# Initialize Supabase Client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# --- AUTHENTICATION DECORATOR ---
# This function will protect our routes
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Authentication Token is missing!'}), 401
        
        try:
            decoded_token = auth.verify_id_token(token)
            current_user_uid = decoded_token['uid']
        except Exception as e:
            return jsonify({'message': 'Invalid Authentication Token!', 'error': str(e)}), 401
        
        return f(current_user_uid, *args, **kwargs)
    return decorated


# ... (keep all INITIALIZATION and AUTHENTICATION DECORATOR code)

# --- API ROUTES ---

@app.route('/')
def home():
    return "PriceWise Backend API is running!"

# NEW: Endpoint to get products for the homepage
@app.route('/best-deals', methods=['GET'])
def get_best_deals():
    # In a real app, you'd query your database for popular products.
    # For this example, we'll return a static list.
    deals = [
        {
            "title": "SONY Wireless Headphones",
            "price": "24,999",
            "rating": "4.5",
            "image": "product image/sonyHeadphone.webp",
            "url": "https://www.amazon.in/Sony-WH-1000XM5-Wireless-Cancelling-Headphones/dp/B0B4S3X5S1/"
        },
        {
            "title": "iPhone 16 Pro Max",
            "price": "1,59,500",
            "rating": "4.8",
            "image": "product image/iPhone-16-Pro-Max-784x441.webp",
            "url": "https://www.flipkart.com/apple-iphone-15-pro-max-blue-titanium-256-gb/p/itm_main_product_page" # Example URL
        },
        {
            "title": "Lenovo LOQ 15",
            "price": "90,300",
            "rating": "4.6",
            "image": "product image/lenovoLOQ.webp",
            "url": "https://www.amazon.in/Lenovo-i7-13650HX-40-64cm-Graphics-83FQ000SIN/dp/B0CLSF8345/"
        },
        {
            "title": "BOULT Smart Watch",
            "price": "2,599",
            "rating": "4.7",
            "image": "product image/boultwatch.webp",
            "url": "https://www.flipkart.com/boult-crown-r-pro-1-43-amoled-bt-calling-smartwatch/p/itm_main_product_page" # Example URL
        }
    ]
    return jsonify(deals), 200

# NEW: Endpoint to get details for a single product page by scraping
@app.route('/product-details', methods=['GET'])
def get_product_details():
    product_url = request.args.get('url')
    if not product_url:
        return jsonify({'error': 'Product URL parameter is required'}), 400
    
    scraped_data = scrape_product_data(product_url)
    
    if not scraped_data:
        return jsonify({'error': 'Could not scrape product data.'}), 500
        
    # In a real app, you would also fetch price history from your Supabase DB
    # For now, we'll add placeholder history
    scraped_data['price_history'] = [
        {'date': '2025-08-20T10:00:00Z', 'price': scraped_data['price'] * 1.1},
        {'date': '2025-08-25T10:00:00Z', 'price': scraped_data['price'] * 1.05},
        {'date': '2025-09-01T10:00:00Z', 'price': scraped_data['price'] * 0.98},
        {'date': '2025-09-10T10:00:00Z', 'price': scraped_data['price'] * 1.02},
        {'date': '2025-09-19T10:00:00Z', 'price': scraped_data['price']}
    ]

    return jsonify(scraped_data), 200


# ... (keep the /track and /products endpoints and the final app.run block)

# Endpoint to track a new product
@app.route('/track', methods=['POST'])
@token_required
def track_product(current_user_uid):
    data = request.get_json()
    product_url = data.get('url')

    if not product_url:
        return jsonify({'error': 'Product URL is required'}), 400

    # Scrape data from the URL
    scraped_data = scrape_product_data(product_url)
    if not scraped_data:
        return jsonify({'error': 'Failed to scrape product data. The website might be blocking us or the URL is invalid.'}), 500

    # Check if the product is already being tracked by this user
    existing_product = supabase.table('products').select('*').eq('user_id', current_user_uid).eq('product_url', product_url).execute()

    if existing_product.data:
        # Product exists, update price history
        product = existing_product.data[0]
        price_history = product.get('price_history', [])
        
        # Add new price entry with a timestamp
        new_entry = {'price': scraped_data['price'], 'date': datetime.datetime.utcnow().isoformat()}
        price_history.append(new_entry)
        
        updated_data = {
            'price_history': price_history,
            'product_title': scraped_data['title'],
            'updated_at': datetime.datetime.utcnow().isoformat()
        }
        supabase.table('products').update(updated_data).eq('id', product['id']).execute()
    else:
        # Product is new for this user, insert it
        new_product_data = {
            'user_id': current_user_uid,
            'product_url': product_url,
            'product_title': scraped_data['title'],
            'price_history': [{'price': scraped_data['price'], 'date': datetime.datetime.utcnow().isoformat()}]
        }
        supabase.table('products').insert(new_product_data).execute()

    return jsonify({'message': 'Product tracked successfully!', 'data': scraped_data}), 201


# Endpoint to get all products for the logged-in user
@app.route('/products', methods=['GET'])
@token_required
def get_user_products(current_user_uid):
    products = supabase.table('products').select('*').eq('user_id', current_user_uid).order('created_at', desc=True).execute()
    return jsonify(products.data), 200


if __name__ == '__main__':
    app.run(debug=True, port=os.getenv("PORT", 5000))
