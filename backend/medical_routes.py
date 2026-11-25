
import os
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from supabase import create_client
from pydantic import BaseModel
from datetime import time

router = APIRouter(prefix="/api/medical", tags=["Medical Services"])

security = HTTPBearer()

class AppointmentRequest(BaseModel):
    provider_id: str
    appointment_type: str
    appointment_date: date
    appointment_time: time
    patient_name: str
    patient_phone: str
    reason: str = ""


supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

BUCKET = "patient-medical-records"

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png"
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def get_patient(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        decoded = auth.verify_id_token(credentials.credentials)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )


# Upload patient report or prescription
@router.post("/documents/upload")
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    uid: str = Depends(get_patient)
):
    if document_type not in ["report", "prescription", "scan"]:
        raise HTTPException(400, "Invalid document type")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only PDF, JPG and PNG allowed")

    content = await file.read()

    if not content or len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File must be between 1 byte and 10 MB")

    extension = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png"
    }[file.content_type]

    path = f"{uid}/{uuid.uuid4()}.{extension}"

    try:
        supabase.storage.from_(BUCKET).upload(
            path,
            content,
            {"content-type": file.content_type}
        )

        result = supabase.table("patient_documents").insert({
            "firebase_uid": uid,
            "document_name": file.filename or "Medical document",
            "document_type": document_type,
            "storage_path": path,
            "file_type": file.content_type
        }).execute()

        return {
            "status": "success",
            "document": result.data[0]
        }

    except Exception as e:
        try:
            supabase.storage.from_(BUCKET).remove([path])
        except Exception:
            pass
        raise HTTPException(500, "Document upload failed")


# Get only the logged-in patient's documents
@router.get("/documents")
def get_documents(uid: str = Depends(get_patient)):
    result = (
        supabase.table("patient_documents")
        .select("*")
        .eq("firebase_uid", uid)
        .order("uploaded_at", desc=True)
        .execute()
    )

    return {"documents": result.data}


# Generate temporary private document URL
@router.get("/documents/{document_id}/url")
def get_document_url(
    document_id: str,
    uid: str = Depends(get_patient)
):
    result = (
        supabase.table("patient_documents")
        .select("*")
        .eq("id", document_id)
        .eq("firebase_uid", uid)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(404, "Document not found")

    path = result.data[0]["storage_path"]

    signed = supabase.storage.from_(BUCKET).create_signed_url(
        path, 60
    )

    return {"url": signed["signedURL"]}


# Find active hospitals and doctors
@router.get("/providers")
def get_providers(
    city: str = "",
    specialization: str = "",
    virtual: bool = False,
    uid: str = Depends(get_patient)
):
    query = (
        supabase.table("healthcare_providers")
        .select("*")
        .eq("is_active", True)
        .eq("is_virtual", virtual)
    )

    if city:
        query = query.ilike("city", f"%{city}%")

    if specialization:
        query = query.ilike(
            "specialization", f"%{specialization}%"
        )

    result = query.execute()

    return {"providers": result.data}


# Request an in-person or virtual appointment
@router.post("/appointments")
def create_appointment(
    body: AppointmentRequest,
    uid: str = Depends(get_patient)
):
    if body.appointment_type not in ["hospital", "virtual"]:
        raise HTTPException(400, "Invalid appointment type")

    if body.appointment_date < date.today():
        raise HTTPException(400, "Past dates are not allowed")

    if not body.patient_name.strip() or not body.patient_phone.strip():
        raise HTTPException(400, "Patient details are required")

    provider = (
        supabase.table("healthcare_providers")
        .select("*")
        .eq("id", body.provider_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if not provider.data:
        raise HTTPException(404, "Provider not found")

    if bool(provider.data[0]["is_virtual"]) != (
        body.appointment_type == "virtual"
    ):
        raise HTTPException(400, "Provider type mismatch")

    result = supabase.table("patient_appointments").insert({
        "firebase_uid": uid,
        "provider_id": body.provider_id,
        "appointment_type": body.appointment_type,
        "appointment_date": body.appointment_date.isoformat(),
        "appointment_time": body.appointment_time.isoformat(),
        "patient_name": body.patient_name,
        "patient_phone": body.patient_phone,
        "reason": body.reason,
        "status": "pending"
    }).execute()

    return {
        "status": "success",
        "message": "Appointment request submitted",
        "appointment": result.data[0]
    }



# Patient appointment history
@router.get("/appointments")
def get_appointments(uid: str = Depends(get_patient)):
    result = (
        supabase.table("patient_appointments")
        .select("*, healthcare_providers(name, address, city, specialization)")
        .eq("firebase_uid", uid)
        .order("created_at", desc=True)
        .execute()
    )

    return {"appointments": result.data}
