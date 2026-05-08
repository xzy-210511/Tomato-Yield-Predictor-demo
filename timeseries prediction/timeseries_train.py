from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "cleaned_data"
OUT = ROOT / "model_outputs"

DEFAULT_MATURITY_DAY = 66

NUMERIC_FEATURES = [
    "days_after_transplant",
    "current_plant_height_cm",
    "current_num_leaves",
    "t_air_mean",
    "rh_mean",
    "co2_mean",
    "par_lamp_sum",
    "light_on_hours",
    "t_air_mean_7d",
    "par_lamp_sum_7d",
]

CATEGORICAL_FEATURES = [
    "ec",
    "light",
]

NS_NUMERIC_FEATURES = [
    "days_after_transplant",
    "plant_height_cm",
    "num_leaves",
    "t_air_mean",
    "rh_mean",
    "co2_mean",
    "par_lamp_daily",
    "light_on_hours_daily",
    "par_lamp_sum",
    "light_on_hours",
    "t_air_mean_7d",
    "par_lamp_sum_7d",
    "ec_limit",
]

NS_CATEGORICAL_FEATURES = [
    "ec",
    "light",
    "ns_policy",
]

TARGETS = [
    "next_plant_height_cm",
    "next_num_leaves",
]

NS_TARGETS = [
    "ns_new_per_plant_l",
    "ns_added_per_plant_l",
    "ns_residual_per_plant_l",
]

TARGET_TO_OUTPUT = {
    "next_plant_height_cm": "plant_height_cm",
    "next_num_leaves": "num_leaves",
}

EC_TO_NS_POLICY = {
    "EC3": {"ns_policy": "low", "ec_limit": 5.0},
    "EC6": {"ns_policy": "high", "ec_limit": 10.0},
}

BACKEND_REQUIRED_INPUT = {
    "ec": "EC level, e.g. EC3 or EC6",
    "light": "Light treatment, e.g. high light, med light, low light, no light",
    "environment.t_air_mean": "Locked daily mean air temperature",
    "environment.rh_mean": "Locked daily mean relative humidity",
    "environment.co2_mean": "Locked daily mean CO2 concentration",
    "environment.par_lamp_daily": "Locked daily lamp PAR",
    "environment.light_on_hours_daily": "Locked daily lamp-on hours",
}


def numeric(df: pd.DataFrame, column: str) -> pd.Series:
    if column not in df:
        return pd.Series(np.nan, index=df.index)
    return pd.to_numeric(df[column], errors="coerce")


def load_crop_measurements() -> pd.DataFrame:
    path = DATA / "crop_measurements_clean.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Run datacleaning.py first.")

    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["date"])
    df["plant_height_cm"] = numeric(df, "plantheigth")
    df["num_leaves"] = numeric(df, "num_leaves")
    if "days_after_transplant" not in df:
        raise ValueError(
            "crop_measurements_clean.csv must contain days_after_transplant. "
            "Run the latest datacleaning.py first."
        )
    df["days_after_transplant"] = numeric(df, "days_after_transplant")
    return df


