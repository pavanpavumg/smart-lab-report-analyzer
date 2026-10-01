from abc import ABC, abstractmethod

from app.models.ocr import OCRDocument


class OCRProvider(ABC):
    name = "base"

    @abstractmethod
    def extract(self, content: bytes, filename: str) -> OCRDocument:
        raise NotImplementedError
