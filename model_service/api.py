import importlib.util
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
INTEGRATION_DIR = ROOT / "model integration"
TIMESERIES_MODEL_PATH = INTEGRATION_DIR / "timeseries model" / "predict_growth_model.py"
INTEGRATED_MODEL_PATH = INTEGRATION_DIR / "integrated_tomato_model.py"


def load_function(module_path: Path, module_name: str, function_name: str):
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load {function_name} from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, function_name)


predict_growth = load_function(
    TIMESERIES_MODEL_PATH,
    "final_timeseries_predict_growth_model",
    "predict_growth",
)
predict_integrated_tomato = load_function(
    INTEGRATED_MODEL_PATH,
    "final_integrated_tomato_model",
    "predict_integrated_tomato",
)
predict_yield_tomato = load_function(
    INTEGRATED_MODEL_PATH,
    "final_integrated_tomato_yield_model",
    "predict_yield_tomato",
)


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
    prediction = predict_yield_tomato(request.model_dump())
    return {"predicted_yield_kg_per_m2": prediction["yield_kg_per_m2"]}


@app.post("/predict/timeseries")
def predict_timeseries(request: TimeSeriesPredictRequest) -> dict:
    return predict_growth(request.model_dump())


@app.post("/predict/integrated")
def predict_integrated(request: IntegratedPredictRequest) -> dict:
    return predict_integrated_tomato(request.model_dump())
