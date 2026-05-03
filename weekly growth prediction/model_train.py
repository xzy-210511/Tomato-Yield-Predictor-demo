from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from tomato_data_clean import (
    DATA_PATH,
    ENVIRONMENT_COLS,
    GROWTH_TARGET_COLS,
    OUTPUT_DIR,
    PLANTING_DATE,
    aggregate_weekly,
    clean_dataset,
    clean_weekly,
    read_raw_data,
)


RANDOM_STATE = 42
MODEL_PATH = OUTPUT_DIR / "tomato_next_week_growth_model.joblib"

EXCLUDED_INPUT_COLS = {
    "Plant",
    "x",
    "y",
    "Laboratory",
    "Crop",
    "Date",
    "Chlorophyll (SPAD)",
    "Number of Flowers",
    "Number of Fruits",
    "Numer of Harvested Fruits",
    "Total Weight of Harvest Fruits",
    "Width Size (mm)",
    "Height Size (mm)",
}


def load_cleaned_data() -> pd.DataFrame:
    raw_df = read_raw_data(DATA_PATH)
    weekly_df = aggregate_weekly(raw_df)
    return clean_weekly(weekly_df)


def add_future_targets_and_features(cleaned_df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    df = cleaned_df.sort_values(["Plant", "Date"]).copy()

    for col in [col for col in ENVIRONMENT_COLS if col in df.columns]:
        df[col] = (
            df.groupby("Plant")[col]
            .transform(lambda s: s.interpolate(limit_direction="both").ffill().bfill())
        )
        if df[col].isna().any():
            df[col] = df[col].fillna(df[col].median())

    target_cols = [col for col in GROWTH_TARGET_COLS if col in df.columns]
    for col in target_cols:
        df[f"next_{col}"] = df.groupby("Plant")[col].shift(-1)

    df["week_index"] = ((df["Date"] - PLANTING_DATE).dt.days // 7 + 1).astype(int)
    future_cols = [f"next_{col}" for col in target_cols]
    df = df.dropna(subset=future_cols).reset_index(drop=True)
    return df, future_cols


def split_features(model_df: pd.DataFrame, future_cols: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    allowed_exact = set(ENVIRONMENT_COLS + ["Treatment", "fertilizer_applied", "week_index"])
    feature_cols = [
        col
        for col in model_df.columns
        if col not in EXCLUDED_INPUT_COLS
        and col not in future_cols
        and col in allowed_exact
    ]
    X = model_df[feature_cols].copy()
    y = model_df[future_cols]
    return X, y


def augment_training_data(
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
    copies: int = 1,
    noise_scale: float = 0.03,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(RANDOM_STATE)
    noisy_cols = [
        col
        for col in X_train.select_dtypes(include=[np.number]).columns
        if col in ENVIRONMENT_COLS
    ]

    augmented_x = [X_train]
    augmented_y = [y_train]
    std = X_train[noisy_cols].std(numeric_only=True).replace(0, np.nan)

    for _ in range(copies):
        noisy = X_train.copy()
        for col in noisy_cols:
            if pd.notna(std[col]):
                noise = rng.normal(0, std[col] * noise_scale, size=len(noisy))
                noisy[col] = (noisy[col] + noise).clip(lower=0)
        augmented_x.append(noisy)
        augmented_y.append(y_train.copy())

    return pd.concat(augmented_x, ignore_index=True), pd.concat(augmented_y, ignore_index=True)


def build_preprocessor(X: pd.DataFrame) -> ColumnTransformer:
    numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_features = X.select_dtypes(exclude=[np.number]).columns.tolist()

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )


def train_model(model_df: pd.DataFrame, future_cols: list[str]) -> tuple[pd.DataFrame, pd.DataFrame, list[str]]:
    X, y = split_features(model_df, future_cols)
    groups = model_df["Plant"]
    train_idx, test_idx = next(
        GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE).split(X, y, groups)
    )

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
    X_train_aug, y_train_aug = augment_training_data(X_train, y_train)

    estimator = RandomForestRegressor(
        n_estimators=250,
        max_depth=14,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=1,
    )
    model = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor(X_train_aug)),
            ("regressor", estimator),
        ]
    )
    model.fit(X_train_aug, y_train_aug)
    y_pred = model.predict(X_test)

    metrics = []
    for i, col in enumerate(future_cols):
        metrics.append(
            {
                "model": "random_forest",
                "target": col,
                "r2": r2_score(y_test[col], y_pred[:, i]),
                "mae": mean_absolute_error(y_test[col], y_pred[:, i]),
                "rmse": mean_squared_error(y_test[col], y_pred[:, i]) ** 0.5,
            }
        )
    metrics_df = pd.DataFrame(metrics)
    score_df = pd.DataFrame(
        [{"model": "random_forest", "mean_r2": float(r2_score(y_test, y_pred, multioutput="uniform_average"))}]
    )

    full_model = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor(X)),
            ("regressor", estimator),
        ]
    )
    X_aug, y_aug = augment_training_data(X, y)
    full_model.fit(X_aug, y_aug)

    joblib.dump(
        {
            "model": full_model,
            "feature_columns": X.columns.tolist(),
            "target_columns": future_cols,
            "target_base_columns": [col.replace("next_", "", 1) for col in future_cols],
            "model_name": "random_forest",
            "model_params": estimator.get_params(),
        },
        MODEL_PATH,
    )
    return metrics_df, score_df, X.columns.tolist()


def print_run_summary(
    metrics_df: pd.DataFrame,
    score_df: pd.DataFrame,
    feature_columns: list[str],
) -> None:
    print("\n========== Model ==========")
    print(score_df.to_string(index=False))

    print("\n========== Input Features ==========")
    for feature in feature_columns:
        print(f"- {feature}")

    print("\n========== Metrics ==========")
    print(metrics_df.round(4).to_string(index=False))

def train_only() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    cleaned_df = load_cleaned_data()
    model_df, future_cols = add_future_targets_and_features(cleaned_df)
    metrics_df, score_df, feature_columns = train_model(model_df, future_cols)

    print(f"Cleaned data shape: {cleaned_df.shape}")
    print(f"Modeling data shape: {model_df.shape}")
    print(f"Saved trained model to: {MODEL_PATH.resolve()}")
    print_run_summary(metrics_df, score_df, feature_columns)


def main() -> None:
    train_only()


if __name__ == "__main__":
    main()
