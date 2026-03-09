from fastapi import FastAPI
from pydantic import BaseModel, Field


class JobLocation(BaseModel):
    lat: float
    lng: float


class AllocationRequest(BaseModel):
    job_id: str
    trade_id: str
    workers_needed: int = Field(gt=0)
    location: JobLocation


class AllocationCandidate(BaseModel):
    worker_id: str
    score: float
    reason: str


class AllocationResponse(BaseModel):
    job_id: str
    candidates: list[AllocationCandidate]


app = FastAPI(title="infra Allocation Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "allocation",
        "status": "ok",
    }


@app.post("/allocate", response_model=AllocationResponse)
def allocate(payload: AllocationRequest) -> AllocationResponse:
    candidates = [
        AllocationCandidate(
            worker_id=f"worker-{index + 1}",
            score=100.0 - (index * 5.0),
            reason="placeholder score; replace with postgis+fairness model",
        )
        for index in range(payload.workers_needed)
    ]

    return AllocationResponse(job_id=payload.job_id, candidates=candidates)
