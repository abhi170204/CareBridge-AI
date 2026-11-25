import os
import re
import base64
import io
from typing import Optional

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Form
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq
from PIL import Image
from starlette.concurrency import run_in_threadpool

# Load environment variables
load_dotenv()

from supabase_client import supabase
from location_router import router as location_router

import json
import uuid

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from fastapi import Header
from fastapi import Depends
from medical_routes import router as medical_router


# ==========================================
# 1. CREATE FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="CareBridge AI API",
    description="Healthcare assistance and accident guidance prototype",
    version="2.0.0"
)

app.include_router(medical_router)

from fastapi.middleware.cors import CORSMiddleware


# ==========================================
# 2. GROQ CONFIGURATION
# ==========================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

TEXT_MODEL = os.getenv(
    "GROQ_TEXT_MODEL",
    "openai/gpt-oss-120b"
)

VISION_MODEL = os.getenv(
    "GROQ_VISION_MODEL",
    "qwen/qwen3.8-27b"
)

groq_client = (
    Groq(api_key=GROQ_API_KEY)
    if GROQ_API_KEY
    else None
)


# ==========================================
# FIREBASE ADMIN CONFIGURATION
# ==========================================

firebase_admin_initialized = False

try:
    firebase_credentials_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON",
        ""
    )

    if not firebase_credentials_json:
        raise ValueError("Firebase credentials are missing")

    service_account_info = json.loads(firebase_credentials_json)

    try:
        firebase_admin.get_app()
    except ValueError:
        credential = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(credential)

    firebase_admin_initialized = True
    print("Firebase Admin initialized successfully")

except Exception as error:
    print("Firebase Admin initialization error:", str(error))


# ==========================================
# FIREBASE TOKEN VERIFICATION
# ==========================================

def verify_firebase_user(authorization: Optional[str] = Header(None)):

    if not firebase_admin_initialized:
        raise HTTPException(
            status_code=503,
            detail="Firebase authentication is not configured."
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication token is required."
        )

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token["uid"]

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Authentication failed. Please log in again."
        )




# ==========================================
# 3. CORS CONFIGURATION
# ==========================================

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://carebridge-ai.abhickbanerjee.workers.dev",
]

extra_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

allowed_origins = list(
    dict.fromkeys(default_origins + extra_origins)
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 4. REGISTER EXISTING LOCATION ROUTER
# ==========================================

app.include_router(location_router)


# ==========================================
# 5. HEALTH REQUEST MODEL
# ==========================================

class HealthRequest(BaseModel):
    concern: str = Field(min_length=8, max_length=2000)
    age_band: str = "Adult"
    duration: str = "Today"
    

# ==========================================
# CHATBOT REQUEST MODEL
# ==========================================

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: Optional[str] = None


# ==========================================
# 6. EMERGENCY DETECTION
# ==========================================

WARNING_TERMS = [
    "cannot breathe",
    "can't breathe",
    "difficulty breathing",
    "unconscious",
    "heavy bleeding",
    "severe bleeding",
    "severe chest pain",
    "chest pain",
    "not breathing",
    "not responding",
    "seizure",
    "stroke",
    "overdose",
    "suicide attempt",
    "severe allergic reaction",
    "face drooping",
    "slurred speech"
]

ACCIDENT_WARNING_TERMS = [
    "cannot breathe",
    "can't breathe",
    "difficulty breathing",
    "unconscious",
    "not breathing",
    "not responding",
    "heavy bleeding",
    "severe bleeding",
    "severe chest pain",
    "seizure",
    "head injury",
    "neck injury",
    "spinal injury",
    "amputation",
    "crushed",
    "severe burn"
]



def detect_emergency(text: str, terms: list):

    normalized = text.lower()

    for term in terms:

        position = normalized.find(term)

        if position == -1:
            continue

        prefix = normalized[max(0, position - 25):position]

        if re.search(
            r"\b(no|not|without|denies|denied)\s+(?:any\s+)?$",
            prefix
        ):
            continue

        return True

    return False


def emergency_response():

    return {
        "level": "emergency",
        "emergency": True,
        "message": (
            "URGENT MEDICAL WARNING\n\n"
            "The information you provided includes a possible "
            "medical emergency warning.\n\n"
            "Call 112 in India or contact your local emergency "
            "service immediately. Seek emergency medical care.\n\n"
            "Do not wait for AI analysis or upload photographs "
            "before getting help."
        ),
        "disclaimer": (
            "This is an automated safety warning, not a medical diagnosis."
        )
    }


# ==========================================
# 7. GROQ AI FUNCTION
# ==========================================

def generate_ai_response(messages, use_vision=False):

    if groq_client is None:
        raise HTTPException(
            status_code=503,
            detail="Groq API key is not configured."
        )

    model = VISION_MODEL if use_vision else TEXT_MODEL

    try:

        completion = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.2,
            max_completion_tokens=1500
        )

        return completion.choices[0].message.content

    except Exception as error:

        print("Groq API Error:", str(error))

        raise HTTPException(
            status_code=502,
            detail="AI service is temporarily unavailable. Please try again."
        )


