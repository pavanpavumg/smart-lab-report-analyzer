from dataclasses import dataclass, field


@dataclass
class OCRPage:
    page_number: int
    text: str
    confidence: float | None = None


@dataclass
class OCRDocument:
    text: str
    pages: list[OCRPage] = field(default_factory=list)
    provider: str = "unknown"
