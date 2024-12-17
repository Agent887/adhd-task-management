import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useVoiceInput() {
  const { data: session } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(chunks => [...chunks, event.data]);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      console.error('Error starting recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Convert audio to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const audioContent = base64Audio.split(',')[1];

            // Call Google Cloud Speech-to-Text API with API key
            const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GOOGLE_SPEECH_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                config: {
                  encoding: 'WEBM_OPUS',
                  sampleRateHertz: 48000,
                  languageCode: 'en-US',
                  model: 'default',
                },
                audio: {
                  content: audioContent,
                },
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to transcribe audio');
            }

            const data = await response.json();
            const transcription = data.results
              ?.map((result: any) => result.alternatives[0]?.transcript)
              .join(' ') || '';

            setIsRecording(false);
            setAudioChunks([]);
            resolve(transcription);
          };
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  }, [mediaRecorder, audioChunks]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    error,
  };
}
