from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "model_outputs" / "recursive_growth_forecaster.joblib"
DEFAULT_MATURITY_DAY = 66


class RecursiveGrowthForecaster:
    def __init__(self, model_path: str | Path = MODEL_PATH) -> None:
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {self.model_path}. Run timeseries_train.py first."
            )

        self.bundle = joblib.load(self.model_path)
        self.models = self.bundle["models"]
        self.ns_models = self.bundle.get("ns_models", {})
        self.numeric_features = self.bundle["numeric_features"]
        self.categorical_features = self.bundle["categorical_features"]
        self.ns_numeric_features = self.bundle.get("ns_numeric_features", [])
        self.ns_categorical_features = self.bundle.get("ns_categorical_features", [])
        self.feature_columns = self.numeric_features + self.categorical_features
        self.ns_feature_columns = self.ns_numeric_features + self.ns_categorical_features
        self.initial_state_by_treatment = self.bundle.get("initial_state_by_treatment", {})
        self.ec_to_ns_policy = self.bundle.get("ec_to_ns_policy", {})
        self.default_maturity_day = int(
            self.bundle.get("default_maturity_day", DEFAULT_MATURITY_DAY)
        )

    def _infer_initial_state(self, ec: str, light: str) -> dict[str, Any]:
        key = f"{ec}|{light}"
        if key not in self.initial_state_by_treatment:
            raise ValueError(
                f"No default initial state found for ec={ec!r}, light={light!r}. "
                "Provide initial_state manually."
            )
        return self.initial_state_by_treatment[key]

    @staticmethod
    def _build_locked_environment_series(
        start_day: int,
        maturity_day: int,
        environment: dict[str, Any],
    ) -> list[dict[str, Any]]:
        t_air_mean = float(environment["t_air_mean"])
        rh_mean = float(environment["rh_mean"])
        co2_mean = float(environment["co2_mean"])
        par_lamp_daily = float(environment["par_lamp_daily"])
        light_on_hours_daily = float(environment["light_on_hours_daily"])

        rows: list[dict[str, Any]] = []
        for day in range(start_day + 1, maturity_day + 1):
            elapsed = day - start_day
            recent_days = min(7, elapsed)
            rows.append(
                {
                    "days_after_transplant": day,
                    "t_air_mean": t_air_mean,
                    "rh_mean": rh_mean,
                    "co2_mean": co2_mean,
                    "par_lamp_daily": par_lamp_daily,
                    "light_on_hours_daily": light_on_hours_daily,
                    "par_lamp_sum": elapsed * par_lamp_daily,
                    "light_on_hours": elapsed * light_on_hours_daily,
                    "t_air_mean_7d": t_air_mean * recent_days,
                    "par_lamp_sum_7d": par_lamp_daily * recent_days,
                }
            )
        return rows

    def _predict_next(self, feature_row: dict[str, Any]) -> dict[str, float]:
        features = pd.DataFrame([feature_row])[self.feature_columns]
        height = float(self.models["next_plant_height_cm"].predict(features)[0])
        leaves = float(self.models["next_num_leaves"].predict(features)[0])
        return {
            "plant_height_cm": round(max(height, 0.0), 3),
            "num_leaves": round(max(leaves, 0.0), 3),
        }

    @staticmethod
    def _ns_environment_row(env_row: dict[str, Any]) -> dict[str, Any]:
        ns_row = dict(env_row)
        day = max(int(ns_row["days_after_transplant"]), 0)
        recent_days = min(7, day)
        par_lamp_daily = float(ns_row.get("par_lamp_daily", 0.0))
        light_on_hours_daily = float(ns_row.get("light_on_hours_daily", 0.0))
        ns_row["par_lamp_sum"] = day * par_lamp_daily
        ns_row["light_on_hours"] = day * light_on_hours_daily
        ns_row["t_air_mean_7d"] = float(ns_row.get("t_air_mean", 0.0)) * recent_days
        ns_row["par_lamp_sum_7d"] = par_lamp_daily * recent_days
        return ns_row

    def _predict_ns(
        self,
        env_row: dict[str, Any],
        ec: str,
        light: str,
        plant_height_cm: float,
        num_leaves: float,
    ) -> dict[str, Any]:
        if not self.ns_models:
            return {}
        if ec not in self.ec_to_ns_policy:
            raise ValueError(f"No NS policy mapping found for ec={ec!r}.")

        ns_row = {
            **self._ns_environment_row(env_row),
            "plant_height_cm": plant_height_cm,
            "num_leaves": num_leaves,
            "ec": ec,
            "light": light,
            **self.ec_to_ns_policy[ec],
        }
        features = pd.DataFrame([ns_row])[self.ns_feature_columns]
        values = {
            target: round(max(float(model.predict(features)[0]), 0.0), 3)
            for target, model in self.ns_models.items()
        }
        ns_new = values.get("ns_new_per_plant_l", 0.0)
        ns_added = values.get("ns_added_per_plant_l", 0.0)

        if ns_new > 0.05:
            action = "replace"
            recommendation = f"Replace solution and add {ns_new:g} L fresh nutrient solution per plant"
        elif ns_added > 0.05:
            action = "add"
            recommendation = f"Add {ns_added:g} L nutrient solution per plant"
        else:
            action = "none"
            recommendation = "No nutrient solution addition scheduled"

        return {
            **values,
            "ns_policy": ns_row["ns_policy"],
            "ec_limit": float(ns_row["ec_limit"]),
            "ns_action": action,
            "ns_recommendation": recommendation,
        }

    def predict(self, input_data: dict[str, Any]) -> dict[str, Any]:
        ec = input_data["ec"]
        light = input_data["light"]
        environment = input_data["environment"]

        inferred = self._infer_initial_state(ec, light)
        start_day = int(input_data.get("start_day", inferred["start_day"]))
        maturity_day = int(input_data.get("maturity_day", self.default_maturity_day))

        initial_state = input_data.get("initial_state")
        if initial_state is None:
            initial_state = {
                "plant_height_cm": inferred["plant_height_cm"],
                "num_leaves": inferred["num_leaves"],
            }
            initial_day = int(inferred["start_day"])
        else:
            initial_day = start_day

        current_height = float(initial_state["plant_height_cm"])
        current_leaves = float(initial_state["num_leaves"])

        forecast_start_day = max(start_day, initial_day)
        pre_initial_predictions: list[dict[str, Any]] = []
        if start_day < initial_day:
            pre_initial_environment = self._build_locked_environment_series(
                start_day=start_day - 1,
                maturity_day=initial_day - 1,
                environment=environment,
            )
            for env_row in pre_initial_environment:
                pre_initial_predictions.append(
                    {
                        "days_after_transplant": int(env_row["days_after_transplant"]),
                        "plant_height_cm": round(current_height, 3),
                        "num_leaves": round(current_leaves, 3),
                        **self._predict_ns(
                            env_row,
                            ec,
                            light,
                            current_height,
                            current_leaves,
                        ),
                        "source": "ns_prediction_before_default_initial_state",
                    }
                )

        if initial_day < start_day:
            warmup_environment = self._build_locked_environment_series(
                start_day=initial_day,
                maturity_day=start_day,
                environment=environment,
            )
            for env_row in warmup_environment:
                feature_row = {
                    **env_row,
                    "current_plant_height_cm": current_height,
                    "current_num_leaves": current_leaves,
                    "ec": ec,
                    "light": light,
                }
                warmup_prediction = self._predict_next(feature_row)
                current_height = warmup_prediction["plant_height_cm"]
                current_leaves = warmup_prediction["num_leaves"]

        daily_environment = self._build_locked_environment_series(
            start_day=forecast_start_day,
            maturity_day=maturity_day,
            environment=environment,
        )

        predictions: list[dict[str, Any]] = [
            *pre_initial_predictions,
            {
                "days_after_transplant": forecast_start_day,
                "plant_height_cm": round(current_height, 3),
                "num_leaves": round(current_leaves, 3),
                **self._predict_ns(
                    {
                        "days_after_transplant": forecast_start_day,
                        "t_air_mean": float(environment["t_air_mean"]),
                        "rh_mean": float(environment["rh_mean"]),
                        "co2_mean": float(environment["co2_mean"]),
                        "par_lamp_daily": float(environment["par_lamp_daily"]),
                        "light_on_hours_daily": float(environment["light_on_hours_daily"]),
                        "par_lamp_sum": 0.0,
                        "light_on_hours": 0.0,
                        "t_air_mean_7d": 0.0,
                        "par_lamp_sum_7d": 0.0,
                    },
                    ec,
                    light,
                    current_height,
                    current_leaves,
                ),
                "source": "provided_initial_state"
                if "initial_state" in input_data
                else "model_warmup_from_default_initial_state",
            }
        ]

        for env_row in daily_environment:
            feature_row = {
                **env_row,
                "current_plant_height_cm": current_height,
                "current_num_leaves": current_leaves,
                "ec": ec,
                "light": light,
            }
            prediction = self._predict_next(feature_row)
            predictions.append(
                {
                    "days_after_transplant": int(env_row["days_after_transplant"]),
                    **prediction,
                    **self._predict_ns(
                        env_row,
                        ec,
                        light,
                        prediction["plant_height_cm"],
                        prediction["num_leaves"],
                    ),
                }
            )
            current_height = prediction["plant_height_cm"]
            current_leaves = prediction["num_leaves"]

        return {
            "ec": ec,
            "light": light,
            "start_day": start_day,
            "maturity_day": maturity_day,
            "state_start_day": initial_day,
            "start_state_source": predictions[0]["source"],
            "prediction_count": len(predictions),
            "predictions": predictions,
        }


_FORECASTER: RecursiveGrowthForecaster | None = None


def predict_growth(input_data: dict[str, Any]) -> dict[str, Any]:
    global _FORECASTER
    if _FORECASTER is None:
        _FORECASTER = RecursiveGrowthForecaster()
    return _FORECASTER.predict(input_data)
