from typing import Dict, Any, Optional

import json
import os

class MemoryStore:
    def __init__(self):
        self._tokens_file = "tokens_db.json"
        # Store user session data (e.g. user_id -> tokens)
        self._user_tokens: Dict[str, Dict[str, Any]] = self._load_tokens()
        # Store conversational history / graph states (e.g. thread_id -> state)
        self._thread_states: Dict[str, Any] = {}

    def _load_tokens(self) -> Dict[str, Dict[str, Any]]:
        if os.path.exists(self._tokens_file):
            try:
                with open(self._tokens_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _save_tokens_to_disk(self):
        try:
            with open(self._tokens_file, "w") as f:
                json.dump(self._user_tokens, f)
        except Exception:
            pass

    def save_tokens(self, user_id: str, tokens: Dict[str, Any]) -> None:
        self._user_tokens[user_id] = tokens
        self._save_tokens_to_disk()

    def get_tokens(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self._user_tokens.get(user_id)

    def save_thread_state(self, thread_id: str, state: Any) -> None:
        self._thread_states[thread_id] = state

    def get_thread_state(self, thread_id: str) -> Optional[Any]:
        return self._thread_states.get(thread_id)

    def hide_event(self, user_id: str, event_id: str) -> None:
        if not hasattr(self, "_hidden_events"):
            self._hidden_events = {}
        if user_id not in self._hidden_events:
            self._hidden_events[user_id] = []
        if event_id not in self._hidden_events[user_id]:
            self._hidden_events[user_id].append(event_id)

    def get_hidden_events(self, user_id: str) -> list:
        if not hasattr(self, "_hidden_events"):
            self._hidden_events = {}
        return self._hidden_events.get(user_id, [])

# Singleton instance for the application
store = MemoryStore()
