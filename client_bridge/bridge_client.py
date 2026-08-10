import asyncio
import websockets
import json
import os
import platform
from pathlib import Path

# Common directories for searching
USER_HOME = str(Path.home())
COMMON_SEARCH_DIRS = [
    os.path.join(USER_HOME, "Desktop"),
    os.path.join(USER_HOME, "Documents"),
    os.path.join(USER_HOME, "Downloads"),
]

IGNORE_DIRS = {".git", "node_modules", ".venv", "__pycache__", "venv", ".idea", ".vscode", "build", "dist"}

def _find_folder(folder_name: str) -> str:
    """Helper to find a folder by name in common directories."""
    if os.path.isabs(folder_name) and os.path.exists(folder_name):
        return folder_name
        
    folder_name_lower = folder_name.lower()
    for search_dir in COMMON_SEARCH_DIRS:
        if not os.path.exists(search_dir):
            continue
        for root, dirs, _ in os.walk(search_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for d in dirs:
                if d.lower() == folder_name_lower:
                    return os.path.join(root, d)
            if root.count(os.sep) - search_dir.count(os.sep) > 3:
                del dirs[:]
    return None

def handle_open_folder(payload: dict) -> dict:
    path_or_name = payload.get("path_or_name")
    if not path_or_name:
        return {"status": "error", "message": "No path provided."}
        
    target_path = path_or_name if os.path.exists(path_or_name) else _find_folder(path_or_name)
    if not target_path:
        return {"status": "error", "message": f"Could not find folder '{path_or_name}'."}
        
    try:
        if platform.system() == 'Windows':
            os.startfile(target_path)
            return {"status": "success", "message": f"Successfully opened {target_path} on your PC."}
        else:
            return {"status": "error", "message": "os.startfile is only available on Windows."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def handle_search_files(payload: dict) -> dict:
    query = payload.get("query")
    directory = payload.get("directory")
    if not query:
        return {"status": "error", "message": "No query provided."}
        
    dirs_to_search = [directory] if directory and os.path.exists(directory) else COMMON_SEARCH_DIRS
    results = []
    
    try:
        query_lower = query.lower()
        for search_dir in dirs_to_search:
            if not os.path.exists(search_dir): continue
            for root, dirs, files in os.walk(search_dir):
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                for file in files:
                    if query_lower in file.lower():
                        results.append(os.path.join(root, file))
                if root.count(os.sep) - search_dir.count(os.sep) > 4:
                    del dirs[:]
                if len(results) >= 20: break
            if len(results) >= 20: break
            
        if not results:
            return {"status": "success", "message": f"No files found matching '{query}'."}
        return {"status": "success", "message": f"Found files:\n" + "\n".join(results[:20])}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def handle_create_folder(payload: dict) -> dict:
    folder_name = payload.get("folder_name")
    path = payload.get("path")
    if not folder_name:
        return {"status": "error", "message": "No folder name provided."}
        
    try:
        base_path = path if path and os.path.exists(path) else os.path.join(USER_HOME, "Desktop")
        full_path = os.path.join(base_path, folder_name)
        if os.path.exists(full_path):
            return {"status": "error", "message": f"Folder already exists at {full_path}"}
        os.makedirs(full_path)
        return {"status": "success", "message": f"Created folder at {full_path}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def connect_bridge():
    user_id = input("Enter your Jarvis User ID: ").strip()
    if not user_id:
        print("User ID is required.")
        return
        
    server_url = "wss://www.mr-jarvis.tech/api/bridge/ws/" + user_id
    
    print(f"Connecting to Jarvis Server: {server_url} ...")
    
    while True:
        try:
            async with websockets.connect(server_url) as websocket:
                print("Connected! Listening for PC commands...")
                while True:
                    message_str = await websocket.recv()
                    data = json.loads(message_str)
                    
                    action = data.get("action")
                    correlation_id = data.get("correlation_id")
                    payload = data.get("payload", {})
                    
                    print(f"Received command: {action}")
                    
                    response = {"correlation_id": correlation_id}
                    
                    if action == "open_folder":
                        res = handle_open_folder(payload)
                    elif action == "search_files":
                        res = handle_search_files(payload)
                    elif action == "create_folder":
                        res = handle_create_folder(payload)
                    else:
                        res = {"status": "error", "message": f"Unknown action: {action}"}
                        
                    response.update(res)
                    await websocket.send(json.dumps(response))
                    print(f"Sent response: {res['status']}")
                    
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed by server. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"Connection error: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(connect_bridge())
