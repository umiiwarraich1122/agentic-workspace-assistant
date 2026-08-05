# Jarvis AI Personal Assistant

Jarvis AI is a fully autonomous Personal Assistant built with a modern React frontend and a FastAPI (Python) backend. It connects directly to your Google Workspace (Gmail, Calendar, Tasks) and uses an advanced AI Agent (powered by LangGraph and OpenRouter) to execute tasks on your behalf, like drafting emails, scheduling meetings, summarizing your unread messages, and much more.

## Features

- **Autonomous Agent:** Powered by LangGraph, the AI can think, decide which tools to use, and execute actions.
- **Voice Mode:** Integrated with Web Speech APIs and LiveKit to support voice interactions.
- **Google Workspace Integration:** Seamlessly interacts with Gmail, Google Calendar, and Google Tasks.
- **Modern UI:** Built with React, TypeScript, Tailwind CSS, and Framer Motion for a sleek, cyberpunk-inspired aesthetic.
- **Memory & Context:** Uses Supabase (PostgreSQL) to store chat histories, tokens, and synced data.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend:** Python, FastAPI, LangGraph, OpenRouter (LLM routing)
- **Database:** Supabase (PostgreSQL)
- **Voice/Audio:** LiveKit Agents, AI-Coustics (Voice Isolation), Cartesia (TTS)

## Project Structure

- `frontend/` - Contains the React/Vite application.
- `backend/` - Contains the FastAPI application, LangGraph agent logic, and LiveKit agent configuration.

## Getting Started

Detailed documentation on the architecture and flow can be found in [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).

### Prerequisites
- Node.js & npm (for frontend)
- Python 3.9+ (for backend)
- API Keys for Supabase, Google Cloud (OAuth), OpenRouter, and Cartesia/Groq depending on your agent config.

### Running Locally

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## License
MIT License
