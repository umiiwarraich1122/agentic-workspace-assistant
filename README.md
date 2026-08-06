# Jarvis AI Personal Assistant - Technical Documentation

Jarvis AI is a fully autonomous Personal Assistant built with a modern React frontend and a FastAPI (Python) backend. It connects directly to your Google Workspace (Gmail, Calendar, Tasks) and uses an advanced AI Agent (powered by LangGraph, LiveKit, and Groq/OpenRouter) to execute tasks on your behalf.

---

## 1. Technology Stack
The project is built on a modern, real-time web architecture:
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Framer Motion (for UI animations).
- **Backend:** FastAPI (Python) for routing, REST APIs, and serving the LiveKit token.
- **Voice Agent:** `livekit-agents` framework running a `VoicePipelineAgent`.
- **Database & Auth:** Supabase (PostgreSQL) for user session management and storing synced Google data.
- **Tooling Engine:** LangChain (used to map Python functions into LLM-readable tools).

---

## 2. Voice Activity Detection (VAD) & Tuning
To make Jarvis behave like a real human and ignore background noise, we implemented Silero VAD with highly customized tuning parameters.

### VAD Settings (`silero.VAD`)
- **`activation_threshold = 0.85`**: (High) The mic only activates when a clear, loud human voice is detected. This prevents fans or background chatter from waking up Jarvis.
- **`min_speech_duration = 0.4s`**: (400ms) The user must speak for at least 0.4 seconds to trigger the agent.
- **`deactivation_threshold = 0.7`**: Drops the mic quickly if the volume goes below 70%, preventing background noise from keeping the mic open.
- **`min_silence_duration = 0.25s`**: (250ms) **Crucial for Latency.** As soon as the user stops speaking for a quarter of a second, the agent immediately processes the sentence instead of waiting.

### Interruption Tuning (`TurnHandlingOptions`)
- **`min_duration = 0.8s` & `min_words = 2`**: If Jarvis is speaking, the user must speak at least 2 words over 0.8 seconds to interrupt him. This stops Jarvis from cutting off his own speech if a door slams in the background.

---

## 3. Latency Reduction Techniques
To achieve real-time, instantaneous conversation, several techniques were employed:
1. **Model Selection (Groq):** We bypassed OpenAI and used Groq's `llama-3.1-8b-instant` model. Groq uses specialized LPUs that generate tokens significantly faster than standard GPUs.
2. **Fast VAD Cut-off:** By setting `min_silence_duration` to `0.25s`, we eliminated the standard 1-second delay that most voice agents have after you stop speaking.
3. **Asynchronous Threading:** Heavy PC search tools (like `os.walk`) were wrapped in `await asyncio.to_thread()`. This prevents the "Event Loop" from freezing, meaning the agent doesn't hang while searching your hard drive.
4. **Natural Filler Words:** Instead of dead silence while fetching Google APIs, the agent randomly injects filler words (*"Hmm, let me check that..."*) into the audio stream. This masks the API delay and makes the latency feel nonexistent.
5. **Cartesia TTS:** We used Cartesia for Text-to-Speech (TTS) because it synthesizes audio in less than 150ms, much faster than OpenAI's TTS.

---

## 4. API Keys & Their Roles
The agent relies on multiple third-party services via API keys:

| API Key | Service | Purpose / What it does |
| :--- | :--- | :--- |
| **`LIVEKIT_API_KEY` & `SECRET`** | LiveKit Cloud | Creates the WebRTC room. It bridges the audio streams between the React frontend and the Python backend agent with ultra-low latency. |
| **`GROQ_API_KEY`** | Groq | Powers the LLM (`llama-3.1`) and STT (Speech-to-Text via Whisper). It converts user voice to text and generates Jarvis's intelligent responses. |
| **`CARTESIA_API_KEY`** | Cartesia | Powers the TTS (Text-to-Speech). Converts the LLM's text output back into a human-sounding voice. |
| **`GOOGLE_CLIENT_ID` / `SECRET`** | Google Cloud | Handles OAuth2 login. Generates the `access_token` so Jarvis can read/write to your Gmail, Calendar, and Tasks on your behalf. |
| **`SUPABASE_URL` / `KEY`** | Supabase | Connects the backend to the Postgres database to store user profiles and synced offline data. |

---

## 5. Important Libraries Used
- **`livekit-agents`**: The backbone of the Voice Agent. It handles WebRTC connections, audio streaming, VAD, STT, LLM, and TTS in a unified pipeline.
- **`langchain`**: Provides the `@tool` decorator. It automatically converts our Python functions (like `draft_email`) into a JSON schema that the LLM understands.
- **`silero-vad`**: A highly accurate, pre-trained neural network for Voice Activity Detection.
- **`httpx`**: Used for async HTTP requests to Google APIs. We use a shared `AsyncClient` connection pool to eliminate TLS handshake overhead.
- **`framer-motion`**: Powers the dynamic, glowing UI rings that scale up and down based on the user's and agent's voice volume.

---

## 6. Logic & Flow Highlights
- **Context Injection:** The agent is dynamically fed the user's local system time (`datetime.now()`) on connection, making it time-aware.
- **Smart Queueing:** If interrupted with a new task while executing a previous one, the agent is instructed via system prompt to queue the task (*"I will do that right after this"*) rather than failing.
- **Direct Auth Injection:** Google Access tokens are fetched directly from the secure `MemoryStore` database upon connection, ensuring the agent always has the right permissions without relying on the frontend.

## License
MIT License
