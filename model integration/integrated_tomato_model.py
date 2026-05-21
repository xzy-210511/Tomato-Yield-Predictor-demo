from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from typing import Any

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parent
TIMESERIES_DIR = ROOT.parent / "timeseries prediction"
YIELD_DIR = ROOT / "yield model"
YIELD_DATA_PATH = YIELD_DIR / "greenhouse_crop_yields.csv"
YIELD_MODEL_PATH = YIELD_DIR / "integrated_final_yield_model.joblib"
YIELD_METRICS_PATH = YIELD_DIR / "integrated_final_yield_metrics.csv"

def load_integrated_growth_predictor():
    module_path = TIMESERIES_DIR / "predict_growth_model.py"
    spec = importlib.util.spec_from_file_location(
        "integrated_timeseries_predict_growth_model",
        module_path,
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load time-series model from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.predict_growth


predict_growth = load_integrated_growth_predictor()

TARGET = "yield_kg_per_m2"

YIELD_NUMERIC_FEATURES = [
    "days_to_maturity",
    "avg_temperature_C",
    "min_temperature_C",
    "max_temperature_C",
    "humidity_percent",
    "co2_ppm",
    "light_intensity_lux",
    "photoperiod_hours",
    "irrigation_mm",
    "fertilizer_N_kg_ha",
    "fertilizer_P_kg_ha",
    "fertilizer_K_kg_ha",
    "pest_severity",
    "soil_pH",
    "temp_range",
    "NPK_total",
    "N_ratio",
    "P_ratio",
    "K_ratio",
    "light_energy",
    "co2_light_interaction",
    "temp_light_interaction",
    "npk_light_interaction",
    "ph_stress",
]

YIELD_CATEGORICAL_FEATURES = ["variety"]


def get_value(data: dict[str, Any], *names: str, default: Any = np.nan) -> Any:
    for name in names:
        value = data.get(name)
        if value is not None:
            return value
    return default


def add_yield_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["temp_range"] = df["max_temperature_C"] - df["min_temperature_C"]
    df["NPK_total"] = (
        df["fertilizer_N_kg_ha"]
        + df["fertilizer_P_kg_ha"]
        + df["fertilizer_K_kg_ha"]
    )
    df["N_ratio"] = df["fertilizer_N_kg_ha"] / (df["NPK_total"] + 1e-6)
    df["P_ratio"] = df["fertilizer_P_kg_ha"] / (df["NPK_total"] + 1e-6)
    df["K_ratio"] = df["fertilizer_K_kg_ha"] / (df["NPK_total"] + 1e-6)
    df["light_energy"] = df["light_intensity_lux"] * df["photoperiod_hours"]
    df["co2_light_interaction"] = df["co2_ppm"] * df["light_energy"]
    df["temp_light_interaction"] = df["avg_temperature_C"] * df["light_energy"]
    df["npk_light_interaction"] = df["NPK_total"] * df["light_energy"]
    df["ph_stress"] = (df["soil_pH"] - 6.5).abs()
    return df


def load_tomato_yield_data() -> pd.DataFrame:
    if not YIELD_DATA_PATH.exists():
        raise FileNotFoundError(f"Cannot find yield data: {YIELD_DATA_PATH}")

    df = pd.read_csv(YIELD_DATA_PATH)
    df = df[df["crop_type"].astype(str).str.lower() == "tomato"].copy()
    numeric_cols = [col for col in YIELD_NUMERIC_FEATURES if col in df.columns]
    for col in numeric_cols + [TARGET]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = add_yield_features(df)
    df = df.drop_duplicates()
    df = df.dropna(subset=[TARGET])
    return df


def build_yield_model() -> Pipeline:
    numeric_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, YIELD_NUMERIC_FEATURES),
            ("cat", categorical_pipe, YIELD_CATEGORICAL_FEATURES),
        ]
    )
    model = GradientBoostingRegressor(
        learning_rate=0.05,
        n_estimators=240,
        max_depth=4,
        min_samples_leaf=4,
        subsample=0.85,
        random_state=42,
        loss="huber",
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("model", model)])