# ==========================================
# 8. HOME API
# ==========================================

@app.get("/")
def home():

    return {
        "message": "CareBridge AI backend running",
        "status": "success",
        "ai_provider": "Groq",
        "features": [
            "Health Assessment",
            "Accident Assistance",
            "AI Image Analysis",
            "Location Services"
        ]
    }


# ==========================================
# 9. HEALTH CHECK API
# ==========================================

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "message": "CareBridge AI API is healthy",
        "ai_configured": groq_client is not None
    }


# ==========================================
# 10. EXISTING HEALTH ASSESSMENT API
# ==========================================

@app.post("/api/assess")
def assess(data: HealthRequest):

    if detect_emergency(data.concern, WARNING_TERMS):
        return emergency_response()

    system_prompt = """
    You are CareBridge AI, a responsible health information assistant.

    Provide general educational health information only.

    RULES:
    1. Never claim a confirmed diagnosis.
    2. Never prescribe medicine or dosages.
    3. Explain possible causes with uncertainty.
    4. Ask follow-up questions if information is missing.
    5. Identify serious warning signs.
    6. Recommend appropriate medical consultation.
    7. Never tell a patient that they are definitely safe.
    8. Use simple language.
    9. If an emergency is suspected, advise immediate medical care.

    Organize the response into:
    - Symptom summary
    - Possible explanations
    - Warning signs
    - Recommended next steps
    - Doctor consultation guidance

    Mention that this is not a medical diagnosis.
    """

    user_message = f"""
    Patient age group: {data.age_band}

    Symptom duration: {data.duration}

    Patient concern: {data.concern}
    """

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": user_message
        }
    ]

    result = generate_ai_response(messages)

    return {
        "level": "general",
        "emergency": False,
        "message": result,
        "disclaimer": (
            "AI-generated educational information is not a diagnosis "
            "or substitute for professional medical care."
        )
    }

# ==========================================
# CHATBOT SYSTEM PROMPT
# ==========================================

CHATBOT_SYSTEM_PROMPT = """
You are CareBridge AI, a responsible healthcare
information assistant.

Your purpose is to provide general health education,
wellness information and safe first-aid guidance.

STRICT RULES:

1. Never claim to provide a confirmed diagnosis.
2. Never prescribe medicines or dosages.
3. Explain possible causes with uncertainty.
4. Ask relevant follow-up questions.
5. Identify serious medical warning signs.
6. Recommend professional medical consultation.
7. Never claim that a patient is definitely safe.
8. Use simple, understandable language.
9. Never delay emergency medical assistance.
10. Do not request unnecessary personal information.
11. Respect user privacy.
12. Do not invent medical facts.

EMERGENCY SAFETY:

If a user describes possible severe chest pain,
difficulty breathing, unconsciousness, stroke symptoms,
severe bleeding, seizure or another life-threatening
situation, advise immediate emergency medical assistance.

For India, advise calling 112.

RESPONSE STYLE:

- Friendly and conversational.
- Clear paragraphs.
- Short headings where useful.
- Ask one relevant follow-up question when needed.
- Avoid unnecessary technical terminology.

You are an educational AI assistant, not a replacement
for a qualified healthcare professional.
"""



