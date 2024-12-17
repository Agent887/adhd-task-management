import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export function useGemini() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Add user message to history
      const newMessages = [...messages, { role: 'user', content }];
      setMessages(newMessages);

      // Prepare context for the AI
      const context = `You are an AI assistant in a task management app designed for people with ADHD. 
      Help the user manage their tasks, time, and focus. Be concise, clear, and encouraging.
      Current conversation history: ${JSON.stringify(newMessages)}`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${context}\n\nUser: ${content}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Gemini');
      }

      const data: GeminiResponse = await response.json();
      const assistantMessage = data.candidates[0]?.content.parts[0]?.text || 'Sorry, I could not generate a response.';

      // Add assistant response to history
      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);

      return assistantMessage;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [messages, session]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    sendMessage,
    clearMessages,
    messages,
    loading,
    error,
  };
}
