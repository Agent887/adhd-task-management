export class VoiceService {
    private recognition: SpeechRecognition | null = null;
    private synthesis: SpeechSynthesisUtterance;
    private isListening: boolean = false;
    private commandCallbacks: Map<string, (args: string) => void> = new Map();

    constructor() {
        // Initialize speech recognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = this.handleSpeechResult.bind(this);
            this.recognition.onerror = this.handleSpeechError.bind(this);
        }

        // Initialize speech synthesis
        this.synthesis = new SpeechSynthesisUtterance();
        this.synthesis.lang = 'en-US';
        this.synthesis.rate = 1.0;
        this.synthesis.pitch = 1.0;

        // Register default commands
        this.registerCommands();
    }

    private registerCommands() {
        this.commandCallbacks.set('create task', (args) => {
            // Extract task details from voice command
            const taskDetails = this.parseTaskDetails(args);
            this.speak(`Creating task: ${taskDetails.title}`);
            return taskDetails;
        });

        this.commandCallbacks.set('complete task', (args) => {
            this.speak(`Marking task as complete: ${args}`);
            return args;
        });

        this.commandCallbacks.set('add note', (args) => {
            this.speak(`Adding note: ${args}`);
            return args;
        });

        this.commandCallbacks.set('set priority', (args) => {
            const [taskName, priority] = args.split(' to ');
            this.speak(`Setting priority for task ${taskName} to ${priority}`);
            return { taskName, priority };
        });
    }

    private parseTaskDetails(voiceInput: string) {
        // Basic parsing of voice input for task creation
        const dueDateMatch = voiceInput.match(/due (tomorrow|today|next week|on .+?(?=with|$))/i);
        const priorityMatch = voiceInput.match(/with priority (high|medium|low)/i);
        const titleEnd = Math.min(
            dueDateMatch ? voiceInput.indexOf(dueDateMatch[0]) : Infinity,
            priorityMatch ? voiceInput.indexOf(priorityMatch[0]) : Infinity
        );

        return {
            title: voiceInput.substring(0, titleEnd !== Infinity ? titleEnd : undefined).trim(),
            dueDate: dueDateMatch ? dueDateMatch[1] : null,
            priority: priorityMatch ? priorityMatch[1] : 'medium'
        };
    }

    private handleSpeechResult(event: SpeechRecognitionEvent) {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        for (const [command, callback] of this.commandCallbacks) {
            if (transcript.includes(command)) {
                const args = transcript.replace(command, '').trim();
                callback(args);
                break;
            }
        }
    }

    private handleSpeechError(event: SpeechRecognitionErrorEvent) {
        console.error('Speech recognition error:', event.error);
        this.speak('Sorry, I didn\'t catch that. Could you try again?');
    }

    public startListening() {
        if (!this.recognition) {
            this.speak('Speech recognition is not supported in your browser.');
            return;
        }

        if (!this.isListening) {
            this.recognition.start();
            this.isListening = true;
            this.speak('Listening for commands');
        }
    }

    public stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.speak('Voice commands disabled');
        }
    }

    public speak(text: string) {
        this.synthesis.text = text;
        window.speechSynthesis.speak(this.synthesis);
    }

    public addCommand(command: string, callback: (args: string) => void) {
        this.commandCallbacks.set(command.toLowerCase(), callback);
    }

    public removeCommand(command: string) {
        this.commandCallbacks.delete(command.toLowerCase());
    }

    public isSupported(): boolean {
        return !!(this.recognition);
    }
}
