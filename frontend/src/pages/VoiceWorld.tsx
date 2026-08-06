import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  BarVisualizer,
  useVoiceAssistant,
  useConnectionState,
  useLocalParticipant,
  useTrackVolume
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, PhoneOff } from 'lucide-react';
import { GlobalEnvironment } from '../components/os/GlobalEnvironment';
import axios from 'axios';

function VoiceWorldUI({ onDisconnect }: { onDisconnect: () => void }) {
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const connectionState = useConnectionState();
  const { localParticipant, microphoneTrack } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);

  // Extract user volume for visual feedback
  const micTrackRef = React.useMemo(() => {
    return localParticipant && microphoneTrack ? {
      participant: localParticipant,
      publication: microphoneTrack,
      source: Track.Source.Microphone
    } : undefined;
  }, [localParticipant, microphoneTrack]);

  const userVolume = useTrackVolume(micTrackRef);
  // Calculate scale: 1.0 base, up to 1.5 when loud
  const userScale = 1 + (userVolume || 0) * 1.5;

  const toggleMute = () => {
    if (localParticipant) {
      if (isMuted) {
        localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      } else {
        localParticipant.setMicrophoneEnabled(false);
        setIsMuted(true);
      }
    }
  };

  useEffect(() => {
    // Enable mic automatically on join
    if (localParticipant && connectionState === ConnectionState.Connected) {
      localParticipant.setMicrophoneEnabled(true);
    }
  }, [localParticipant, connectionState]);

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-8 pointer-events-none">
      {/* Top Bar */}
      <div className="fixed top-8 left-8 right-8 flex justify-between items-center z-50 pointer-events-auto">
        <button 
          onClick={onDisconnect}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-cyan-400 hover:bg-cyan-900/50 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono text-sm tracking-widest">EXIT WORLD</span>
        </button>

        <div className="font-mono text-cyan-500 tracking-[0.2em] text-sm animate-pulse uppercase">
          {connectionState === ConnectionState.Connected 
            ? `AGENT_${agentState}` 
            : `CONNECTION_${connectionState}`}
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative w-96 h-96 flex items-center justify-center"
        >
          {/* Ripple effects when Jarvis is speaking or User is speaking */}
          <AnimatePresence>
            {(agentState === 'speaking' || (userVolume && userVolume > 0.05)) && (
              <>
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                      ease: "easeOut"
                    }}
                    className="absolute inset-0 m-auto w-32 h-32 rounded-full border border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.8)]"
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Cyberpunk glowing rings with user voice scaling */}
          <motion.div 
            animate={{ scale: userScale }}
            transition={{ type: "spring", damping: 12, stiffness: 250 }}
            className="absolute inset-0 w-full h-full"
          >
            <div 
              className="absolute inset-0 rounded-full border border-cyan-500/20 transition-all duration-75"
              style={{ boxShadow: `0 0 ${100 + (userVolume || 0) * 150}px rgba(6,182,212,${0.1 + (userVolume || 0) * 0.4})` }}
            />
            <div 
              className="absolute inset-4 rounded-full border-t-2 border-cyan-400/30 animate-[spin_10s_linear_infinite] transition-all duration-75"
              style={{ boxShadow: `0 0 ${50 + (userVolume || 0) * 100}px rgba(6,182,212,${0.2 + (userVolume || 0) * 0.5})` }}
            />
            <div 
              className="absolute inset-8 rounded-full border-b-2 border-cyan-300/40 animate-[spin_7s_linear_infinite_reverse] transition-all duration-75"
              style={{ boxShadow: `0 0 ${20 + (userVolume || 0) * 50}px rgba(6,182,212,${0.3 + (userVolume || 0) * 0.6})` }}
            />
          </motion.div>
          
          {/* Audio Visualizer */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-16">
            {audioTrack ? (
              <BarVisualizer
                state={agentState}
                trackRef={audioTrack}
                barCount={7}
                options={{ minHeight: 20 }}
                className="w-full h-full text-cyan-400 opacity-90 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"
              />
            ) : (
              <div className={`w-24 h-24 rounded-full transition-all duration-500 ${
                agentState === 'thinking' 
                  ? 'bg-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.8)] animate-bounce' 
                  : 'bg-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.5)] animate-pulse'
              }`} />
            )}
          </div>
        </motion.div>
      </div>

      {/* User Controls (Fixed at Bottom) */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 z-50 pointer-events-auto">
        <button 
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer ${
            isMuted 
              ? 'bg-red-950/40 border-red-500/50 text-red-400 hover:bg-red-900/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
              : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button 
          onClick={onDisconnect}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-950/40 border border-red-500/50 text-red-400 hover:bg-red-900/50 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

export function VoiceWorld() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchToken = async () => {
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/livekit/token`, {
          user_id: user.userId,
          access_token: (user as any).accessToken || ''
        });
        setToken(res.data.token);
      } catch (err: any) {
        console.error('Failed to fetch LiveKit token:', err);
        setError('Failed to connect to Voice Server.');
      }
    };

    fetchToken();
  }, [user]);

  const handleDisconnect = () => {
    navigate('/chat');
  };

  if (error) {
    return (
      <div className="h-screen w-full bg-gray-950 flex flex-col items-center justify-center text-white">
        <GlobalEnvironment />
        <div className="relative z-10 text-red-400 font-mono flex flex-col items-center gap-4">
          <p>{error}</p>
          <button 
            onClick={() => navigate('/chat')}
            className="px-6 py-2 border border-cyan-500/50 rounded-xl hover:bg-cyan-950/50 cursor-pointer"
          >
            Return to Command Center
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <GlobalEnvironment />
        <div className="relative z-10 w-16 h-16 border-2 border-cyan-500 rounded-full animate-spin border-t-transparent shadow-[0_0_20px_#06b6d4]" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-950 text-white overflow-hidden relative">
      <GlobalEnvironment />
      
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        connect={true}
        onDisconnected={handleDisconnect}
        audio={{
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        }}
        video={false}
      >
        <VoiceWorldUI onDisconnect={handleDisconnect} />
      </LiveKitRoom>
    </div>
  );
}
