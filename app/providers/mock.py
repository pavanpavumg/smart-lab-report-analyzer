from app.models.ocr import OCRDocument, OCRPage
from app.providers.base import OCRProvider


class MockOCRProvider(OCRProvider):
    name = "mock"

    def extract(self, content: bytes, filename: str) -> OCRDocument:
        text = content.decode("utf-8", errors="ignore")
        return OCRDocument(
            text=text,
            pages=[OCRPage(page_number=1, text=text, confidence=0.99)],
            provider=self.name,
        )