def train_yield_model() -> tuple[dict[str, Any], pd.DataFrame]:
    YIELD_DIR.mkdir(exist_ok=True)
    df = load_tomato_yield_data()
    X = df[YIELD_NUMERIC_FEATURES + YIELD_CATEGORICAL_FEATURES]
    y = df[TARGET].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = build_yield_model()
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    metrics = pd.DataFrame(
        [
            {
                "target": TARGET,
                "rows_used": len(df),
                "mae": mean_absolute_error(y_test, pred),
                "rmse": float(np.sqrt(mean_squared_error(y_test, pred))),
                "r2": r2_score(y_test, pred),
            }
        ]
    )

    bundle = {
        "model": model,
        "numeric_features": YIELD_NUMERIC_FEATURES,
        "categorical_features": YIELD_CATEGORICAL_FEATURES,
        "target": TARGET,
    }
    joblib.dump(bundle, YIELD_MODEL_PATH)
    metrics.to_csv(YIELD_METRICS_PATH, index=False, encoding="utf-8-sig")
    return bundle, metrics


def load_or_train_yield_model() -> dict[str, Any]:
    if YIELD_MODEL_PATH.exists():
        return joblib.load(YIELD_MODEL_PATH)
    bundle, _ = train_yield_model()
    return bundle


def map_to_growth_input(data: dict[str, Any]) -> dict[str, Any]:
    environment = data.get("environment", {})
    if not isinstance(environment, dict):
        environment = {}

    start_day = int(get_value(data, "start_day", "days_after_transplant", default=0))
    forecast_days = get_value(data, "forecast_days", default=None)
    if forecast_days is not None:
        maturity_day = start_day + int(forecast_days)
    else:
        maturity_day = int(get_value(data, "maturity_day", default=66))

    return {
        "ec": data["ec"],
        "light": data["light"],
        "start_day": start_day,
        "maturity_day": maturity_day,
        "environment": {
            "t_air_mean": float(
                get_value(
                    environment,
                    "t_air_mean",
                    default=get_value(data, "t_air_mean", "avg_temperature_C", default=25),
                )
            ),
            "rh_mean": float(
                get_value(
                    environment,
                    "rh_mean",
                    default=get_value(data, "rh_mean", "humidity_percent", default=70),
                )
            ),
            "co2_mean": float(
                get_value(
                    environment,
                    "co2_mean",
                    default=get_value(data, "co2_mean", "co2_ppm", default=800),
                )
            ),
            "par_lamp_daily": float(
                get_value(
                    environment,
                    "par_lamp_daily",
                    default=get_value(data, "par_lamp_daily", default=560),
                )
            ),
            "light_on_hours_daily": float(
                get_value(
                    environment,
                    "light_on_hours_daily",
                    default=get_value(data, "light_on_hours_daily", "photoperiod_hours", default=8),
                )
            ),
        },
    }


def map_to_yield_input(data: dict[str, Any], growth_result: dict[str, Any]) -> pd.DataFrame:
    maturity_day = int(growth_result["maturity_day"])
    avg_temp = float(get_value(data, "avg_temperature_C", "t_air_mean", default=25))
    min_temp = float(get_value(data, "min_temperature_C", "t_air_min", default=avg_temp - 2))
    max_temp = float(get_value(data, "max_temperature_C", "t_air_max", default=avg_temp + 2))

    row = {
        "days_to_maturity": maturity_day,
        "avg_temperature_C": avg_temp,
        "min_temperature_C": min_temp,
        "max_temperature_C": max_temp,
        "humidity_percent": get_value(data, "humidity_percent", "rh_mean", default=70),
        "co2_ppm": get_value(data, "co2_ppm", "co2_mean", default=800),
        "light_intensity_lux": get_value(data, "light_intensity_lux", default=30000),
        "photoperiod_hours": get_value(data, "photoperiod_hours", "light_on_hours_daily", default=12),
        "irrigation_mm": get_value(data, "irrigation_mm", default=7),
        "fertilizer_N_kg_ha": get_value(data, "fertilizer_N_kg_ha", default=140),
        "fertilizer_P_kg_ha": get_value(data, "fertilizer_P_kg_ha", default=60),
        "fertilizer_K_kg_ha": get_value(data, "fertilizer_K_kg_ha", default=140),
        "pest_severity": get_value(data, "pest_severity", default=1),
        "soil_pH": get_value(data, "soil_pH", "pH", default=6.5),
        "variety": get_value(data, "variety", default="Roma"),
    }
    return add_yield_features(pd.DataFrame([row]))


