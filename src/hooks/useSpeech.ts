import { useState, useCallback, useRef } from 'react';

interface UseSpeechOptions {
  voice?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  languageCode?: string;
}

interface Voice {
  name: string;
  languageCodes: string[];
  ssmlGender: 'NEUTRAL' | 'MALE' | 'FEMALE';
  naturalSampleRateHertz: number;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);

  // Initialize audio element
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsSpeaking(false);
  }

  // Fetch available voices
  const fetchVoices = useCallback(async () => {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?key=${process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      setAvailableVoices(data.voices || []);
      return data.voices;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voices');
      return [];
    }
  }, []);

  // Speak text using Google Cloud Text-to-Speech
  const speak = useCallback(async (text: string) => {
    try {
      if (isSpeaking) {
        audioRef.current?.pause();
        setIsSpeaking(false);
      }

      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: options.languageCode || 'en-US',
              name: options.voice || 'en-US-Neural2-C', // A natural-sounding voice
              ssmlGender: 'FEMALE',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: options.pitch || 0,
              speakingRate: options.rate || 1,
              volumeGainDb: options.volume ? Math.log10(options.volume) * 20 : 0,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const { audioContent } = await response.json();
      
      if (audioRef.current) {
        audioRef.current.src = `data:audio/mp3;base64,${audioContent}`;
        audioRef.current.volume = options.volume || 1;
        setIsSpeaking(true);
        await audioRef.current.play();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
    }
  }, [options, isSpeaking]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (isSpeaking && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  // Get available voices
  const getVoices = useCallback(() => {
    return availableVoices;
  }, [availableVoices]);

  return {
    speak,
    stopSpeaking,
    getVoices,
    fetchVoices,
    isSpeaking,
    error,
  };
}
