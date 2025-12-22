from flask import Flask, render_template, jsonify, send_from_directory, request, redirect, url_for, Response
import json
import os
from werkzeug.utils import secure_filename
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import ipaddress
import socket
import urllib3

# Suppress SSL warnings only for known internal sites
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
JSON_FILE = 'links.json'
CATEGORIES_FILE = 'categories.json'
UPLOAD_FOLDER = 'images'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Cache for favicons to avoid repeated requests
favicon_cache = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_links():
    if not os.path.exists(JSON_FILE):
        return {}
    with open(JSON_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_links(links):
    with open(JSON_FILE, 'w') as f:
        json.dump(links, f, indent=4)

def read_categories():
    if not os.path.exists(CATEGORIES_FILE):
        return {}
    with open(CATEGORIES_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_categories(categories):
    with open(CATEGORIES_FILE, 'w') as f:
        json.dump(categories, f, indent=4)

def is_internal_ip(url):
    """Check if URL points to internal/private IP address"""
    try:
        parsed = urlparse(url)
        hostname = parsed.netloc.split(':')[0]
        if hostname in ['localhost', '127.0.0.1', '::1']:
            return True
        try:
            ip = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private
        except (socket.gaierror, ValueError):
            return False
    except Exception:
        return False

def extract_favicon(url):
    """Extract favicon URL from a website with caching - optimized for speed"""
    if not url:
        return None
    
    # Normalize URL
    if not url.startswith("http"):
        if any(url.startswith(prefix) for prefix in ['10.', '172.', '192.168.', 'localhost']):
            url = "http://" + url
        else:
            url = "https://" + url
    
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    cache_key = parsed.netloc
    
    # Check cache first - instant return
    if cache_key in favicon_cache:
        return favicon_cache[cache_key]
    
    is_internal = is_internal_ip(url)
    verify_ssl = not is_internal
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    
    result = None
    
    # Strategy 1: Try most common paths first (faster than HTML parsing)
    common_paths = ["/favicon.ico", "/ui/favicon.ico", "/favicon.png"]
    for path in common_paths:
        try:
            test_url = base + path
            r = requests.get(test_url, timeout=1, headers=headers, verify=verify_ssl, stream=True)
            if r.status_code == 200:
                result = test_url
                r.close()
                break
            r.close()
        except:
            continue
    
    # Strategy 2: Parse HTML only if common paths failed
    if not result:
        try:
            r = requests.get(url, timeout=2, headers=headers, verify=verify_ssl)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            
            for rel in ['icon', 'shortcut icon', 'apple-touch-icon']:
                icon = soup.find("link", rel=lambda x: x and rel in x.lower())
                if icon and icon.get("href"):
                    result = urljoin(url, icon["href"])
                    break
        except:
            pass
    
    # Strategy 3: Google favicon service as fallback (external sites only)
    if not result and not is_internal:
        result = f"https://www.google.com/s2/favicons?sz=64&domain={parsed.netloc}"
    
    # Cache the result (even if None, to avoid retrying failed lookups)
    favicon_cache[cache_key] = result
    
    return result

def add_link_to_json(new_link):
    data = read_links()
    category = new_link['category']
    team = new_link['team']

    if category not in data:
        data[category] = {}
    if team not in data[category]:
        data[category][team] = []

    data[category][team].append({
        "url": new_link['url'],
        "description": new_link['description']
    })

    save_links(data)


@app.route('/')
@app.route('/main')
def main():
    return render_template('main.html')

@app.route('/admin')
def admin_panel():
    return render_template('index.html')

@app.route('/cloud')
def cloud():
    # Static HTML page with hardcoded links
    return render_template('cloud.html')

@app.route('/server')
def server():
    # Static HTML page with hardcoded links
    return render_template('server.html')

# Dynamic route for category pages
@app.route('/<category_name>')
def category_page(category_name):
    """Dynamically serve category pages using the single template"""
    categories = read_categories()
    
    # Check if the category exists
    if category_name in categories:
        icon_data = categories[category_name]['icon']
        is_text_icon = (icon_data == 'text')
        icon_path = f"/images/{icon_data}" if not is_text_icon else None
        return render_template('category.html', 
                             category_name=category_name, 
                             icon_path=icon_path,
                             is_text_icon=is_text_icon)
    
    # Also check for URL-friendly names
    for cat_name, cat_data in categories.items():
        url_friendly_name = cat_name.lower().replace(' ', '_')
        if category_name == url_friendly_name:
            icon_data = cat_data['icon']
            is_text_icon = (icon_data == 'text')
            icon_path = f"/images/{icon_data}" if not is_text_icon else None
            return render_template('category.html', 
                                 category_name=cat_name, 
                                 icon_path=icon_path,
                                 is_text_icon=is_text_icon)
    
    return "Category not found", 404


@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(read_links())


@app.route('/api/links', methods=['GET', 'POST'])
def handle_links():
    if request.method == 'GET':
        return jsonify(read_links())
    elif request.method == 'POST':
        new_link = request.json
        add_link_to_json(new_link)
        return jsonify({'status': 'success', 'message': 'Link added!'}), 201


@app.route('/api/links/delete', methods=['POST'])
def delete_link():
    data = request.json
    links = read_links()
    cat = data['category']
    team = data['team']
    url = data['url']
    description = data['description']

    if cat in links and team in links[cat]:
        links[cat][team] = [l for l in links[cat][team] if not (l['url'] == url and l['description'] == description)]
        if not links[cat][team]:
            del links[cat][team]
        if not links[cat]:
            del links[cat]
        save_links(links)
    return jsonify({'status': 'success'}), 200

@app.route('/api/links/edit', methods=['POST'])
def edit_link():
    data = request.json
    old_cat = data['old_category']
    old_team = data['old_team']
    old_url = data['old_url']
    old_description = data['old_description']

    new_cat = data['new_category']
    new_team = data['new_team']
    new_url = data['new_url']
    new_description = data['new_description']

    links = read_links()

    if old_cat in links and old_team in links[old_cat]:
        found = None
        for link in links[old_cat][old_team]:
            if link['url'] == old_url and link['description'] == old_description:
                found = link
                break
        if found:
            links[old_cat][old_team].remove(found)
            if not links[old_cat][old_team]:
                del links[old_cat][old_team]
            if not links[old_cat]:
                del links[old_cat]

            if new_cat not in links:
                links[new_cat] = {}
            if new_team not in links[new_cat]:
                links[new_cat][new_team] = []
            links[new_cat][new_team].append({
                "url": new_url,
                "description": new_description
            })
            save_links(links)
    return jsonify({'status': 'success'}), 200


# Category Management Endpoints
@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(read_categories())


@app.route('/api/categories/add', methods=['POST'])
def add_category():
    category_name = request.form.get('category_name')
    
    if not category_name:
        return jsonify({'status': 'error', 'message': 'Category name is required'}), 400
    
    categories = read_categories()
    
    # Check if category already exists
    if category_name in categories:
        return jsonify({'status': 'error', 'message': 'Category already exists'}), 400
    
    # Handle file upload (icon is now optional)
    icon_filename = None
    if 'icon' in request.files and request.files['icon'].filename != '':
        file = request.files['icon']
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Use category name for the icon filename to make it consistent
            file_extension = filename.rsplit('.', 1)[1].lower()
            icon_filename = f"{category_name.lower().replace(' ', '_')}.{file_extension}"
            icon_path = os.path.join(app.config['UPLOAD_FOLDER'], icon_filename)
            file.save(icon_path)
        else:
            return jsonify({'status': 'error', 'message': 'Invalid file type'}), 400
    
    # If no icon provided, use 'text' as placeholder to indicate text-based icon
    if not icon_filename:
        icon_filename = 'text'
    
    # Generate URL based on category name
    category_url = f"/{category_name.lower().replace(' ', '_')}"
    
    categories[category_name] = {
        'icon': icon_filename,
        'url': category_url
    }
    save_categories(categories)
    
    return jsonify({'status': 'success', 'message': 'Category added successfully'}), 201


@app.route('/api/categories/update-icon', methods=['POST'])
def update_category_icon():
    category_name = request.form.get('category_name')
    
    if not category_name:
        return jsonify({'status': 'error', 'message': 'Category name is required'}), 400
    
    categories = read_categories()
    
    # Check if category exists
    if category_name not in categories:
        return jsonify({'status': 'error', 'message': 'Category does not exist'}), 404
    
    # Handle file upload
    if 'icon' not in request.files:
        return jsonify({'status': 'error', 'message': 'Icon file is required'}), 400
    
    file = request.files['icon']
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Delete old icon file if it exists
        old_icon = categories[category_name]['icon']
        old_icon_path = os.path.join(app.config['UPLOAD_FOLDER'], old_icon)
        if os.path.exists(old_icon_path):
            try:
                os.remove(old_icon_path)
            except:
                pass
        
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        icon_filename = f"{category_name.lower().replace(' ', '_')}.{file_extension}"
        icon_path = os.path.join(app.config['UPLOAD_FOLDER'], icon_filename)
        file.save(icon_path)
        
        categories[category_name]['icon'] = icon_filename
        save_categories(categories)
        
        return jsonify({'status': 'success', 'message': 'Icon updated successfully'}), 200
    
    return jsonify({'status': 'error', 'message': 'Invalid file type'}), 400


@app.route('/api/categories/delete', methods=['POST'])
def delete_category():
    data = request.json
    category_name = data.get('category_name')
    
    if not category_name:
        return jsonify({'status': 'error', 'message': 'Category name is required'}), 400
    
    categories = read_categories()
    
    if category_name not in categories:
        return jsonify({'status': 'error', 'message': 'Category does not exist'}), 404
    
    # Delete icon file
    icon_filename = categories[category_name]['icon']
    icon_path = os.path.join(app.config['UPLOAD_FOLDER'], icon_filename)
    if os.path.exists(icon_path):
        try:
            os.remove(icon_path)
        except:
            pass
    
    # Delete category from categories.json
    del categories[category_name]
    save_categories(categories)
    
    # Delete all links data for this category from links.json
    links = read_links()
    if category_name in links:
        del links[category_name]
        save_links(links)
    
    return jsonify({'status': 'success', 'message': 'Category and all its links deleted successfully'}), 200


@app.route('/api/favicon')
def get_favicon():
    """API endpoint to extract favicon from URL"""
    url = request.args.get('url')
    if not url:
        return jsonify({'favicon': None, 'status': 'error'}), 400
    
    icon = extract_favicon(url)
    return jsonify({
        'favicon': icon,
        'status': 'ok' if icon else 'fallback'
    })


@app.route('/api/proxy-favicon')
def proxy_favicon():
    """Proxy images to avoid CORS issues"""
    img_url = request.args.get('url')
    if not img_url:
        return "No URL provided", 400
    
    try:
        is_internal = is_internal_ip(img_url)
        verify_ssl = not is_internal
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(img_url, timeout=10, headers=headers, verify=verify_ssl, stream=True)
        r.raise_for_status()
        return Response(r.content, mimetype=r.headers.get('Content-Type', 'image/png'))
    except Exception as e:
        print(f"Proxy error: {e}")
        return "Error loading image", 404


@app.route('/templates/<path:filename>')
def serve_templates(filename):
    return send_from_directory('templates', filename)


@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('images', filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
