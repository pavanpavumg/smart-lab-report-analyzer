from app.core.config import settings
from app.providers.base import OCRProvider
from app.providers.mock import MockOCRProvider


def build_ocr_provider() -> OCRProvider:
    provider = settings.ocr_provider.lower().strip()
    if provider == "mock":
        return MockOCRProvider()
    if provider == "document_ai":
        from app.providers.document_ai import DocumentAIProvider
        return DocumentAIProvider()
    if provider == "vision":
        from app.providers.vision import VisionOCRProvider
        return VisionOCRProvider()
    raise ValueError(
        f"Unsupported OCR_PROVIDER='{settings.ocr_provider}'. "
        "Use mock, document_ai or vision."
    )
