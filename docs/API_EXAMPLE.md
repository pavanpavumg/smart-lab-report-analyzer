# API example

## Request

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/analyze" \
  -F "file=@report.pdf"
```

## Success

The response is the structured `AnalysisResponse` JSON.

## Important

The API does not save the report. If the caller wants to keep the result, the caller is responsible for storing the returned JSON.
