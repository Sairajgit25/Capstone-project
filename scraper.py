import requests
from bs4 import BeautifulSoup
import re

def scrape_product_data(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return None

    soup = BeautifulSoup(response.content, 'html.parser')
    
    title = None
    price_str = None
    image_url = "https://via.placeholder.com/400" # Default placeholder image

    # --- Attempt to find data (selectors will need maintenance) ---
    if 'amazon.in' in url:
        title_element = soup.find('span', id='productTitle')
        price_element = soup.find('span', class_='a-price-whole')
        image_element = soup.find('div', id='imgTagWrapperId').find('img') if soup.find('div', id='imgTagWrapperId') else None
        
    elif 'flipkart.com' in url:
        title_element = soup.find('span', class_='B_NuCI')
        price_element = soup.find('div', class_='_30jeq3 _16Jk6d')
        image_element = soup.find('div', class_='_312y95').find('img') if soup.find('div', class_='_312y95') else None

    # Extract text and src safely
    if title_element:
        title = title_element.get_text().strip()
    if price_element:
        price_str = price_element.get_text().strip()
    if image_element and image_element.get('src'):
        image_url = image_element.get('src')
        
    if not title or not price_str:
        return None

    price = float(re.sub(r'[^\d.]', '', price_str))

    return {
        'title': title,
        'price': price,
        'url': url,
        'image': image_url
    }