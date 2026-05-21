import sys
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

from predict_field_model import predict_yield

ROOT = Path(__file__).resolve().parents[1]
TIMESERIES_DIR = ROOT / "timeseries prediction"
if str(TIMESERIES_DIR) not in sys.path:
    sys.path.insert(0, str(TIMESERIES_DIR))

from predict_growth_model import predict_growth

INTEGRATION_DIR = ROOT / "model integration"
if str(INTEGRATION_DIR) not in sys.path:
    sys.path.insert(0, str(INTEGRATION_DIR))

from integrated_tomato_model import predict_integrated_tomato


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


class TimeSeriesEnvironmentRequest(BaseModel):
    t_air_mean: float
    rh_mean: float
    co2_mean: float
    par_lamp_daily: float
    light_on_hours_daily: float


class TimeSeriesPredictRequest(BaseModel):
    start_day: int
    maturity_day: int | None = None
    ec: str
    light: str
    environment: TimeSeriesEnvironmentRequest


class IntegratedPredictRequest(BaseModel):
    ec: str
    light: str
    start_day: int
    forecast_days: int
    variety: str
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
    soil_pH: float
    par_lamp_daily: float


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(request: PredictRequest) -> dict[str, float]:
    prediction = predict_yield(request.model_dump())
    return {"predicted_yield_kg_per_m2": prediction}


@app.post("/predict/timeseries")
def predict_timeseries(request: TimeSeriesPredictRequest) -> dict:
    return predict_growth(request.model_dump())


@app.post("/predict/integrated")
def predict_integrated(request: IntegratedPredictRequest) -> dict:
    return predict_integrated_tomato(request.model_dump())
