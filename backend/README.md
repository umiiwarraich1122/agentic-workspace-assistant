# Jarvis AI Assistant Backend

This is the FastAPI backend for the Jarvis AI Assistant. It uses Google Workspace APIs for interacting with Gmail, Google Calendar, and Google Tasks, and uses LangGraph and LangChain for the agent orchestration.

## Getting Started

### 1. Prerequisites
- Python 3.12+
- A Google Cloud Console project with OAuth 2.0 Client ID and the following API scopes enabled:
  - `openid`, `email`, `profile`
  - `https://www.googleapis.com/auth/gmail.modify`
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/tasks`
- Supabase Project

### 2. Installation

```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your Google Cloud credentials, Supabase credentials, and Cerebras API key.

### 4. Running the Server

Start the development server using:

```bash
uvicorn app.main:app --reload
```

Navigate to `http://localhost:8000/docs` to see the interactive API documentation (Swagger).

## Architecture

- **Auth**: Google OAuth flow.
- **Google API Client**: Async HTTP client that handles API calls to Google Workspace.
- **Agent**: LangGraph implementation using `StateGraph`. Tools are mapped to Google API endpoints.
- **Memory Store**: Supabase integration for storing tokens and session context.
