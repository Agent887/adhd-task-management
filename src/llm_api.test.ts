import llmApi from './llm_api';

describe('LLM API', () => {
  it('should return a response with a prompt', async () => {
    const prompt = 'Hello, how are you?';
    const response = await llmApi.post('/meta-llama/llama-3.3-70b-instruct', { prompt });
    expect(response.status).toBe(200);
    expect(response.data).toContain(prompt);
  });
});
