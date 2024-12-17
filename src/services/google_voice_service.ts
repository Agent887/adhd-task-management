import { GOOGLE_CLOUD_CONFIG } from '../config/google_cloud';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface VoiceOptions {
    language?: string;
    model?: string;
    voiceName?: string;
}

export class GoogleVoiceService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(GOOGLE_CLOUD_CONFIG.GEMINI_API_KEY!);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async speechToText(audioBlob: Blob, options: VoiceOptions = {}): Promise<string> {
        const base64Audio = await this.blobToBase64(audioBlob);
        
        const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GOOGLE_CLOUD_CONFIG.SPEECH_TO_TEXT_API_KEY}`
            },
            body: JSON.stringify({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: options.language || 'en-US',
                    model: options.model || 'default',
                    enableAutomaticPunctuation: true,
                    useEnhanced: true
                },
                audio: {
                    content: base64Audio
                }
            })
        });

        const data = await response.json();
        return data.results[0].alternatives[0].transcript;
    }

    async textToSpeech(text: string, options: VoiceOptions = {}): Promise<ArrayBuffer> {
        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GOOGLE_CLOUD_CONFIG.TEXT_TO_SPEECH_API_KEY}`
            },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode: options.language || 'en-US',
                    name: options.voiceName || 'en-US-Neural2-A',
                    ssmlGender: 'NEUTRAL'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    pitch: 0,
                    speakingRate: 1.0,
                    effectsProfileId: ['small-bluetooth-speaker-class-device']
                }
            })
        });

        const data = await response.json();
        return this.base64ToArrayBuffer(data.audioContent);
    }

    async processWithGemini(text: string): Promise<string> {
        const prompt = `
            You are an AI assistant helping with ADHD task management. 
            The user said: "${text}"
            Analyze this and respond with:
            1. Task identification (if any)
            2. Priority level (if mentioned)
            3. Due date (if mentioned)
            4. Any additional context or reminders that would be helpful for someone with ADHD
            Format the response in a clear, structured way.
        `;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async voiceToTaskAnalysis(audioBlob: Blob): Promise<string> {
        // Convert voice to text using Speech-to-Text
        const transcription = await this.speechToText(audioBlob);
        
        // Process the text with Gemini
        const analysis = await this.processWithGemini(transcription);
        
        // Convert the analysis back to speech
        const speechBuffer = await this.textToSpeech(analysis);
        
        // Play the response
        await this.playAudio(speechBuffer);
        
        return analysis;
    }

    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    // Remove the data URL prefix
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
        const audioContext = new AudioContext();
        const audioBufferSource = audioContext.createBufferSource();
        
        const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
        audioBufferSource.buffer = decodedBuffer;
        audioBufferSource.connect(audioContext.destination);
        audioBufferSource.start(0);
    }
}
