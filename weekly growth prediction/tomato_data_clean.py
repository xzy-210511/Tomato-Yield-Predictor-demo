from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd


DATA_PATH = Path("DB_Mobile_Manual_Tomato.csv")
OUTPUT_DIR = Path("tomato_model_outputs")
CLEANED_DATA_PATH = OUTPUT_DIR / "cleaned_weekly_tomato_data.csv"

PLANTING_DATE = pd.Timestamp("2023-11-09")
FERTILIZER_START_DATE = pd.Timestamp("2024-01-11")

GROWTH_TARGET_COLS = [
    "Chlorophyll (SPAD)",
    "Number of Flowers",
    "Number of Fruits",
    "Total Weight of Harvest Fruits",
    "Width Size (mm)",
    "Height Size (mm)",
]

ENVIRONMENT_COLS = [
    "7in1_Nitrogen[mg/kg]",
    "7in1_Phosphorus[mg/kg]",
    "7in1_Potasium[mg/kg]",
    "7in1_Ph[pH]",
    "7in1_Moisture[%RH]",
    "7in1_S_Temperature[C]",
    "7in1_EC[uS/cm]",
    "Pynamometer_Radiation[W/m2]",
    "Air_sensor_Temperature[C]",
    "Air_sensor_Humidity[%RH]",
]

FERTILIZER_COLS = ["N", "P", "K"]


def ensure_output_dir() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)


def read_raw_data(path: Path = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path, sep=";", engine="python")
    df = df.drop(columns=[c for c in df.columns if c.startswith("Unnamed")], errors="ignore")
    df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")

    categorical_cols = {"Date", "Laboratory", "Crop", "Treatment"}
    for col in df.columns:
        if col not in categorical_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["Date", "Plant"]).copy()
    df["Plant"] = df["Plant"].astype(int)
    return df.sort_values(["Plant", "Date"])


def aggregate_weekly(raw_df: pd.DataFrame) -> pd.DataFrame:
    numeric_cols = raw_df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = [c for c in raw_df.select_dtypes(exclude=[np.number]).columns if c != "Date"]
    agg = {col: "median" for col in numeric_cols}
    agg.update({col: first_valid for col in categorical_cols})
    weekly = raw_df.groupby(["Plant", "Date"], as_index=False).agg(agg)
    return weekly.sort_values(["Plant", "Date"]).reset_index(drop=True)


def first_valid(values: Iterable[object]) -> object:
    values = pd.Series(values).dropna()
    return values.iloc[0] if len(values) else np.nan


def parse_treatment_doses(treatment: object) -> tuple[float, float, float]:
    if not isinstance(treatment, str):
        return np.nan, np.nan, np.nan
    match = re.search(r"N(?P<N>\d+)P(?P<P>\d+)K(?P<K>\d+)", treatment)
    if not match:
        return np.nan, np.nan, np.nan
    return float(match.group("N")), float(match.group("P")), float(match.group("K"))


def apply_fertilizer_schedule(df: pd.DataFrame) -> pd.DataFrame:
    fixed = df.copy()
    if "Treatment" not in fixed.columns:
        return fixed

    fixed["original_treatment"] = fixed["Treatment"]
    treatment_active = fixed["Date"] >= FERTILIZER_START_DATE
    fixed["Treatment"] = np.where(treatment_active, fixed["original_treatment"], "T1_N0P0K0")

    parsed = fixed["original_treatment"].apply(parse_treatment_doses)
    fixed["treatment_N"] = [x[0] for x in parsed]
    fixed["treatment_P"] = [x[1] for x in parsed]
    fixed["treatment_K"] = [x[2] for x in parsed]
    fixed["treatment_total"] = fixed[["treatment_N", "treatment_P", "treatment_K"]].sum(axis=1)
    fixed["fertilizer_applied"] = (treatment_active & (fixed["treatment_total"] > 0)).astype(int)

    for nutrient in FERTILIZER_COLS:
        treatment_col = f"treatment_{nutrient}"
        if nutrient in fixed.columns and treatment_col in fixed.columns:
            fixed[f"fertilizer_dose_{nutrient}"] = fixed[treatment_col]
            fixed[nutrient] = np.where(treatment_active, fixed[treatment_col], 0)

    fixed["fertilizer_total"] = fixed[[c for c in FERTILIZER_COLS if c in fixed.columns]].sum(axis=1)
    dose_cols = [
        f"fertilizer_dose_{nutrient}"
        for nutrient in FERTILIZER_COLS
        if f"fertilizer_dose_{nutrient}" in fixed.columns
    ]
    fixed["fertilizer_dose_total"] = fixed[dose_cols].sum(axis=1) if dose_cols else 0
    return fixed


