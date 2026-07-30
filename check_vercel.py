import urllib.request

def check_url(url):
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req) as response:
            print(f"[{url}] HTTP {response.status}")
            print(f"Final URL: {response.url}")
    except urllib.error.HTTPError as e:
        print(f"[{url}] HTTP Error {e.code}: {e.reason}")
        print(f"Headers: {e.headers}")
    except Exception as e:
        print(f"[{url}] Error: {e}")

print("Checking Backend...")
check_url("https://agentic-workspace-assistant.vercel.app/auth/login")

print("Checking Frontend...")
check_url("https://agentic-workspace-assistant-e37r.vercel.app/")
