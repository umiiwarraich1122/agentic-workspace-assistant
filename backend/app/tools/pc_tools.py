import os
import glob
import subprocess
from pathlib import Path
from langchain_core.tools import tool
import logging

logger = logging.getLogger(__name__)

# Common directories to search in to avoid searching the entire C: drive
USER_HOME = str(Path.home())
COMMON_SEARCH_DIRS = [
    os.path.join(USER_HOME, "Desktop"),
    os.path.join(USER_HOME, "Documents"),
    os.path.join(USER_HOME, "Downloads"),
    "D:\\Internship", # Adding the specific workspace path
]

# Directories to explicitly skip for performance
IGNORE_DIRS = {".git", "node_modules", ".venv", "__pycache__", "venv", ".idea", ".vscode", "build", "dist"}

def _find_folder(folder_name: str) -> str:
    """Helper to find a folder by name in common directories."""
    # If the user provided an absolute path that exists, return it
    if os.path.isabs(folder_name) and os.path.exists(folder_name):
        return folder_name
        
    folder_name_lower = folder_name.lower()
    
    for search_dir in COMMON_SEARCH_DIRS:
        if not os.path.exists(search_dir):
            continue
        for root, dirs, _ in os.walk(search_dir):
            # Prune ignored directories to speed up search
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for d in dirs:
                if d.lower() == folder_name_lower:
                    return os.path.join(root, d)
            # Limit depth for performance
            if root.count(os.sep) - search_dir.count(os.sep) > 3:
                del dirs[:]
    return None

@tool
def open_folder(path_or_name: str) -> str:
    """
    Opens a folder or file on the user's local PC using Windows Explorer.
    Provide the exact absolute path or the name of a common folder (e.g., 'Internship', 'Documents').
    """
    logger.info(f"Attempting to open PC folder/file: {path_or_name}")
    try:
        # First, check if it's an exact path that exists
        if os.path.exists(path_or_name):
            target_path = path_or_name
        else:
            # Try to find the folder in common locations
            target_path = _find_folder(path_or_name)
            
        if not target_path:
            return f"Error: Could not find any folder or file named '{path_or_name}' on the PC."
            
        # Use os.startfile which is available on Windows to open files/folders in default app
        os.startfile(target_path)
        return f"Successfully opened: {target_path} on your PC."
    except Exception as e:
        logger.error(f"Error opening folder {path_or_name}: {e}")
        return f"Failed to open '{path_or_name}': {str(e)}"

@tool
def search_files(query: str, directory: str = None) -> str:
    """
    Searches for files on the user's PC matching the query name. 
    If directory is not provided, it searches common user directories (Desktop, Documents, etc.).
    Returns a list of matching file paths.
    """
    logger.info(f"Searching for files matching '{query}' in {directory or 'common directories'}")
    
    dirs_to_search = [directory] if directory and os.path.exists(directory) else COMMON_SEARCH_DIRS
    results = []
    
    try:
        query_lower = query.lower()
        for search_dir in dirs_to_search:
            if not os.path.exists(search_dir):
                continue
                
            # Perform a walk
            for root, dirs, files in os.walk(search_dir):
                # Prune ignored directories to speed up search
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                
                for file in files:
                    if query_lower in file.lower():
                        results.append(os.path.join(root, file))
                
                # Limit depth to prevent very long searches
                if root.count(os.sep) - search_dir.count(os.sep) > 4:
                    del dirs[:] # Correctly stop os.walk from going deeper
                    
                if len(results) >= 20: # Cap results to avoid huge outputs
                    break
            
            if len(results) >= 20:
                break
                
        if not results:
            return f"No files found matching '{query}'."
            
        return f"Found {len(results)} files matching '{query}':\n" + "\n".join(results[:20])
    except Exception as e:
        logger.error(f"Error searching files: {e}")
        return f"An error occurred while searching: {str(e)}"

@tool
def create_folder(folder_name: str, path: str = None) -> str:
    """
    Creates a new folder on the PC.
    If path is not specified, it will create it on the Desktop.
    """
    try:
        base_path = path if path and os.path.exists(path) else os.path.join(USER_HOME, "Desktop")
        full_path = os.path.join(base_path, folder_name)
        
        if os.path.exists(full_path):
            return f"Folder already exists at: {full_path}"
            
        os.makedirs(full_path)
        return f"Successfully created folder at: {full_path}"
    except Exception as e:
        logger.error(f"Error creating folder {folder_name}: {e}")
        return f"Failed to create folder '{folder_name}': {str(e)}"

def get_pc_tools():
    """Returns the list of PC control tools."""
    return [open_folder, search_files, create_folder]
