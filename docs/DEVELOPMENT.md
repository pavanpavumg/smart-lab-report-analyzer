# Development workflow

## 1. Create environment

```bash
python -m venv .venv
```

Activate it and install:

```bash
pip install -r requirements.txt
```

## 2. Run tests

```bash
pytest -q
```

## 3. Run server

```bash
uvicorn app.main:app --reload
```

## 4. Switch OCR provider

Development:

```env
OCR_PROVIDER=mock
```

Google Document AI:

```env
OCR_PROVIDER=document_ai
```

Google Vision:

```env
OCR_PROVIDER=vision
```

The extraction service does not know which provider produced the OCR. This keeps provider-specific Google code isolated.
