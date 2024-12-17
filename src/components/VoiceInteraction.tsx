import { useState, useCallback } from 'react';
import { useSpeech } from '@/hooks/useSpeech';
import { useLlama } from '@/hooks/useLlama';
import { useTasks } from '@/hooks/useTasks';

export function VoiceInteraction() {
  const {
    startListening,
    stopListening,
    speak,
    isListening,
    isSpeaking,
    transcript,
    error: speechError
  } = useSpeech();

  const {
    sendMessage,
    messages,
    loading: aiLoading,
    error: aiError
  } = useLlama();

  const { createTask, getTasks, updateTask } = useTasks();
  const [processing, setProcessing] = useState(false);

  const handleVoiceInteraction = useCallback(async () => {
    if (isListening) {
      try {
        setProcessing(true);
        const text = await stopListening();
        
        // Get AI response with actions
        const { message, actions } = await sendMessage(text);
        
        // Process any actions
        for (const action of actions) {
          switch (action.type) {
            case 'CREATE_TASK':
              await createTask({
                title: action.data.title,
                description: '',
                dueDate: null,
                priority: 'medium',
                status: 'todo'
              });
              break;
            case 'TASK_BREAKDOWN':
              // Create subtasks for each step
              const parentTask = await createTask({
                title: text,
                description: 'Task breakdown:',
                dueDate: null,
                priority: 'medium',
                status: 'todo'
              });
              
              for (const step of action.data.steps) {
                await createTask({
                  title: step,
                  description: '',
                  dueDate: null,
                  priority: 'medium',
                  status: 'todo',
                  parentId: parentTask.id
                });
              }
              break;
          }
        }
        
        // Speak the response
        await speak(message);
      } catch (err) {
        console.error('Error in voice interaction:', err);
      } finally {
        setProcessing(false);
      }
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening, speak, sendMessage, createTask]);

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-2">
      {/* Message history */}
      <div className="bg-white rounded-lg shadow-lg max-w-sm max-h-96 overflow-y-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 ${
              message.role === 'user' ? 'bg-primary-50' : 'bg-white'
            }`}
          >
            <p className={`${
              message.role === 'user' ? 'text-primary-700' : 'text-gray-700'
            }`}>
              <span className="font-semibold">
                {message.role === 'user' ? '🗣️ You: ' : '🤖 Assistant: '}
              </span>
              {message.content}
            </p>
          </div>
        ))}
      </div>

      {/* Current transcript */}
      {transcript && (
        <div className="bg-white p-3 rounded-lg shadow-lg max-w-sm">
          <p className="text-gray-700">
            <span className="font-semibold">🎤 Listening: </span>
            {transcript}
          </p>
        </div>
      )}

      {/* Error display */}
      {(speechError || aiError) && (
        <div className="bg-red-50 p-3 rounded-lg shadow-lg max-w-sm">
          <p className="text-red-700">
            <span className="font-semibold">❌ Error: </span>
            {speechError || aiError}
          </p>
        </div>
      )}

      {/* Voice control button with status indicator */}
      <div className="relative">
        {(aiLoading || processing) && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <span className="bg-primary-100 text-primary-800 text-sm px-2 py-1 rounded">
              {aiLoading ? '🤔 Thinking...' : '⚙️ Processing...'}
            </span>
          </div>
        )}
        <button
          onClick={handleVoiceInteraction}
          disabled={isSpeaking || aiLoading || processing}
          className={`
            p-4 rounded-full shadow-lg transition-all transform
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 scale-110' 
              : 'bg-primary-500 hover:bg-primary-600'
            }
            ${(isSpeaking || aiLoading || processing) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isListening ? (
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
