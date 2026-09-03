import React, { useEffect, useState, useRef } from 'react';
import YouTube from 'react-youtube';
import { Play, Pause, SkipForward, Music, Search, Loader2 } from 'lucide-react';
import { BACKEND_URL } from '../services/api';

const TRENDING_SONGS = [
  { id: "rFZHOHl-L8A", title: "Lofi Girl - beats to relax/study to", thumb: "https://img.youtube.com/vi/rFZHOHl-L8A/hqdefault.jpg" },
  { id: "4NRXx6U8ABQ", title: "The Weeknd - Blinding Lights", thumb: "https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg" },
  { id: "NBlu6RGmh1s", title: "Sped Up & Reverb Hits", thumb: "https://img.youtube.com/vi/NBlu6RGmh1s/hqdefault.jpg" },
  { id: "n61ULEU7CO0", title: "Lofi Hip Hop Mix", thumb: "https://img.youtube.com/vi/n61ULEU7CO0/hqdefault.jpg" }
];

export function YoutubeModule() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const playerRef = useRef<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/youtube/status?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setStatus((prev: any) => {
        // If action_id changed, force update
        if (playerRef.current && data.action_id !== prev?.action_id) {
            if (data.video_id && playerRef.current.getVideoData?.()?.video_id !== data.video_id) {
                playerRef.current.loadVideoById(data.video_id);
            }
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
    // Explicitly unmute and set volume to max to bypass hidden iframe restrictions
    event.target.unMute();
    event.target.setVolume(100);
    
    // Apply the currently loaded status immediately. 
    // We cannot use fetchStatus() here because the action_id hasn't changed since the initial mount fetch, 
    // so fetchStatus would ignore it!
    setStatus((prev: any) => {
        if (prev?.video_id) {
            event.target.loadVideoById(prev.video_id);
            if (prev.playing) event.target.playVideo();
            else event.target.pauseVideo();
        }
        return prev;
    });
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

    const handleSearch = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setIsSearching(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(data.results);
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsSearching(false);
      }
    };

  const playTrending = async (song: typeof TRENDING_SONGS[0]) => {
    const newState = {
      video_id: song.id,
      title: song.title,
      thumbnail: song.thumb,
      playing: true
    };
    
    setStatus((prev: any) => ({ ...prev, ...newState }));
    
    if (playerRef.current) {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
        playerRef.current.loadVideoById(song.id);
        playerRef.current.playVideo();
    }
    
    try {
      await fetch(`${BACKEND_URL}/api/youtube/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState)
      });
    } catch (e) {
      console.error("Failed to play trending", e);
    }
  };

  const opts: any = {
    height: '256',
    width: '256',
    playerVars: {
      autoplay: 0,
      controls: 1,
      origin: window.location.origin,
      modestbranding: 1
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

      <div className="relative z-10 h-full overflow-y-auto no-scrollbar pb-20">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-mono text-red-500 tracking-wider flex items-center gap-2">
              <Music className="w-6 h-6" /> YOUTUBE MUSIC
            </h1>
            <p className="text-sm text-red-400/50 mt-1">Audio Interface Protocol</p>
          </div>
        </header>

        <div className="max-w-md w-full mx-auto mt-6 border border-red-500/30 bg-black/60 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 mb-6 group rounded-lg overflow-hidden shadow-2xl bg-black">
              <YouTube 
                  videoId="rFZHOHl-L8A"
                  opts={opts} 
                  onReady={onPlayerReady} 
                  iframeClassName="w-full h-full"
              />
              {!status?.video_id && (
                <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                  <Music className="w-12 h-12 text-red-500/50" />
                </div>
              )}
              {status?.playing && (
                <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay pointer-events-none animate-pulse" />
              )}
            </div>
            
            <h2 className="text-xl font-bold text-white text-center mb-1 line-clamp-2">
              {status?.video_id ? status.title : "No active playback"}
            </h2>
            <p className="text-red-400/70 text-center mb-6 line-clamp-1">
              {status?.video_id ? "YouTube Audio" : "Ask Jarvis to play a song!"}
            </p>
            
            {status?.video_id && (
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
            )}
          </div>
        </div>

        {/* Trending Section */}
        <div className="max-w-2xl w-full mx-auto mt-12">
          <h3 className="text-lg font-mono text-red-400 mb-4 flex items-center gap-2">
            <Play className="w-4 h-4" /> TRENDING MIXES
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRENDING_SONGS.map((song) => (
              <div 
                key={song.id}
                onClick={() => playTrending(song)}
                className="group flex items-center gap-4 p-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
              >
                <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                  <img src={song.thumb} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-100 line-clamp-2 group-hover:text-red-400 transition-colors">{song.title}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Search Section */}
          <div className="max-w-3xl mx-auto mt-12 mb-8">
            <h3 className="text-red-500 font-mono text-sm tracking-widest flex items-center gap-2 mb-6 border-b border-red-500/20 pb-2">
              <Search className="w-4 h-4" /> SEARCH MUSIC
            </h3>
            
            <form onSubmit={handleSearch} className="flex gap-4 mb-8">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for any song or artist..."
                className="flex-1 bg-black/40 border border-red-500/20 rounded-xl px-4 py-3 text-red-100 placeholder-red-900/50 focus:outline-none focus:border-red-500/50"
              />
              <button 
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map((song) => (
                  <div 
                    key={song.id}
                    onClick={() => playTrending(song)}
                    className="group flex items-center gap-4 p-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
                  >
                    <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                      <img src={song.thumb} alt={song.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-100 line-clamp-2 group-hover:text-red-400 transition-colors" dangerouslySetInnerHTML={{ __html: song.title }}></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
