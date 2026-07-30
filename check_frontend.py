import urllib.request
import re

try:
    req = urllib.request.Request("https://agentic-workspace-assistant-e37r.vercel.app/", method="GET")
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        # Find the main JS file
        js_files = re.findall(r'src="(/assets/index-.*?\.js)"', html)
        if js_files:
            js_url = "https://agentic-workspace-assistant-e37r.vercel.app" + js_files[0]
            print(f"Checking JS bundle: {js_url}")
            js_req = urllib.request.Request(js_url, method="GET")
            with urllib.request.urlopen(js_req) as js_response:
                js_code = js_response.read().decode('utf-8')
                if 'http://localhost:8000' in js_code:
                    print("ERROR: localhost:8000 is still hardcoded in the live frontend!")
                else:
                    print("SUCCESS: localhost:8000 is NOT in the frontend bundle.")
                    # print api url
                    match = re.search(r'baseURL:"(https?://[^"]+)"', js_code)
                    if match:
                        print(f"Found baseURL: {match.group(1)}")
        else:
            print("No JS files found in HTML")
except Exception as e:
    print(f"Error: {e}")
