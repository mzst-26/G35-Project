# Allocation Service

Python service responsible for worker matching, fairness scoring, and reallocation ranking.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn allocation_service.main:app --reload --app-dir src
```

## Test

```bash
pytest
```
