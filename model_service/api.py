from fastapi import FastAPI
from pydantic import BaseModel

from predict_field_model import predict_yield


app = FastAPI(title="Tomato Yield Model API")


class PredictRequest(BaseModel):
    avg_temperature_C: float
    min_temperature_C: float
    max_temperature_C: float
    humidity_percent: float
    co2_ppm: float
    light_intensity_lux: float
    photoperiod_hours: float
    irrigation_mm: float
    fertilizer_N_kg_ha: float
    fertilizer_P_kg_ha: float
    fertilizer_K_kg_ha: float
    pest_severity: float
    pH: float
    variety: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(request: PredictRequest) -> dict[str, float]:
    prediction = predict_yield(request.model_dump())
    return {"predicted_yield_kg_per_m2": prediction}
