from google.cloud import vision
from google.oauth2 import service_account


from app.core.config import settings
from app.models.ocr import OCRDocument, OCRPage
from app.providers.base import OCRProvider


class VisionOCRProvider(OCRProvider):
    name = "vision"

    def __init__(self) -> None:
        credentials = None
        if settings.google_application_credentials:
            credentials = service_account.Credentials.from_service_account_file(
                settings.google_application_credentials,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
        self.client = vision.ImageAnnotatorClient(credentials=credentials)


    def extract(self, content: bytes, filename: str) -> OCRDocument:
        # Vision's document_text_detection is used for a single image.
        # For PDFs, Google Cloud Vision's async PDF workflow is more involved;
        # Document AI is therefore the recommended provider for PDF input.
        if filename.lower().endswith(".pdf"):
            raise RuntimeError(
                "The Vision adapter currently accepts images only. "
                "Use OCR_PROVIDER=document_ai for PDFs."
            )

        image = vision.Image(content=content)
        response = self.client.document_text_detection(image=image)
        if response.error.message:
            raise RuntimeError(response.error.message)

        text = (
            response.full_text_annotation.text if response.full_text_annotation else ""
        )
        return OCRDocument(
            text=text,
            pages=[OCRPage(page_number=1, text=text)],
            provider=self.name,
        )