# ==========================================
# 11. ACCIDENT IMAGE PROCESSING
# ==========================================

MAX_IMAGE_SIZE = 5 * 1024 * 1024


async def process_uploaded_image(photo: UploadFile):

    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image."
        )

    image_bytes = await photo.read(MAX_IMAGE_SIZE + 1)

    if len(image_bytes) > MAX_IMAGE_SIZE:

        raise HTTPException(
            status_code=413,
            detail="Image size must be less than 5 MB."
        )

    if not image_bytes:

        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    try:

        image = Image.open(io.BytesIO(image_bytes))

        image.verify()

        image = Image.open(io.BytesIO(image_bytes))

        image = image.convert("RGB")

        image.thumbnail((1600, 1600))

        output = io.BytesIO()

        image.save(
            output,
            format="JPEG",
            quality=85,
            optimize=True
        )

        encoded_image = base64.b64encode(
            output.getvalue()
        ).decode("utf-8")

        return f"data:image/jpeg;base64,{encoded_image}"

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid or unsupported image. Upload JPG, PNG or WEBP."
        )

    finally:

        await photo.close()


# ==========================================
# 12. ACCIDENT ASSISTANCE SYSTEM PROMPT
# ==========================================

ACCIDENT_SYSTEM_PROMPT = """
You are CareBridge AI Emergency Assistance Assistant.

You provide responsible general first-aid information.

You are NOT a doctor, emergency dispatcher or medical diagnostic system.

STRICT SAFETY RULES:

1. Never claim to diagnose an injury from a photograph.
2. Never determine that an injury is minor or safe based only on an image.
3. Never rule out internal bleeding, fractures, brain injury or internal injuries.
4. Never prescribe medication or dosage.
5. Do not recommend moving a person with a possible spinal injury.
6. Never delay emergency medical care for AI analysis.
7. For unconsciousness, abnormal breathing, severe bleeding,
   serious head injury or other serious warning signs,
   recommend immediate emergency medical assistance.
8. For severe bleeding, explain direct pressure using a clean dressing.
9. For burns, recommend cool running water for 20 minutes.
   Do not recommend ice, butter or toothpaste.
10. For electric shock, advise switching off the electrical source
    before touching the injured person.
11. For animal bites, recommend washing the wound and prompt
    professional medical assessment.
12. Explain when an ambulance or emergency department is needed.
13. Do not assume the person is safe because they can communicate.
14. Do not invent observations from photographs.
15. If the image is unclear, say so.
16. Use simple language.
17. Respect the patient's selected language.

IMPORTANT:

A photograph cannot establish injury depth, internal injuries,
fractures or overall patient stability.

RESPONSE FORMAT:

1. Accident Summary
2. Visible Observations (only if an image was provided)
3. Immediate First-Aid Guidance
4. Warning Signs
5. Recommended Medical Care
6. What NOT to Do

If information is missing, ask relevant follow-up questions.

Do not make a final diagnosis.
"""


# ==========================================
# 13. ACCIDENT & EMERGENCY ASSISTANCE API
# ==========================================

