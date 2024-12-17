import { useState, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are an AI assistant specifically trained to help people with ADHD manage their tasks and daily life. 
You understand the unique challenges of ADHD, including:
- Executive function difficulties
- Time blindness
- Task initiation and completion struggles
- Motivation challenges
- Overwhelming feelings when facing complex tasks

Provide clear, structured, and encouraging responses. Break down complex tasks into manageable steps.
When suggesting task management strategies, consider ADHD-specific needs like:
- Need for immediate rewards
- Difficulty with traditional planning methods
- Importance of external accountability
- Variable energy and focus levels

Keep responses concise but supportive. Use emojis occasionally to maintain engagement.`;

export function useLlama() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    setLoading(true);
    setError(null);

    try {
      // Add user message to history
      const newMessages = [...messages, { role: 'user', content }];
      setMessages(newMessages);

      // Prepare the conversation history
      const conversation = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Done365 ADHD Task Manager'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: conversation,
          temperature: 0.7,
          max_tokens: 1024,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Llama');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Add assistant response to history
      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);

      // Parse any actions from the response
      const actions = parseActions(assistantMessage);

      return {
        message: assistantMessage,
        actions
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [messages]);

  // Parse actions from the AI response
  const parseActions = (response: string) => {
    const actions: any[] = [];
    
    // Look for task creation
    if (response.toLowerCase().includes('create task:')) {
      const taskMatch = response.match(/create task:\s*([^\n]+)/i);
      if (taskMatch) {
        actions.push({
          type: 'CREATE_TASK',
          data: {
            title: taskMatch[1].trim()
          }
        });
      }
    }

    // Look for task breakdown
    if (response.toLowerCase().includes('task breakdown:')) {
      const breakdownMatch = response.match(/task breakdown:\s*([\s\S]+?)(?=\n\n|$)/i);
      if (breakdownMatch) {
        const steps = breakdownMatch[1]
          .split('\n')
          .map(step => step.trim())
          .filter(step => step.length > 0);
        
        actions.push({
          type: 'TASK_BREAKDOWN',
          data: { steps }
        });
      }
    }

    return actions;
  };

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
