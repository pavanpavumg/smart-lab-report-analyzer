# Google Cloud setup

## Document AI

1. Create/select a Google Cloud project.
2. Enable Document AI API.
3. Open Document AI Workbench.
4. Create an OCR processor in the desired region.
5. Give the runtime service account permission to use the processor.
6. Configure:

```env
OCR_PROVIDER=document_ai
GOOGLE_CLOUD_PROJECT=my-project
DOCUMENT_AI_LOCATION=us
DOCUMENT_AI_PROCESSOR_ID=xxxxxxxxxxxxxxxx
GOOGLE_APPLICATION_CREDENTIALS=C:\path\service-account.json
```

The provider uses the processor's `processDocument` API and reads the document's OCR text.

## Vision

For image-only input:

```env
OCR_PROVIDER=vision
GOOGLE_APPLICATION_CREDENTIALS=C:\path\service-account.json
```

The Vision adapter uses document text detection.

For production PDF workflows, Document AI is preferred because the project needs document structure and multi-page handling.

## Security

Do not commit credentials or `.env` to Git. Use managed identity/workload identity where supported.
