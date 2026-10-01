# Extraction rules

## Patient

Supported examples:

- `Patient Name: John Doe`
- `Name: John Doe`
- `59 Years/Female`
- `Age: 53 Y/F`

## Reference ranges

Supported:

- `12.0 - 15.0`
- `12.0 to 15.0`
- `<200`
- `>45`
- `Upto 31`
- gender-specific ranges containing `Male:` and `Female:`

## Flags

A numeric value is compared with the selected reference range:

```text
value < low  -> LOW
value > high -> HIGH
otherwise    -> NORMAL
```

If no reliable numeric interval exists, the result is `UNKNOWN`.

## Custom parameters

If a row is successfully recognized but does not map to an alias/profile, it is retained as:

```json
{
  "profile": "Custom",
  "canonical_name": null
}
```

This prevents the pipeline from silently dropping new lab parameters.