def aggregate_climate() -> pd.DataFrame:
    path = DATA / "climate_timeseries_clean.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Run datacleaning.py first.")

    climate = pd.read_csv(path)
    climate["datetime"] = pd.to_datetime(climate["datetime"])
    climate["date"] = pd.to_datetime(climate["date"])
    if "days_after_transplant" not in climate:
        raise ValueError(
            "climate_timeseries_clean.csv must contain days_after_transplant. "
            "Run the latest datacleaning.py first."
        )
    climate["days_after_transplant"] = numeric(climate, "days_after_transplant")

    for column in ["t_air", "rh", "co2", "ligth_on", "part1", "par2", "par3", "par4"]:
        climate[column] = pd.to_numeric(climate[column], errors="coerce")

    climate["par_lamp"] = climate[["part1", "par2", "par3", "par4"]].mean(axis=1)
    climate["light_on_fraction"] = climate["ligth_on"].clip(lower=0, upper=1)

    daily = climate.groupby("days_after_transplant").agg(
        date=("date", "first"),
        t_air_mean=("t_air", "mean"),
        rh_mean=("rh", "mean"),
        co2_mean=("co2", "mean"),
        par_lamp_daily=("par_lamp", "sum"),
        light_on_hours_daily=("light_on_fraction", lambda s: s.sum() * 5 / 60),
    )
    daily["par_lamp_sum"] = daily["par_lamp_daily"].cumsum()
    daily["light_on_hours"] = daily["light_on_hours_daily"].cumsum()
    daily["t_air_mean_7d"] = daily["t_air_mean"].rolling(7, min_periods=1).sum()
    daily["par_lamp_sum_7d"] = daily["par_lamp_daily"].rolling(7, min_periods=1).sum()

    return daily.reset_index()[
        [
            "days_after_transplant",
            "date",
            "t_air_mean",
            "rh_mean",
            "co2_mean",
            "par_lamp_daily",
            "light_on_hours_daily",
            "par_lamp_sum",
            "light_on_hours",
            "t_air_mean_7d",
            "par_lamp_sum_7d",
        ]
    ]


def load_ns_training_table() -> pd.DataFrame:
    path = DATA / "mapped_ns_training_table.csv"
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}. Run datacleaning.py first.")

    df = pd.read_csv(path)
    for column in NS_NUMERIC_FEATURES + NS_TARGETS:
        df[column] = numeric(df, column)
    return df.dropna(subset=NS_NUMERIC_FEATURES + NS_CATEGORICAL_FEATURES + NS_TARGETS)


def aggregate_observations(crop: pd.DataFrame) -> pd.DataFrame:
    return (
        crop.groupby(["days_after_transplant", "treatment", "ec", "light"], as_index=False)[
            ["plant_height_cm", "num_leaves"]
        ]
        .mean()
        .sort_values(["treatment", "days_after_transplant"])
    )


def build_transition_training_table(
    crop: pd.DataFrame, climate: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    observations = aggregate_observations(crop)
    climate_features = climate.drop(columns=["date"], errors="ignore")
    daily_states: list[pd.DataFrame] = []

    for treatment, group in observations.groupby("treatment"):
        group = group.sort_values("days_after_transplant")
        days = np.arange(
            int(group["days_after_transplant"].min()),
            int(group["days_after_transplant"].max()) + 1,
        )
        state = pd.DataFrame(
            {
                "days_after_transplant": days,
                "treatment": treatment,
                "ec": group["ec"].iloc[0],
                "light": group["light"].iloc[0],
            }
        )
        for target in ["plant_height_cm", "num_leaves"]:
            target_group = group.dropna(subset=[target])
            state[target] = np.interp(
                days,
                target_group["days_after_transplant"].to_numpy(dtype=float),
                target_group[target].to_numpy(dtype=float),
            )
        daily_states.append(state)

    daily_state = pd.concat(daily_states, ignore_index=True)
    daily_state = daily_state.merge(
        climate_features, on="days_after_transplant", how="left"
    )

    transitions: list[pd.DataFrame] = []
    env_cols = [
        "t_air_mean",
        "rh_mean",
        "co2_mean",
        "par_lamp_daily",
        "light_on_hours_daily",
        "par_lamp_sum",
        "light_on_hours",
        "t_air_mean_7d",
        "par_lamp_sum_7d",
    ]
    for _, group in daily_state.groupby("treatment"):
        group = group.sort_values("days_after_transplant").copy()
        next_group = group.shift(-1)
        transition = group.iloc[:-1].copy()
        transition["days_after_transplant"] = next_group.iloc[:-1][
            "days_after_transplant"
        ].to_numpy()
        transition["current_plant_height_cm"] = group.iloc[:-1][
            "plant_height_cm"
        ].to_numpy()
        transition["current_num_leaves"] = group.iloc[:-1]["num_leaves"].to_numpy()
        transition["next_plant_height_cm"] = next_group.iloc[:-1][
            "plant_height_cm"
        ].to_numpy()
        transition["next_num_leaves"] = next_group.iloc[:-1]["num_leaves"].to_numpy()
        for column in env_cols:
            transition[column] = next_group.iloc[:-1][column].to_numpy()
        transitions.append(transition)

    training = pd.concat(transitions, ignore_index=True)
    training = training.dropna(subset=TARGETS + NUMERIC_FEATURES + CATEGORICAL_FEATURES)
    return training, daily_state


def make_model() -> Pipeline:
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
            ("num", numeric_pipe, NUMERIC_FEATURES),
            ("cat", categorical_pipe, CATEGORICAL_FEATURES),
        ]
    )
    regressor = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.04,
        max_depth=3,
        min_samples_leaf=3,
        random_state=42,
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("model", regressor)])


