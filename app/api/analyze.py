from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.schemas.report import AnalysisResponse
from app.services.analysis_service import analyze_document
from app.services.ocr_service import build_ocr_provider

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(file: UploadFile = File(...)) -> AnalysisResponse:
    filename = file.filename or "upload"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in settings.allowed_extension_set:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension '.{extension}'. "
                   f"Allowed: {sorted(settings.allowed_extension_set)}",
        )

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_size_mb} MB limit.",
        )

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        provider = build_ocr_provider()
        return analyze_document(
            content=content,
            filename=filename,
            provider=provider,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
