import React, { useEffect, useState, useRef } from 'react';
import YouTube from 'react-youtube';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
import { BACKEND_URL } from '../services/api';

export function YoutubeModule() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const playerRef = useRef<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/youtube/status`);
      const data = await res.json();
      setStatus(prev => {
        // If action_id changed, we might need to force play/pause
        if (playerRef.current && data.action_id !== prev?.action_id) {
            if (data.playing) {
                playerRef.current.playVideo();
            } else {
                playerRef.current.pauseVideo();
            }
        }
        return data;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    if (status?.playing) {
        event.target.playVideo();
    }
  };

  const togglePlay = async () => {
    if (!status?.video_id) return;
    const newPlaying = !status.playing;
    
    // Update local immediately for snappy UI
    setStatus((prev: any) => ({ ...prev, playing: newPlaying }));
    
    if (playerRef.current) {
        if (newPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
    }

    try {
      await fetch(`${BACKEND_URL}/api/youtube/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playing: newPlaying })
      });
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const opts: any = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
    },
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 text-red-400 font-mono flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Music className="w-5 h-5" /> Connecting to YouTube Network...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 flex flex-col h-full relative z-10 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-red-500/10 rounded-full blur-3xl mix-blend-screen" />
      </div>

      {/* Hidden YouTube Player */}
      {status?.video_id && (
        <div className="hidden">
            <YouTube videoId={status.video_id} opts={opts} onReady={onPlayerReady} />
        </div>
      )}

      <div className="relative z-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-red-500 tracking-wider flex items-center gap-2">
              <Music className="w-6 h-6" /> YOUTUBE MUSIC
            </h1>
            <p className="text-sm text-red-400/50 mt-1">Audio Interface Protocol</p>
          </div>
        </header>

        <div className="max-w-md w-full mx-auto mt-12 border border-red-500/30 bg-black/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
          {status?.video_id ? (
            <div className="flex flex-col items-center">
              <div className="relative w-48 h-48 mb-6 group rounded-lg overflow-hidden shadow-2xl">
                {status.thumbnail ? (
                  <img src={status.thumbnail} alt="Thumbnail Art" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-red-900/20 flex items-center justify-center">
                    <Music className="w-12 h-12 text-red-500/50" />
                  </div>
                )}
                {status.playing && (
                  <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay pointer-events-none animate-pulse" />
                )}
              </div>
              
              <h2 className="text-xl font-bold text-white text-center mb-1 line-clamp-2">{status.title}</h2>
              <p className="text-red-400/70 text-center mb-6 line-clamp-1">YouTube Audio</p>
              
              <div className="flex items-center gap-6">
                <div 
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 transition-transform cursor-pointer"
                >
                  {status.playing ? (
                    <Pause className="w-6 h-6 text-black fill-black" />
                  ) : (
                    <Play className="w-6 h-6 text-black fill-black ml-1" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Music className="w-12 h-12 text-red-500/30 mb-4" />
              <p className="text-red-400/50 text-center font-mono">No active playback</p>
              <p className="text-sm text-red-400/30 text-center mt-2">Ask Jarvis to play a song!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