def make_ns_model() -> Pipeline:
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
            ("num", numeric_pipe, NS_NUMERIC_FEATURES),
            ("cat", categorical_pipe, NS_CATEGORICAL_FEATURES),
        ]
    )
    regressor = GradientBoostingRegressor(
        n_estimators=180,
        learning_rate=0.04,
        max_depth=2,
        min_samples_leaf=2,
        random_state=42,
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("model", regressor)])


def train_models(training: pd.DataFrame) -> tuple[dict[str, Pipeline], pd.DataFrame]:
    models: dict[str, Pipeline] = {}
    rows: list[dict[str, Any]] = []
    feature_columns = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    groups_all = training["treatment"].astype(str)

    for target in TARGETS:
        subset = training.dropna(subset=[target])
        X = subset[feature_columns]
        y = subset[target].astype(float)
        groups = groups_all.loc[subset.index]
        cv = GroupKFold(n_splits=min(5, groups.nunique()))

        model = make_model()
        pred = cross_val_predict(model, X, y, groups=groups, cv=cv)
        mae = mean_absolute_error(y, pred)
        r2 = r2_score(y, pred)
        model.fit(X, y)
        models[target] = model
        rows.append(
            {
                "target": TARGET_TO_OUTPUT[target],
                "rows_used": len(subset),
                "cv_group_column": "treatment",
                "cv_group_splits": min(5, groups.nunique()),
                "mae": mae,
                "r2": r2,
            }
        )
    return models, pd.DataFrame(rows)


def train_ns_models(ns_training: pd.DataFrame) -> tuple[dict[str, Pipeline], pd.DataFrame]:
    models: dict[str, Pipeline] = {}
    rows: list[dict[str, Any]] = []
    feature_columns = NS_NUMERIC_FEATURES + NS_CATEGORICAL_FEATURES
    groups_all = ns_training["treatment"].astype(str)

    for target in NS_TARGETS:
        subset = ns_training.dropna(subset=[target])
        X = subset[feature_columns]
        y = subset[target].astype(float)
        groups = groups_all.loc[subset.index]
        cv_splits = min(5, groups.nunique())

        model = make_ns_model()
        if cv_splits >= 2 and y.nunique() > 1:
            pred = cross_val_predict(
                model,
                X,
                y,
                groups=groups,
                cv=GroupKFold(n_splits=cv_splits),
            )
            mae = mean_absolute_error(y, pred)
            r2 = r2_score(y, pred)
        else:
            mae = 0.0
            r2 = 1.0

        model.fit(X, y)
        models[target] = model
        rows.append(
            {
                "target": target,
                "rows_used": len(subset),
                "cv_group_column": "treatment",
                "cv_group_splits": cv_splits,
                "mae": mae,
                "r2": r2,
            }
        )
    return models, pd.DataFrame(rows)


def initial_state_lookup(daily_state: pd.DataFrame) -> dict[str, dict[str, Any]]:
    first_states = (
        daily_state.sort_values("days_after_transplant")
        .groupby("treatment", as_index=False)
        .first()[
            [
                "treatment",
                "ec",
                "light",
                "days_after_transplant",
                "plant_height_cm",
                "num_leaves",
            ]
        ]
    )
    first_states["key"] = first_states["ec"].astype(str) + "|" + first_states["light"].astype(str)
    return {
        row["key"]: {
            "treatment": row["treatment"],
            "start_day": int(row["days_after_transplant"]),
            "plant_height_cm": float(row["plant_height_cm"]),
            "num_leaves": float(row["num_leaves"]),
        }
        for _, row in first_states.iterrows()
    }


