import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VoiceInterfaceProps {
  userId: string;
  accessToken: string;
  onVoiceCommand: (message: string) => void | Promise<void>;
  onVoiceTranscript: (transcript: string) => void;
}

export function VoiceInterface({ userId, accessToken, onVoiceCommand, onVoiceTranscript }: VoiceInterfaceProps) {
  const [recognizing, setRecognizing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any | null>(null);

  // Initialize synth for greeting
  useEffect(() => {
    // We don't speak on mount automatically, wait for user interaction
  }, []);

  const startRecognition = () => {
    if (recognitionRef.current) return;
    setError(null);

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setError('SpeechRecognition API not supported in this browser.');
      return;
    }

    const recog: any = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = true;
    recog.maxAlternatives = 1;
    recog.continuous = false; // single turn
    recog.finalTranscript = '';

    recog.onstart = () => {
      setRecognizing(true);
      recog.finalTranscript = '';
      onVoiceTranscript('');
    };

    recog.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }

      if (final) {
        recog.finalTranscript += final;
      }

      const transcript = (recog.finalTranscript + interim).trim();
      setLiveTranscript(transcript);
      onVoiceTranscript(transcript);
    };

    recog.onerror = (ev: any) => {
      console.warn('[SpeechRecog] error', ev);
      if (ev.error !== 'no-speech') {
        setError('Speech recognition error: ' + ev.error);
      }
      setRecognizing(false);
      recognitionRef.current = null;
    };

    recog.onend = async () => {
      const finalText = recog.finalTranscript?.trim();
      setRecognizing(false);
      recognitionRef.current = null;
      setLiveTranscript('');

      if (!finalText) {
        onVoiceTranscript('');
        return;
      }
      try {
        await onVoiceCommand(finalText);
      } catch (sendError) {
        console.error('[VoiceInterface] failed to send voice command', sendError);
        setError('Failed to send voice command.');
      }
    };

    recognitionRef.current = recog;
    try {
      recog.start();
    } catch (e) {
      console.warn('Could not start recognition', e);
    }
  };

  const stopRecognition = () => {
    const recog = recognitionRef.current;
    if (!recog) return;
    try {
      recog.stop();
    } catch (e) {
      console.warn('Error stopping recognition', e);
    }
    recognitionRef.current = null;
    setRecognizing(false);
  };

  return (
    <div className="voice-interface-container relative flex flex-col items-center justify-center">
      <button
        onClick={() => (recognizing ? stopRecognition() : startRecognition())}
        title={recognizing ? "Stop Listening" : "Start Voice Mode"}
        className={`p-3 rounded-xl transition-colors flex-shrink-0 border shadow-[0_0_15px_rgba(6,182,212,0.3)] ${
          recognizing 
            ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
            : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30'
        }`}
      >
        {recognizing ? (
          <div className="relative w-5 h-5 flex items-center justify-center">
             <span className="absolute w-full h-full bg-red-400 rounded-full animate-ping opacity-75" />
             <div className="w-2 h-2 bg-red-400 rounded-sm relative z-10" />
          </div>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        )}
      </button>

      {error && (
        <div className="absolute bottom-full right-0 mb-4 bg-red-900/90 text-red-200 text-xs p-2 rounded border border-red-500/50 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