@app.post("/api/accident-assist")
async def accident_assist(

    patient_category: str = Form(...),

    accident_time: str = Form(...),

    accident_type: str = Form(...),

    description: str = Form(...),

    language: str = Form("English"),

    emergency_signs: str = Form(""),

    consent_to_ai_processing: bool = Form(False),

    photo: Optional[UploadFile] = File(None)

):

    # Require explicit consent

    if not consent_to_ai_processing:

        raise HTTPException(
            status_code=400,
            detail="Please provide consent before using AI assessment."
        )

    # Validate input lengths

    if len(description.strip()) < 5:

        raise HTTPException(
            status_code=400,
            detail="Please describe the accident."
        )

    if len(description) > 2000:

        raise HTTPException(
            status_code=400,
            detail="Description is too long."
        )

    valid_categories = [
        "Infant",
        "Child",
        "Adolescent",
        "Adult",
        "Older Adult",
        "Unknown"
    ]

    if patient_category not in valid_categories:

        raise HTTPException(
            status_code=400,
            detail="Invalid patient age category."
        )

    valid_times = [
        "Just now",
        "Within the last hour",
        "2-6 hours ago",
        "Yesterday",
        "2 days ago",
        "3-7 days ago",
        "More than a week ago"
    ]

    if accident_time not in valid_times:

        raise HTTPException(
            status_code=400,
            detail="Invalid accident time."
        )

    if len(accident_type) > 100 or len(language) > 40:

        raise HTTPException(
            status_code=400,
            detail="Invalid accident information."
        )

    if len(emergency_signs) > 1000:

        raise HTTPException(
            status_code=400,
            detail="Emergency information is too long."
        )

    # Emergency screening BEFORE image analysis

    combined_text = (
        description + " " + emergency_signs
    )

    if detect_emergency(
        combined_text,
        ACCIDENT_WARNING_TERMS
    ):

        return emergency_response()

    if groq_client is None:

        raise HTTPException(
            status_code=503,
            detail="Groq API key is not configured."
        )

    # Prepare patient information

    patient_information = f"""
    PATIENT AGE CATEGORY: {patient_category}

    ACCIDENT TIME: {accident_time}

    ACCIDENT TYPE: {accident_type}

    PATIENT DESCRIPTION: {description}

    REPORTED EMERGENCY SIGNS: {emergency_signs}

    RESPONSE LANGUAGE: {language}

    Provide safe first-aid information and explain
    when immediate professional medical attention is needed.
    """

    # Prepare AI messages

    messages = [
        {
            "role": "system",
            "content": ACCIDENT_SYSTEM_PROMPT
        }
    ]

    use_vision = False

    # Optional photo processing

    if photo is not None:

        image_data = await process_uploaded_image(photo)

        use_vision = True

        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        patient_information
                        + "\n\n"
                        + "Examine the supplied image only for visible "
                        + "observations. Explain limitations and provide "
                        + "safe first-aid guidance. Do not diagnose."
                    )
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": image_data
                    }
                }
            ]
        })

    else:

        messages.append({
            "role": "user",
            "content": patient_information
        })

    # Call Groq AI

    result = await run_in_threadpool(
        generate_ai_response,
        messages,
        use_vision
    )

    return {
        "level": "assessment",
        "emergency": False,
        "patient_category": patient_category,
        "accident_time": accident_time,
        "accident_type": accident_type,
        "image_analyzed": use_vision,
        "ai_provider": "Groq",
        "message": result,
        "disclaimer": (
            "This is AI-generated first-aid information, not a diagnosis. "
            "A photograph cannot rule out serious injury. Seek professional "
            "medical assessment, especially after significant accidents."
        )
    }


# ==========================================
# 14. SUPABASE DATABASE STATUS
# ==========================================

@app.get("/database-status")
def database_status():

    try:

        supabase.table(
            "chat_history"
        ).select("id").limit(1).execute()

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

# ==========================================
# CAREBRIDGE AI CHATBOT API
# ==========================================

def get_chat_rows(user_id, conversation_id):

    response = (
        supabase.table("chat_history")
        .select("*")
        .eq("firebase_uid", user_id)
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .limit(30)
        .execute()
    )

    return response.data or []


# ==========================================
# 1. SEND CHAT MESSAGE
# ==========================================