def save_model(
    models: dict[str, Pipeline],
    metrics: pd.DataFrame,
    training: pd.DataFrame,
    daily_state: pd.DataFrame,
    ns_models: dict[str, Pipeline],
    ns_metrics: pd.DataFrame,
    ns_training: pd.DataFrame,
) -> None:
    OUT.mkdir(exist_ok=True)
    training.to_csv(OUT / "timeseries_transition_training_table.csv", index=False, encoding="utf-8-sig")
    metrics.to_csv(OUT / "timeseries_model_metrics.csv", index=False, encoding="utf-8-sig")
    ns_training.to_csv(OUT / "ns_training_table.csv", index=False, encoding="utf-8-sig")
    ns_metrics.to_csv(OUT / "ns_model_metrics.csv", index=False, encoding="utf-8-sig")

    bundle = {
        "model_type": "recursive_one_step_time_series_forecaster",
        "models": models,
        "ns_models": ns_models,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "ns_numeric_features": NS_NUMERIC_FEATURES,
        "ns_categorical_features": NS_CATEGORICAL_FEATURES,
        "targets": TARGETS,
        "ns_targets": NS_TARGETS,
        "ec_to_ns_policy": EC_TO_NS_POLICY,
        "backend_required_input": BACKEND_REQUIRED_INPUT,
        "default_maturity_day": DEFAULT_MATURITY_DAY,
        "initial_state_by_treatment": initial_state_lookup(daily_state),
    }
    joblib.dump(bundle, OUT / "recursive_growth_forecaster.joblib")

    summary = {
        "model_type": bundle["model_type"],
        "backend_required_input": BACKEND_REQUIRED_INPUT,
        "internal_model_features": {
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
        },
        "outputs": {
            "plant_height_cm": "Recursive predicted plant height in cm",
            "num_leaves": "Recursive predicted number of leaves",
            "ns_new_per_plant_l": "Predicted fresh nutrient solution in liters per plant",
            "ns_added_per_plant_l": "Predicted added nutrient solution in liters per plant",
            "ns_residual_per_plant_l": "Predicted residual nutrient solution in liters per plant",
        },
        "metrics": metrics.to_dict(orient="records"),
        "ns_metrics": ns_metrics.to_dict(orient="records"),
        "ec_to_ns_policy": EC_TO_NS_POLICY,
    }
    (OUT / "timeseries_model_summary.json").write_text(
        json.dumps(summary, indent=2, default=str), encoding="utf-8"
    )


def build_locked_environment_series(
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


def ns_environment_row(env_row: dict[str, Any]) -> dict[str, Any]:
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


def predict_next_from_bundle(
    bundle: dict[str, Any],
    row: dict[str, Any],
) -> dict[str, Any]:
    feature_columns = bundle["numeric_features"] + bundle["categorical_features"]
    features = pd.DataFrame([row])[feature_columns]
    models = bundle["models"]

    height = float(models["next_plant_height_cm"].predict(features)[0])
    leaves = float(models["next_num_leaves"].predict(features)[0])
    return {
        "plant_height_cm": round(max(height, 0.0), 3),
        "num_leaves": round(max(leaves, 0.0), 3),
    }


def predict_ns_from_bundle(
    bundle: dict[str, Any],
    row: dict[str, Any],
) -> dict[str, Any]:
    ns_models = bundle.get("ns_models", {})
    if not ns_models:
        return {}

    feature_columns = bundle["ns_numeric_features"] + bundle["ns_categorical_features"]
    features = pd.DataFrame([row])[feature_columns]
    prediction = {
        target: round(max(float(model.predict(features)[0]), 0.0), 3)
        for target, model in ns_models.items()
    }
    ns_new = prediction.get("ns_new_per_plant_l", 0.0)
    ns_added = prediction.get("ns_added_per_plant_l", 0.0)
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
        **prediction,
        "ns_policy": row["ns_policy"],
        "ec_limit": float(row["ec_limit"]),
        "ns_action": action,
        "ns_recommendation": recommendation,
    }


def run_recursive_demo(
    bundle_path: Path = OUT / "recursive_growth_forecaster.joblib",
) -> dict[str, Any]:
    bundle = joblib.load(bundle_path)
    ec = "EC6"
    light = "high light"
    key = f"{ec}|{light}"
    initial_state = bundle["initial_state_by_treatment"][key]
    start_day = int(initial_state["start_day"])
    maturity_day = int(bundle.get("default_maturity_day", DEFAULT_MATURITY_DAY))
    environment = {
        "t_air_mean": 24.8,
        "rh_mean": 68.5,
        "co2_mean": 440.0,
        "par_lamp_daily": 560.0,
        "light_on_hours_daily": 8.0,
    }
    daily_environment = build_locked_environment_series(
        start_day=start_day,
        maturity_day=maturity_day,
        environment=environment,
    )

    current_height = float(initial_state["plant_height_cm"])
    current_leaves = float(initial_state["num_leaves"])
    ns_mapping = bundle["ec_to_ns_policy"][ec]
    predictions: list[dict[str, Any]] = [
        {
            "days_after_transplant": start_day,
            "ec": ec,
            "light": light,
            "prediction": {
                "plant_height_cm": round(current_height, 3),
                "num_leaves": round(current_leaves, 3),
            },
            "source": "initial_state",
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
        prediction = predict_next_from_bundle(bundle, feature_row)
        ns_row = {
            **ns_environment_row(env_row),
            "plant_height_cm": prediction["plant_height_cm"],
            "num_leaves": prediction["num_leaves"],
            "ec": ec,
            "light": light,
            **ns_mapping,
        }
        ns_prediction = predict_ns_from_bundle(bundle, ns_row)
        predictions.append(
            {
                "days_after_transplant": int(env_row["days_after_transplant"]),
                "ec": ec,
                "light": light,
                "prediction": prediction,
                "ns_prediction": ns_prediction,
            }
        )
        current_height = prediction["plant_height_cm"]
        current_leaves = prediction["num_leaves"]

    return {
        "start_day": start_day,
        "maturity_day": maturity_day,
        "ec": ec,
        "light": light,
        "prediction_count": len(predictions),
        "predictions": predictions,
    }


def main() -> None:
    crop = load_crop_measurements()
    climate = aggregate_climate()
    ns_training = load_ns_training_table()
    training, daily_state = build_transition_training_table(crop, climate)
    models, metrics = train_models(training)
    ns_models, ns_metrics = train_ns_models(ns_training)
    save_model(models, metrics, training, daily_state, ns_models, ns_metrics, ns_training)

    demo = run_recursive_demo()
    first = demo["predictions"][0]
    middle = demo["predictions"][len(demo["predictions"]) // 2]
    final = demo["predictions"][-1]

    print("Recursive time-series model training complete.")
    print("\nBackend required input variables:")
    for name, desc in BACKEND_REQUIRED_INPUT.items():
        print(f"  {name}: {desc}")

    print("\nInternal recursive model features:")
    print(f"  Numeric: {NUMERIC_FEATURES}")
    print(f"  Categorical: {CATEGORICAL_FEATURES}")

    print("\nModel outputs:")
    print("  plant_height_cm: predicted plant height in cm")
    print("  num_leaves: predicted number of leaves")
    print("  ns_added_per_plant_l: predicted nutrient solution addition in liters per plant")
    print("  ns_new_per_plant_l: predicted fresh nutrient solution replacement in liters per plant")
    print("  ns_residual_per_plant_l: predicted residual nutrient solution in liters per plant")

    print("\nCross-validation metrics:")
    print(metrics.round(3).to_string(index=False))
    print("\nNS model cross-validation metrics:")
    print(ns_metrics.round(3).to_string(index=False))

    print("\nRecursive prediction example:")
    print("  first :", first)
    print("  middle:", middle)
    print("  final :", final)
    print(f"\nFiles written to: {OUT}")


if __name__ == "__main__":
    main()
