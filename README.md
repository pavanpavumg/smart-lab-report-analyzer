# Smart Lab Report Analyzer

Stateless FastAPI backend for extracting structured JSON from blood laboratory reports.

## What it does

- Accepts PDF, PNG, JPG/JPEG, WEBP, TIFF and BMP uploads.
- Uses Google Document AI as the primary OCR/layout provider.
- Includes a Google Cloud Vision provider adapter.
- Includes a deterministic `mock` provider so the project can be developed and tested without Google credentials.
- Detects whether the document is a supported blood laboratory report.
- Extracts patient name, age and gender.
- Extracts test name, value, unit and reference ranges.
- Parses numeric, operator-based, gender-specific and qualitative reference ranges.
- Normalizes common OCR artifacts without destroying the original OCR text.
- Detects profiles such as CBC, Kidney, Electrolyte, Liver, Lipid, Thyroid, Iron, Diabetes and Vitamin.
- Preserves unknown parameters as `Custom`.
- Calculates `flag` from the supplied laboratory reference range.
- Returns JSON only. No database and no permanent report storage.
- Keeps processing in memory and deletes the temporary upload after analysis.

## Architecture

```text
Upload
  |
  v
FastAPI
  |
  v
Validation
  |
  v
OCR Provider
  |---- Google Document AI
  |---- Google Cloud Vision
  `---- Mock provider (tests/local development)
  |
  v
OCR Text + Layout
  |
  +--> Blood Report Classifier
  |
  +--> Patient Extractor
  |
  +--> Test/Row Extractor
  |
  +--> OCR Normalizer
  |
  +--> Reference Range Parser
  |
  +--> Profile Detector
  |
  +--> Flag Engine
  |
  v
Pydantic validation
  |
  v
JSON response
```

## Requirements

- Python 3.11+
- Google Cloud project only when using `document_ai` or `vision`
- For Google Document AI:
  - enable the Document AI API
  - create a processor
  - configure service-account credentials

## Quick start

### Windows PowerShell

```powershell
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

### Linux/macOS

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Open:

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

## Local development without Google credentials

`.env` defaults to:

```env
OCR_PROVIDER=mock
```

The mock provider recognizes a small synthetic fixture so the complete extraction pipeline can be tested.

Run:

```bash
pytest -q
```

## Google Document AI setup

Set:

```env
OCR_PROVIDER=document_ai
GOOGLE_CLOUD_PROJECT=your-project-id
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

The service account needs access to the Document AI processor.

For production, prefer workload identity / the platform's managed service account instead of placing a JSON key on the server.

## Google Vision setup

Set:

```env
OCR_PROVIDER=vision
GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

Vision is supported through the same provider interface. The application can therefore be switched without changing extraction logic.

## API

### POST `/api/v1/analyze`

Multipart upload:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/analyze" \
  -F "file=@sample_blood_report.txt"
```

The production request is the same for PDF/image files.

### Example response

```json
{
  "success": true,
  "document_type": "BLOOD_LAB",
  "document_confidence": 0.98,
  "patient": {
    "patient_name": "Mrs. GORAMMA",
    "age": 59,
    "gender": "Female"
  },
  "profiles": [
    {
      "profile_name": "Kidney Profile",
      "tests": [
        {
          "test_name": "Serum Creatinine",
          "canonical_name": "creatinine",
          "value": 0.72,
          "raw_value": "0.72",
          "raw_unit": "mg/dL",
          "normalized_unit": "mg/dL",
          "reference_range": "0.6 - 1.2",
          "reference_low": 0.6,
          "reference_high": 1.2,
          "operator": null,
          "raw_status": null,
          "flag": "NORMAL",
          "profile": "Kidney Profile",
          "page_number": 1,
          "ocr_confidence": null,
          "extraction_confidence": 0.95,
          "source_text": "Serum Creatinine 0.72 mg/dL 0.6 - 1.2"
        }
      ]
    }
  ],
  "custom_parameters": [],
  "validation": {
    "valid_blood_report": true,
    "unsupported_pages": []
  }
}
```

## Design notes

### Stateless

There is no database, ORM, report table, patient table, or permanent object storage.

The API returns the analysis in the response. Uploaded bytes are held only for processing. A production reverse proxy/load balancer should also be configured with suitable request-size and timeout limits.

### Raw vs normalized values

The parser deliberately keeps both:

- `raw_value`
- `raw_unit`
- `normalized_unit`
- `source_text`

This is important for OCR artifacts such as:

- `gm%` -> `g/dL`
- `10~9/L` -> `10^9/L`
- `µIU/ml` -> `µIU/mL`

Normalization never replaces the source text.

### Flags

`flag` is a deterministic comparison against the reference interval printed by the laboratory:

- `LOW`
- `NORMAL`
- `HIGH`
- `CRITICAL` is not generated by this project unless the source explicitly marks it as such.
- `UNKNOWN` when a reliable comparison cannot be made.

This is not a medical diagnosis.

### Unsupported reports

The classifier is intentionally conservative. It looks for blood/laboratory vocabulary and test-like rows. Clearly non-blood documents such as imaging reports should be rejected.

For a multi-page mixed document, the current API reports unsupported pages in validation metadata rather than silently treating them as blood tests.

## Project structure

```text
app/
  api/
  core/
  models/
  providers/
  rules/
  schemas/
  services/
  utils/
tests/
fixtures/
```

## Extending the project

1. Add aliases in `app/rules/aliases.py`.
2. Add profile keywords in `app/rules/profiles.py`.
3. Add extraction patterns in `app/services/test_extractor.py`.
4. Add provider-specific parsing only inside `app/providers/`.
5. Keep the final output schema stable.
6. Add a fixture and regression test for every new layout.

For high-volume production workloads, replace the in-memory provider call with an async job architecture only if needed. The core extraction service is deliberately independent of persistence.
