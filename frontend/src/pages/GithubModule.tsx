import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Star, GitFork, BookOpen, AlertCircle, Clock, ExternalLink, ChevronLeft, GitCommit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { githubService } from '../services/api';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  commits_count: number;
  language: string;
  updated_at: string;
  private: boolean;
}

export function GithubModule() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await githubService.getRepos();
      setRepos(data);
    } catch (err) {
      console.error('Error fetching repos:', err);
      setError('Failed to fetch repositories. Please ensure your GITHUB_TOKEN is configured properly.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative z-10">
      {/* Header matching MR JARVIS Theme */}
      <div className="p-4 md:p-6 border-b border-cyan-900/30 bg-gray-950/60 backdrop-blur-md flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/chat')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-950/50 border border-cyan-800 text-cyan-400 hover:bg-cyan-900 hover:text-cyan-300 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/30 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <GitBranch className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold text-cyan-50 tracking-wider uppercase">GitHub Repositories</h1>
              <p className="text-xs font-mono text-cyan-500/80 tracking-widest">LIVE INTELLIGENCE FEED</p>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-cyan-600 font-mono hidden md:block">
          {repos.length} REPOSITORIES INDEXED
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6 scrollbar-hide">
        <div className="max-w-7xl mx-auto h-full">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-400 flex items-center font-mono text-sm shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            >
              <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              {error}
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full" />
                <div className="absolute inset-0 border-2 border-cyan-400 rounded-full border-t-transparent animate-spin" />
              </div>
              <div className="font-mono text-sm text-cyan-400 tracking-widest uppercase animate-pulse">
                SYNCING REPOSITORIES...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {repos.map((repo, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20, filter: 'blur(5px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    key={repo.id}
                    className="bg-gray-950/60 backdrop-blur-md rounded-xl border border-cyan-900/30 overflow-hidden hover:border-cyan-500/50 transition-all flex flex-col h-full group hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="p-5 flex-1 relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <a 
                          href={repo.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-mono font-bold text-lg text-cyan-300 hover:text-cyan-100 hover:underline flex items-center gap-2 truncate"
                        >
                          <BookOpen className="w-4 h-4 shrink-0 text-cyan-500" />
                          <span className="truncate">{repo.name}</span>
                        </a>
                        {repo.private && (
                          <span className="px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-full shrink-0">
                            Private
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-sans text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                        {repo.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="bg-gray-900/80 p-4 border-t border-cyan-900/30 flex justify-between items-center text-xs font-mono text-cyan-600/80 relative z-10">
                      <div className="flex items-center gap-4">
                        {repo.language && (
                          <span className="flex items-center gap-1.5 text-cyan-400">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1 hover:text-cyan-300 transition-colors" title="Commits">
                          <GitCommit className="w-3.5 h-3.5" />
                          {repo.commits_count}
                        </span>
                        <span className="flex items-center gap-1 hover:text-yellow-400/80 transition-colors" title="Stars">
                          <Star className="w-3.5 h-3.5" />
                          {repo.stargazers_count}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 shrink-0" title={`Updated ${formatDate(repo.updated_at)}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(repo.updated_at)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {repos.length === 0 && !error && (
                <div className="col-span-full flex flex-col items-center justify-center p-16 text-center bg-gray-950/40 rounded-2xl border border-dashed border-cyan-900/50 backdrop-blur-md">
                  <GitBranch className="w-16 h-16 text-cyan-900 mb-6" />
                  <h3 className="text-xl font-mono font-bold text-cyan-500 tracking-wider mb-2">NO REPOSITORIES FOUND</h3>
                  <p className="text-cyan-700 font-mono text-sm">We couldn't find any repositories on this GitHub account.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