def fill_pre_fruiting_size_with_zero(df: pd.DataFrame) -> pd.DataFrame:
    fixed = df.sort_values(["Plant", "Date"]).copy()
    for col in ["Width Size (mm)", "Height Size (mm)"]:
        if col not in fixed.columns:
            continue

        def fill_one_plant(series: pd.Series) -> pd.Series:
            values = series.copy()
            first_valid = values.first_valid_index()
            if first_valid is None:
                return values.fillna(0)
            first_pos = values.index.get_loc(first_valid)
            leading_index = values.index[:first_pos]
            values.loc[leading_index] = values.loc[leading_index].fillna(0)
            return values

        fixed[col] = fixed.groupby("Plant", group_keys=False)[col].apply(fill_one_plant)
    return fixed


def clean_weekly(weekly_df: pd.DataFrame) -> pd.DataFrame:
    df = weekly_df.copy()

    non_negative_cols = [
        "Number of Flowers",
        "Number of Fruits",
        "Numer of Harvested Fruits",
        "Total Weight of Harvest Fruits",
        "Width Size (mm)",
        "Height Size (mm)",
        *ENVIRONMENT_COLS,
        *FERTILIZER_COLS,
    ]
    for col in non_negative_cols:
        if col in df.columns:
            df.loc[df[col] < 0, col] = np.nan

    plausible_ranges = {
        "Chlorophyll (SPAD)": (0, 80),
        "Sap pH": (0, 14),
        "Hanna Soil pH": (0, 14),
        "Horiba Soil pH": (0, 14),
        "7in1_Ph[pH]": (0, 14),
        "7in1_Moisture[%RH]": (0, 100),
        "Air_sensor_Humidity[%RH]": (0, 100),
        "Air_sensor_Temperature[C]": (-10, 60),
        "7in1_S_Temperature[C]": (-10, 70),
    }
    for col, (lower, upper) in plausible_ranges.items():
        if col in df.columns:
            df.loc[(df[col] < lower) | (df[col] > upper), col] = np.nan

    df = fill_pre_fruiting_size_with_zero(df)
    return apply_fertilizer_schedule(df)


def save_cleaning_report(raw_df: pd.DataFrame, weekly_df: pd.DataFrame, cleaned_df: pd.DataFrame) -> None:
    report = {
        "rows_raw": int(raw_df.shape[0]),
        "columns_raw": int(raw_df.shape[1]),
        "rows_weekly_aggregated": int(weekly_df.shape[0]),
        "rows_cleaned": int(cleaned_df.shape[0]),
        "date_min": str(raw_df["Date"].min().date()),
        "date_max": str(raw_df["Date"].max().date()),
        "n_plants": int(raw_df["Plant"].nunique()),
        "n_treatments": int(raw_df["Treatment"].nunique()) if "Treatment" in raw_df.columns else None,
        "planting_date_assumed": str(PLANTING_DATE.date()),
        "fertilizer_start_date_assumed": str(FERTILIZER_START_DATE.date()),
    }
    (OUTPUT_DIR / "data_cleaning_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def clean_dataset(input_path: Path = DATA_PATH, output_path: Path = CLEANED_DATA_PATH) -> pd.DataFrame:
    ensure_output_dir()
    raw_df = read_raw_data(input_path)
    weekly_df = aggregate_weekly(raw_df)
    cleaned_df = clean_weekly(weekly_df)
    cleaned_df.to_csv(output_path, index=False)
    save_cleaning_report(raw_df, weekly_df, cleaned_df)
    return cleaned_df


def main() -> None:
    cleaned_df = clean_dataset()
    print(f"Cleaned data saved to: {CLEANED_DATA_PATH.resolve()}")
    print(f"Cleaned shape: {cleaned_df.shape}")


if __name__ == "__main__":
    main()