@app.post("/api/chat")
async def chat(
    data: ChatRequest,
    user_id: str = Depends(verify_firebase_user)
):

    message = data.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    try:

        if data.conversation_id:
            try:
                conversation_id = str(
                    uuid.UUID(data.conversation_id)
                )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid conversation ID."
                )

            previous_rows = get_chat_rows(
                user_id,
                conversation_id
            )

            if not previous_rows:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found."
                )

            title = previous_rows[0].get("title") or message[:60]

        else:
            conversation_id = str(uuid.uuid4())
            title = message[:60]

        if detect_emergency(message, WARNING_TERMS):
            ai_response = emergency_response()["message"]
        else:

            previous_rows = get_chat_rows(
                user_id,
                conversation_id
            ) if data.conversation_id else []

            messages = [
                {
                    "role": "system",
                    "content": CHATBOT_SYSTEM_PROMPT
                }
            ]

            for row in previous_rows[-10:]:

                if row.get("user_message"):
                    messages.append({
                        "role": "user",
                        "content": row["user_message"]
                    })

                if row.get("assistant_response"):
                    messages.append({
                        "role": "assistant",
                        "content": row["assistant_response"]
                    })

            messages.append({
                "role": "user",
                "content": message
            })

            ai_response = await run_in_threadpool(
                generate_ai_response,
                messages
            )

        supabase.table("chat_history").insert({
            "firebase_uid": user_id,
            "conversation_id": conversation_id,
            "title": title,
            "user_message": message,
            "assistant_response": ai_response
        }).execute()

        return {
            "status": "success",
            "conversation_id": conversation_id,
            "title": title,
            "message": message,
            "response": ai_response
        }

    except HTTPException:
        raise

    except Exception as error:
        print("Chat API error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to process chat message."
        )


# ==========================================
# 2. GET SAVED CHAT HISTORY
# ==========================================

@app.get("/api/chat/history")
def chat_history(
    user_id: str = Depends(verify_firebase_user)
):

    try:

        response = (
            supabase.table("chat_history")
            .select(
                "conversation_id,title,user_message,created_at"
            )
            .eq("firebase_uid", user_id)
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )

        conversations = {}

        for row in response.data or []:

            conversation_id = row.get("conversation_id")

            if not conversation_id:
                continue

            if conversation_id not in conversations:

                conversations[conversation_id] = {
                    "conversation_id": conversation_id,
                    "title": row.get("title") or "New conversation",
                    "created_at": row.get("created_at")
                }

        return {
            "status": "success",
            "conversations": list(conversations.values())
        }

    except Exception as error:
        print("Chat history error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve chat history."
        )


# ==========================================
# 3. OPEN PREVIOUS CONVERSATION
# ==========================================

@app.get("/api/chat/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user_id: str = Depends(verify_firebase_user)
):

    try:

        conversation_id = str(uuid.UUID(conversation_id))

        rows = get_chat_rows(
            user_id,
            conversation_id
        )

        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found."
            )

        messages = []

        for row in rows:

            messages.append({
                "role": "user",
                "content": row["user_message"],
                "created_at": row.get("created_at")
            })

            messages.append({
                "role": "assistant",
                "content": row["assistant_response"],
                "created_at": row.get("created_at")
            })

        return {
            "status": "success",
            "conversation_id": conversation_id,
            "title": rows[0].get("title") or "New conversation",
            "messages": messages
        }

    except HTTPException:
        raise

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid conversation ID."
        )

    except Exception as error:
        print("Conversation retrieval error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve conversation."
        )


# ==========================================
# 4. DELETE CONVERSATION
# ==========================================

@app.delete("/api/chat/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(verify_firebase_user)
):

    try:

        conversation_id = str(uuid.UUID(conversation_id))

        existing = get_chat_rows(
            user_id,
            conversation_id
        )

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found."
            )

        supabase.table("chat_history").delete().eq(
            "firebase_uid", user_id
        ).eq(
            "conversation_id", conversation_id
        ).execute()

        return {
            "status": "success",
            "message": "Conversation deleted successfully."
        }

    except HTTPException:
        raise

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid conversation ID."
        )

    except Exception as error:
        print("Conversation deletion error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete conversation."
        )