def predict_integrated_tomato(data: dict[str, Any]) -> dict[str, Any]:
    growth_result = predict_growth(map_to_growth_input(data))
    yield_bundle = load_or_train_yield_model()
    yield_input = map_to_yield_input(data, growth_result)
    yield_pred = float(yield_bundle["model"].predict(yield_input)[0])

    result = dict(growth_result)
    result["final_yield_prediction"] = {
        "yield_kg_per_m2": round(max(yield_pred, 0.0), 3),
        "model_path": str(YIELD_MODEL_PATH),
        "dataset": str(YIELD_DATA_PATH),
    }
    result["mapping_note"] = (
        "Growth model and final-yield model share environment and management inputs. "
        "EC/light are used by the time-series model; final yield uses average climate, "
        "fertilizer, irrigation, pest, pH, variety, and engineered interactions."
    )
    return result


def print_mapping_design() -> None:
    rows = [
        ("ec", "time-series only", "No direct column in synthetic yield data."),
        ("light", "time-series only", "Yield model uses light_intensity_lux and photoperiod_hours."),
        ("start_day", "time-series only", "Yield model receives maturity_day as days_to_maturity."),
        ("t_air_mean / avg_temperature_C", "both", "Direct climate mapping."),
        ("rh_mean / humidity_percent", "both", "Direct humidity mapping."),
        ("co2_mean / co2_ppm", "both", "Direct CO2 mapping."),
        ("photoperiod_hours", "both", "Mapped to light_on_hours_daily for growth if needed."),
        ("light_intensity_lux", "yield only", "No exact PAR-to-lux conversion is forced."),
        ("fertilizer N/P/K", "yield only", "Used with NPK ratios and interaction features."),
        ("soil_pH, irrigation, pest", "yield only", "Not present in current growth time-series model."),
    ]
    print("\nMapping design:")
    for name, scope, note in rows:
        print(f"- {name}: {scope}. {note}")


def demo() -> None:
    bundle, metrics = train_yield_model()
    print_mapping_design()

    sample = {
        "ec": "EC6",
        "light": "high light",
        "start_day": 15,
        "maturity_day": 66,
        "variety": "Roma",
        "avg_temperature_C": 25,
        "min_temperature_C": 22,
        "max_temperature_C": 28,
        "humidity_percent": 70,
        "co2_ppm": 800,
        "light_intensity_lux": 30000,
        "photoperiod_hours": 12,
        "irrigation_mm": 7,
        "fertilizer_N_kg_ha": 140,
        "fertilizer_P_kg_ha": 60,
        "fertilizer_K_kg_ha": 140,
        "pest_severity": 1,
        "soil_pH": 6.5,
        "environment": {
            "t_air_mean": 24.8,
            "rh_mean": 68.5,
            "co2_mean": 440.0,
            "par_lamp_daily": 560.0,
            "light_on_hours_daily": 8.0,
        },
    }

    result = predict_integrated_tomato(sample)
    print("\nYield model input features:")
    print(bundle["numeric_features"] + bundle["categorical_features"])
    print("\nYield model metrics:")
    print(metrics.round(4).to_string(index=False))
    print("\nIntegrated prediction example:")
    preview = dict(result)
    preview["predictions"] = result["predictions"][:3] + ["..."] + result["predictions"][-3:]
    print(preview)


if __name__ == "__main__":
    demo()
