import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { BACKEND_URL } from '../services/api';

export function SpotifyModule() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/spotify/status`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/spotify/login`;
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 text-cyan-400 font-mono flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Music className="w-5 h-5" /> Connecting to Spotify Network...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 flex flex-col h-full relative z-10 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-green-500/10 rounded-full blur-3xl mix-blend-screen" />
      </div>

      <div className="relative z-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-green-400 tracking-wider flex items-center gap-2">
              <Music className="w-6 h-6" /> SPOTIFY CONTROL
            </h1>
            <p className="text-sm text-green-400/50 mt-1">Audio Interface Protocol</p>
          </div>
        </header>

        {!status?.connected ? (
          <div className="flex flex-col items-center justify-center h-64 border border-green-500/20 bg-black/40 backdrop-blur-md rounded-xl p-8">
            <Music className="w-16 h-16 text-green-500/40 mb-4" />
            <h2 className="text-lg font-mono text-green-100 mb-2">Spotify Link Required</h2>
            <p className="text-green-400/60 text-center mb-6 max-w-md">
              Connect your Spotify account to allow Jarvis to control playback, search for songs, and act as your personal DJ.
            </p>
            <button
              onClick={handleLogin}
              className="px-6 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/50 text-green-400 font-mono uppercase tracking-wider rounded-lg transition-all"
            >
              Connect Spotify
            </button>
          </div>
        ) : (
          <div className="max-w-md w-full mx-auto mt-12 border border-green-500/30 bg-black/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
            {status.playing || status.song ? (
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6 group rounded-lg overflow-hidden shadow-2xl">
                  {status.image ? (
                    <img src={status.image} alt="Album Art" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-green-900/20 flex items-center justify-center">
                      <Music className="w-12 h-12 text-green-500/50" />
                    </div>
                  )}
                  {status.playing && (
                    <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay pointer-events-none animate-pulse" />
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-white text-center mb-1 line-clamp-1">{status.song}</h2>
                <p className="text-green-400/70 text-center mb-6 line-clamp-1">{status.artist}</p>
                
                {status.device && (
                  <p className="text-xs text-green-500/40 uppercase tracking-wider mb-6 font-mono">
                    Playing on: {status.device}
                  </p>
                )}
                
                <div className="flex items-center gap-6">
                  {status.playing ? (
                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform cursor-pointer">
                      <Pause className="w-6 h-6 text-black fill-black" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform cursor-pointer">
                      <Play className="w-6 h-6 text-black fill-black ml-1" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/20 transition-colors cursor-pointer text-green-400">
                    <SkipForward className="w-5 h-5 fill-current" />
                  </div>
                </div>
              </div>
            ) : status.error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Music className="w-12 h-12 text-red-500/50 mb-4" />
                <p className="text-red-400/80 text-center font-mono">Connection Error</p>
                <p className="text-sm text-red-400/50 text-center mt-2 px-4">{status.error}</p>
                <button
                  onClick={handleLogin}
                  className="mt-6 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 font-mono text-sm uppercase tracking-wider rounded transition-all"
                >
                  Reconnect
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Music className="w-12 h-12 text-green-500/30 mb-4" />
                <p className="text-green-400/50 text-center font-mono">No active playback</p>
                <p className="text-sm text-green-400/30 text-center mt-2">Open Spotify on any device to begin</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
