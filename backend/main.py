
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load environment variables BEFORE importing project modules
load_dotenv()

from supabase_client import supabase
from location_router import router as location_router


# ==========================================
# 1. CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="CareBridge AI API",
    description="Educational healthcare software prototype",
    version="1.0.0"
)


# ==========================================
# 2. CORS CONFIGURATION
# ==========================================

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://carebridge-ai.abhickbanerjee.workers.dev"
]

extra_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

allowed_origins = list(set(default_origins + extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# 3. REGISTER LOCATION ROUTER
# ==========================================

app.include_router(location_router)


# ==========================================
# 4. HEALTH REQUEST MODEL
# ==========================================

class HealthRequest(BaseModel):
    concern: str = Field(min_length=8, max_length=2000)
    age_band: str = "Adult"
    duration: str = "Today"


# ==========================================
# 5. EMERGENCY WARNING KEYWORDS
# ==========================================

WARNING_TERMS = [
    "cannot breathe",
    "can't breathe",
    "difficulty breathing",
    "unconscious",
    "heavy bleeding",
    "severe bleeding",
    "chest pain",
    "seizure",
    "stroke",
    "overdose",
    "suicide",
    "severe allergic reaction"
]


# ==========================================
# 6. HOME API
# ==========================================

@app.get("/")
def home():
    return {
        "message": "CareBridge AI backend running",
        "status": "success"
    }


# ==========================================
# 7. HEALTH CHECK API
# ==========================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "message": "CareBridge AI API is healthy"
    }


# ==========================================
# 8. HEALTH ASSESSMENT API
# ==========================================

@app.post("/api/assess")
async def assess(data: HealthRequest):

    text = data.concern.lower()

    matched = [
        word for word in WARNING_TERMS
        if word in text
    ]

    # Emergency warning detection
    if matched:
        return {
            "level": "emergency",
            "message": (
                "Your description includes a possible emergency warning. "
                "This tool cannot assess severity. Seek immediate in-person "
                "emergency help. In India call 112. Do not wait for this website."
            ),
            "reasons": [
                "Potential warning phrase detected."
            ],
            "disclaimer": (
                "This is an unvalidated keyword demonstration. "
                "It can miss emergencies and produce false alarms."
            )
        }

    # OpenAI API integration
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if api_key:

        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)

            response = client.responses.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),

                instructions=(
                    "Provide cautious general health information only. "
                    "Never diagnose, prescribe or say a person is safe. "
                    "Mention uncertainty and recommend qualified medical "
                    "evaluation when appropriate. For possible emergencies, "
                    "tell the user to contact emergency services immediately."
                ),

                input=(
                    f"Age group: {data.age_band}\n"
                    f"Duration: {data.duration}\n"
                    f"Concern: {data.concern}"
                )
            )

            return {
                "level": "general",
                "message": response.output_text,
                "reasons": [
                    "No configured warning phrase was detected. "
                    "This does not rule out an emergency."
                ],
                "disclaimer": (
                    "AI-generated educational information may be incorrect. "
                    "Not a diagnosis or substitute for medical care."
                )
            }

        except Exception as error:
            print("OpenAI API Error:", error)

    # Fallback response
    return {
        "level": "general",
        "message": (
            "This prototype cannot determine the cause or seriousness "
            "of your concern. If symptoms are severe, worsening or "
            "worrying, contact a qualified healthcare professional. "
            "If you think it is an emergency, call 112 in India."
        ),
        "reasons": [
            "No configured warning phrase was detected. "
            "This does not mean the situation is safe."
        ],
        "disclaimer": (
            "Educational demonstration only. Not a diagnosis or treatment."
        )
    }


# ==========================================
# 9. SUPABASE DATABASE STATUS
# ==========================================

@app.get("/database-status")
def database_status():

    try:
        supabase.table("chat_history").select("id").limit(1).execute()

        return {
            "status": "success",
            "message": "CareBridge AI database connected"
        }

    except Exception as error:

        print("Supabase Database Error:", error)

        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )
