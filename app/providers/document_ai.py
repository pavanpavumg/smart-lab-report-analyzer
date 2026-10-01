from google.api_core.client_options import ClientOptions
from google.cloud import documentai
from google.oauth2 import service_account

from app.core.config import settings
from app.models.ocr import OCRDocument, OCRPage
from app.providers.base import OCRProvider


class DocumentAIProvider(OCRProvider):
    name = "document_ai"

    def __init__(self) -> None:
        if not settings.google_cloud_project:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT is required for Document AI.")
        if not settings.document_ai_processor_id:
            raise RuntimeError("DOCUMENT_AI_PROCESSOR_ID is required for Document AI.")

        endpoint = f"{settings.document_ai_location}-documentai.googleapis.com"

        credentials = None
        if settings.google_application_credentials:
            credentials = service_account.Credentials.from_service_account_file(
                settings.google_application_credentials,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )

        self.client = documentai.DocumentProcessorServiceClient(
            client_options=ClientOptions(api_endpoint=endpoint),
            credentials=credentials,
        )
        self.processor_name = self.client.processor_path(
            settings.google_cloud_project,
            settings.document_ai_location,
            settings.document_ai_processor_id,
        )

    def extract(self, content: bytes, filename: str) -> OCRDocument:
        mime_type = _mime_type(filename)
        request = documentai.ProcessRequest(
            name=self.processor_name,
            raw_document=documentai.RawDocument(content=content, mime_type=mime_type),
        )
        result = self.client.process_document(request=request)
        document = result.document

        pages: list[OCRPage] = []
        for index, page in enumerate(document.pages or [], start=1):
            page_text = _reconstruct_page_text(document.text or "", page)
            pages.append(OCRPage(page_number=index, text=page_text))

        full_text = (
            "\n\n".join(p.text for p in pages) if pages else (document.text or "")
        )

        return OCRDocument(
            text=full_text,
            pages=pages,
            provider=self.name,
        )


def _reconstruct_page_text(document_text: str, page) -> str:
    if not getattr(page, "lines", None):
        return _layout_text(document_text, page.layout)

    lines_with_pos = []
    for line in page.lines:
        t = _layout_text(document_text, line.layout).strip()
        if not t:
            continue
        poly = line.layout.bounding_poly.normalized_vertices
        min_y = min(v.y for v in poly) if poly else 0
        max_y = max(v.y for v in poly) if poly else 0
        min_x = min(v.x for v in poly) if poly else 0
        mid_y = (min_y + max_y) / 2
        lines_with_pos.append(
            {
                "text": t,
                "mid_y": mid_y,
                "min_x": min_x,
            }
        )

    if not lines_with_pos:
        return _layout_text(document_text, page.layout)

    lines_with_pos.sort(key=lambda item: item["mid_y"])
    rows: list[dict] = []
    for item in lines_with_pos:
        placed = False
        for row in rows:
            if abs(item["mid_y"] - row["mid_y"]) < 0.010:
                row["items"].append(item)
                row["mid_y"] = sum(x["mid_y"] for x in row["items"]) / len(row["items"])
                placed = True
                break
        if not placed:
            rows.append({"mid_y": item["mid_y"], "items": [item]})

    row_texts = []
    for r in rows:
        r["items"].sort(key=lambda x: x["min_x"])
        row_texts.append(" ".join(x["text"] for x in r["items"]))

    return "\n".join(row_texts)


def _mime_type(filename: str) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    return {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "tif": "image/tiff",
        "tiff": "image/tiff",
        "bmp": "image/bmp",
    }.get(ext, "application/octet-stream")


def _layout_text(full_text: str, layout) -> str:
    if not layout or not layout.text_anchor:
        return ""
    chunks = []
    for segment in layout.text_anchor.text_segments:
        start = int(segment.start_index or 0)
        end = int(segment.end_index or 0)
        chunks.append(full_text[start:end])
    return "".join(chunks)
