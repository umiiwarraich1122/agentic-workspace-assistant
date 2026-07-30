# Jarvis AI Personal Assistant - Project Documentation

This document explains every aspect of the project, including the architecture, tech stack, and how the different pieces communicate with each other.

## 1. High-Level Overview
Jarvis AI is a fully autonomous Personal Assistant built with a React frontend and a FastAPI (Python) backend. It connects directly to your Google Workspace (Gmail, Calendar, Tasks) and uses an advanced AI Agent (powered by LangGraph and OpenRouter) to execute tasks on your behalf, like drafting emails, scheduling meetings, and summarizing your unread messages.

---

## 2. Technology Stack

### Frontend (Client-Side)
* **React + TypeScript:** The core framework for building the UI. TypeScript ensures strict typing to prevent bugs.
* **Vite:** The build tool and development server, chosen for its extreme speed.
* **Tailwind CSS:** Used for all styling. Provides utility classes to build a modern, high-tech, "Cyberpunk/Jarvis" aesthetic without writing custom CSS files.
* **Framer Motion:** A powerful animation library used for the smooth transitions, loading rings, and dynamic AI status indicators.
* **Axios:** Used to make HTTP requests to the Python backend.
* **React Router:** Handles navigation between the different modules (Chat, Emails, Calendar, Tasks).

### Backend (Server-Side)
* **FastAPI:** A high-performance Python web framework used to create the API endpoints. It handles requests from the frontend and manages the AI logic.
* **LangChain & LangGraph:** The brain of the AI. LangGraph allows us to build a "stateful agent" that can think, decide to use tools (like a Google API tool), observe the tool's result, and then formulate a final answer.
* **OpenRouter:** An LLM aggregator used as the intelligence engine. We use it to route requests to powerful, free AI models while preserving OpenAI-compatible code.
* **Supabase (PostgreSQL):** The primary database. It stores user tokens, cached emails, synced tasks, calendar events, and your permanent conversation history.

---

## 3. Core Modules & Project Structure

### `backend/app/main.py`
The entry point for the FastAPI server. It sets up CORS (so the React frontend can talk to it) and registers all the different API routes (`/auth`, `/chat`, `/emails`, etc.).

### `backend/app/api/`
Contains the endpoints (URLs) that the frontend calls:
* **`auth.py`:** Handles Google OAuth login. It generates the Google login link, receives the callback, extracts your name/email, and passes the access tokens to the Token Manager.
* **`chat.py`:** The most important endpoint. It receives your chat messages, fetches your chat history from Supabase, triggers the LangGraph AI agent, saves the AI's response to the database, and returns the response to the UI. It also contains the logic to delete chat threads.
* **`emails.py`, `calendar.py`, `todos.py`:** Endpoints for syncing data and performing manual operations on your Google Workspace. 

### `backend/app/auth/`
* **`oauth.py`:** Manages the OAuth 2.0 flow, requesting specific permissions (scopes) from Google (like `gmail.modify`, `calendar`, `tasks`).
* **`token_manager.py`:** Securely stores and retrieves your Google Access Tokens from memory and Supabase. It ensures strict multi-tenant isolation (so User A can never accidentally use User B's tokens) and auto-refreshes tokens when they expire.

### `backend/app/agent/`
* **`graph_agent.py`:** Defines the AI's personality and rules via the System Prompt. It wires up the LLM, binds the Google tools to it, and compiles the LangGraph workflow. It controls whether the AI should output JSON, plain text, or execute a tool.
* **`state.py`:** Defines the "memory" state of the AI agent for a single conversation turn.

### `backend/app/tools/`
Contains the Python functions that the AI can choose to run:
* **`mail_tools.py`:** Tools for the AI to read synced emails from the database and draft new emails via the Gmail API.
* **`calendar_tools.py`:** Tools to read, create, update, and delete Google Calendar events.
* **`todo_tools.py`:** Tools to manage your Google Tasks.

### `frontend/src/pages/`
* **`CommandCenter.tsx`:** The main Chat UI. It handles displaying the conversation, formatting the AI's plain-text or JSON responses, rendering the AI "thinking" animations, and managing chat history in the sidebar.
* **`AuthCallback.tsx` / `App.tsx`:** Intercepts the login redirect from the backend, extracts your Name and User ID from the URL, saves it to `localStorage`, and logs you into the system.

---

## 4. How the Flow Works (Step-by-Step)

1. **Authentication:** 
   You click Login. The backend redirects you to Google. You approve permissions. Google redirects you to `/auth/callback` on the backend. The backend trades the auth code for Access/Refresh tokens, saves them in Supabase, and redirects you back to React with your Name and User ID.

2. **Background Sync:** 
   Upon logging in, the frontend silently triggers `/sync` endpoints. The backend reaches out to Google, grabs your latest 10 emails/tasks, and saves a tiny summary of them into Supabase. This saves massive amounts of time and LLM tokens later.

3. **Chatting with the AI:**
   When you type *"Summarize my mail"*, the frontend sends this to `/chat`. 
   The backend retrieves your chat history and gives it to LangGraph. 
   The AI (OpenRouter) realizes it needs to use a tool. It pauses, asks the backend to run the `get_recent_emails` tool, reads the data from Supabase, and formulates a human-readable summary.

4. **Drafting Emails:**
   When you ask to draft an email, the AI calls the `create_email_draft` tool. The backend talks directly to the Gmail API to create a real draft in your account. The AI then outputs a perfectly formatted visual representation of the draft (`📧 Email 1...`) for you to read in the chat window.
