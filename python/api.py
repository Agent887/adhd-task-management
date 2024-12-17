from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from gemini_service import Gemini2Service
import uvicorn
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()
gemini_service = Gemini2Service()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/voice/process")
async def process_voice(
    audio: UploadFile = File(...),
    transcript: str = None
):
    """Process voice input with Gemini 2.0"""
    audio_data = await audio.read()
    result = await gemini_service.process_voice_input(audio_data, transcript)
    return {"result": result}

@app.post("/api/task/visualize")
async def create_visual_aid(task_description: str):
    """Generate visual aid for a task"""
    image = await gemini_service.generate_visual_aid(task_description)
    return {"image": image}

@app.post("/api/task/analyze")
async def analyze_task(task_description: str):
    """Analyze task complexity and provide strategies"""
    analysis = await gemini_service.analyze_task_complexity(task_description)
    return {"analysis": analysis}

@app.post("/api/reminders/create")
async def create_reminders(task: str, context: str):
    """Create adaptive reminders for a task"""
    reminders = await gemini_service.create_adaptive_reminders(task, context)
    return {"reminders": reminders}

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
