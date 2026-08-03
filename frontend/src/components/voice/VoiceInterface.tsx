import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from '@livekit/components-react';
import '@livekit/components-styles';

interface VoiceInterfaceProps {
  userId: string;
  accessToken: string;
}

export function VoiceInterface({ userId, accessToken }: VoiceInterfaceProps) {
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-url.livekit.cloud';

  const connectToVoice = async () => {
    setConnecting(true);
    setError(null);
    try {
      // Call the FastAPI endpoint we created
      const response = await fetch('http://localhost:8000/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, access_token: accessToken }),
      });
      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.statusText}`);
      }
      const data = await response.json();
      setToken(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setToken(null);
  };

  return (
    <div className="voice-interface-container flex flex-col items-center justify-center p-4">
      {!token ? (
        <button
          onClick={connectToVoice}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition-all shadow-[0_0_15px_rgba(6,182,212,0.5)]"
        >
          {connecting ? 'Connecting...' : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Start Voice Mode
            </>
          )}
        </button>
      ) : (
        <div className="livekit-room-wrapper flex flex-col items-center gap-4 bg-gray-900/80 p-4 rounded-xl border border-cyan-500/30">
          <button onClick={disconnect} className="text-red-400 hover:text-red-300 text-xs uppercase tracking-wider mb-2">End Call</button>
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={token}
            connect={true}
            audio={true}
            video={false}
          >
            <RoomAudioRenderer />
            <VoiceAssistantControlBar />
            <AgentStateDisplay />
          </LiveKitRoom>
        </div>
      )}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </div>
  );
}

function AgentStateDisplay() {
  const { state } = useVoiceAssistant();
  
  let label = 'Connecting...';
  if (state === 'listening') label = 'Listening...';
  if (state === 'speaking') label = 'Jarvis is speaking...';
  if (state === 'thinking') label = 'Thinking...';
  
  return (
    <div className="text-cyan-400 font-mono text-sm mt-2 animate-pulse">
      {label}
    </div>
  );
}
