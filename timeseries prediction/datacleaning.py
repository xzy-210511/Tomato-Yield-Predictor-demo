from __future__ import annotations

import csv
import math
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "cleaned_data"
TRANSPLANT_DATE = datetime(2023, 9, 4)

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
RAW_MISSING = {"", "NaN", "N/A", "NA", "nan", "n/a", "#DIV/0!"}

NS_MONTHS = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

NS_EC_LIMIT_TO_TIMESERIES_EC = {
    5.0: ("EC3", "low"),
    10.0: ("EC6", "high"),
}

CLIMATE_ROUNDING = {
    "tout": 2,
    "rhout": 2,
    "iglob": 3,
    "windsp": 3,
    "rain": 3,
    "parout": 3,
    "pyrgeo": 3,
    "co2out": 2,
    "t_air": 2,
    "rh": 2,
    "co2": 2,
    "scr_enrg": 0,
    "scr_blck": 0,
    "ligth_on": 0,
    "vent_lee": 2,
    "vent_wind": 2,
    "t_rail": 2,
    "part1": 3,
    "par2": 3,
    "par3": 3,
    "par4": 3,
}


def col_to_idx(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref)
    if not match:
        return 0
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - 64
    return value - 1


def load_shared_strings(zf: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [
        "".join(text.text or "" for text in item.findall(".//a:t", NS))
        for item in root.findall("a:si", NS)
    ]


def sheet_paths(zf: ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("rel:Relationship", REL_NS)
    }

    paths: dict[str, str] = {}
    for sheet in workbook.findall("a:sheets/a:sheet", NS):
        rid = sheet.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        target = rid_to_target[rid].lstrip("/")
        paths[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"
    return paths


def read_xlsx_sheet(path: Path, sheet_name: str) -> list[list[str]]:
    with ZipFile(path) as zf:
        shared = load_shared_strings(zf)
        sheet_path = sheet_paths(zf)[sheet_name]
        root = ET.fromstring(zf.read(sheet_path))

        rows: list[list[str]] = []
        for row in root.findall(".//a:sheetData/a:row", NS):
            values: dict[int, str] = {}
            for cell in row.findall("a:c", NS):
                idx = col_to_idx(cell.attrib.get("r", "A1"))
                cell_type = cell.attrib.get("t")
                value = cell.find("a:v", NS)
                if value is None:
                    text = ""
                elif cell_type == "s":
                    text = shared[int(value.text or "0")]
                elif cell_type == "inlineStr":
                    text = "".join(node.text or "" for node in cell.findall(".//a:t", NS))
                else:
                    text = value.text or ""
                values[idx] = text.strip()
            if values:
                rows.append([values.get(i, "") for i in range(max(values) + 1)])
        return rows


def clean_header(name: str) -> str:
    name = name.strip().lower()
    name = name.replace("#", "num").replace("+", "plus")
    name = name.replace("<", "lt").replace(">", "gt")
    name = re.sub(r"[^a-z0-9]+", "_", name)
    return re.sub(r"_+", "_", name).strip("_") or "unnamed"


def unique_headers(headers: Iterable[str]) -> list[str]:
    seen: dict[str, int] = {}
    result: list[str] = []
    for header in headers:
        base = clean_header(header)
        count = seen.get(base, 0)
        seen[base] = count + 1
        result.append(base if count == 0 else f"{base}_{count + 1}")
    return result


def normalise_value(value: str | None) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return "" if text in RAW_MISSING else text


def to_float(value: str | None) -> float | None:
    text = normalise_value(value)
    if not text:
        return None
    try:
        out = float(text)
    except ValueError:
        return None
    return None if math.isnan(out) else out


def excel_serial_to_datetime(value: str | None) -> datetime | None:
    number = to_float(value)
    if number is None:
        return None
    raw = datetime(1899, 12, 30) + timedelta(days=number)
    return (raw + timedelta(seconds=30)).replace(second=0, microsecond=0)


def row_dicts(rows: list[list[str]], header_idx: int) -> list[dict[str, str]]:
    headers = unique_headers(rows[header_idx])
    output: list[dict[str, str]] = []
    for raw in rows[header_idx + 1 :]:
        item = {
            headers[i]: normalise_value(raw[i]) if i < len(raw) else ""
            for i in range(len(headers))
        }
        if any(item.values()):
            output.append(item)
    return output


def format_number(value: str | None, digits: int | None = None) -> str:
    number = to_float(value)
    if number is None:
        return normalise_value(value)
    if digits is None:
        return f"{number:g}"
    if digits == 0:
        return str(int(round(number)))
    return f"{number:.{digits}f}"


def normalise_light(value: str | None) -> str:
    text = normalise_value(value).lower().replace("_", " ")
    text = re.sub(r"\s+", " ", text).strip()
    mapping = {
        "highlight": "high light",
        "high light": "high light",
        "medlight": "med light",
        "medium light": "med light",
        "med light": "med light",
        "lowlight": "low light",
        "low light": "low light",
        "nolight": "no light",
        "no light": "no light",
    }
    return mapping.get(text, text)


def parse_treatment(treatment: str | None) -> tuple[str, str]:
    text = normalise_value(treatment)
    ec_match = re.search(r"(EC\d+)", text, re.IGNORECASE)
    ec = ec_match.group(1).upper() if ec_match else ""
    compact = text.replace("_", "").replace(" ", "").lower()
    if "highlight" in compact:
        light = "high light"
    elif "medlight" in compact or "mediumlight" in compact:
        light = "med light"
    elif "lowlight" in compact:
        light = "low light"
    elif "nolight" in compact:
        light = "no light"
    else:
        light = ""
    return ec, light


def parse_ns_date(value: str | None) -> datetime | None:
    text = normalise_value(value)
    if "_" not in text:
        return None
    day, month = text.split("_", 1)
    if month not in NS_MONTHS:
        return None
    try:
        return datetime(2024, NS_MONTHS[month], int(day))
    except ValueError:
        return None


def write_csv(path: Path, rows: list[dict[str, str]], preferred: list[str]) -> None:
    fields: list[str] = []
    for field in preferred:
        if field not in fields:
            fields.append(field)
    for row in rows:
        for field in row:
            if field not in fields:
                fields.append(field)

    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def clean_climate() -> list[dict[str, str]]:
    rows = row_dicts(read_xlsx_sheet(ROOT / "ClimateTimeseries.xlsx", "weather_climate"), 0)
    cleaned: list[dict[str, str]] = []
    for row in rows:
        dt = excel_serial_to_datetime(row.get("date"))
        item = {
            "datetime": dt.isoformat(sep=" ", timespec="minutes") if dt else "",
            "date": dt.date().isoformat() if dt else "",
            "days_after_transplant": str((dt.date() - TRANSPLANT_DATE.date()).days) if dt else "",
            "time": dt.time().isoformat(timespec="minutes") if dt else "",
            "treatment": "",
            "ec": "",
            "light": "",
            "plant_id": "",
        }
        for key, value in row.items():
            item[key] = format_number(value, CLIMATE_ROUNDING.get(key))
        item["date_serial"] = row.get("date", "")
        item["time_serial"] = row.get("time", "")
        item["datenum_matlab"] = row.get("datenum", "")
        item["datetime"] = dt.isoformat(sep=" ", timespec="minutes") if dt else ""
        item["date"] = dt.date().isoformat() if dt else ""
        item["days_after_transplant"] = str((dt.date() - TRANSPLANT_DATE.date()).days) if dt else ""
        item["time"] = dt.time().isoformat(timespec="minutes") if dt else ""
        cleaned.append(item)
    return cleaned


def clean_crop_measurements() -> list[dict[str, str]]:
    rows = row_dicts(read_xlsx_sheet(ROOT / "CropMeasurements.xlsx", "All data"), 0)
    cleaned: list[dict[str, str]] = []
    for row in rows:
        dt = excel_serial_to_datetime(row.get("date"))
        ec_from_treatment, light_from_treatment = parse_treatment(row.get("treatment"))
        treatment = normalise_value(row.get("treatment"))
        label = normalise_value(row.get("num_on_label"))
        item = {
            "date": dt.date().isoformat() if dt else "",
            "days_after_transplant": str((dt.date() - TRANSPLANT_DATE.date()).days) if dt else "",
            "date_serial": row.get("date", ""),
            "week": format_number(row.get("week"), 0),
            "treatment": treatment,
            "ec": normalise_value(row.get("corrected_ec")) or ec_from_treatment,
            "light": normalise_light(row.get("light")) or light_from_treatment,
            "variety": normalise_value(row.get("variety")),
            "plant_id": f"{treatment}__plant_{label}" if treatment and label else label,
            "plant_label": label,
            "plant_repetition": row.get("plant_repetition"),
            "field": row.get("field", ""),
        }
        for key, value in row.items():
            item[key] = format_number(value, 3) if to_float(value) is not None else normalise_value(value)
        item["date"] = dt.date().isoformat() if dt else ""
        item["days_after_transplant"] = str((dt.date() - TRANSPLANT_DATE.date()).days) if dt else ""
        cleaned.append(item)
    return cleaned


def clean_destructive_harvest() -> list[dict[str, str]]:
    rows = row_dicts(read_xlsx_sheet(ROOT / "DestructiveHarvest.xlsx", "All Data"), 1)
    cleaned: list[dict[str, str]] = []
    for row in rows:
        dt = excel_serial_to_datetime(row.get("date"))
        ec_from_treatment, light_from_treatment = parse_treatment(row.get("treatment"))
        treatment = normalise_value(row.get("treatment"))
        sample_name = normalise_value(row.get("sample_name"))
        sample_n = normalise_value(row.get("sample_n"))
        item = {
            "date": dt.date().isoformat() if dt else "",
            "days_after_transplant": str((dt.date() - TRANSPLANT_DATE.date()).days) if dt else "",
            "date_serial": row.get("date", ""),
            "das": format_number(row.get("das"), 0),
            "phase": row.get("phase", ""),
            "treatment": treatment,
            "ec": normalise_value(row.get("ec")) or normalise_value(row.get("ec_")) or ec_from_treatment,
            "light": normalise_light(row.get("light")) or light_from_treatment,
            "variety": normalise_value(row.get("variety")),
            "plant_id": sample_name or (f"{treatment}__sample_{sample_n}" if treatment and sample_n else sample_n),
            "sample_name": sample_name,
            "sample_n": sample_n,
        }
        for key, value in row.items():
            item[key] = format_number(value, 3) if to_float(value) is not None else normalise_value(value)
        item["date"] = dt.date().isoformat() if dt else ""
        item["days_after_transplant"] = str((dt.date() - TRANSPLANT_DATE.date()).days) if dt else ""
        cleaned.append(item)
    return cleaned


def clean_ns_consumption() -> list[dict[str, str]]:
    path = ROOT / "nsdataset.xlsx"
    rows = row_dicts(read_xlsx_sheet(path, "NS consumption raw data"), 2)
    parsed: list[dict[str, object]] = []
    first_date: datetime | None = None

    for row in rows:
        ns_date = parse_ns_date(row.get("day"))
        ec_limit = to_float(row.get("ec_limit"))
        if ns_date is None or ec_limit not in NS_EC_LIMIT_TO_TIMESERIES_EC:
            continue
        first_date = ns_date if first_date is None else min(first_date, ns_date)
        timeseries_ec, ns_policy = NS_EC_LIMIT_TO_TIMESERIES_EC[ec_limit]
        parsed.append(
            {
                "original_day": normalise_value(row.get("day")),
                "date": ns_date.date().isoformat(),
                "ec_limit": ec_limit,
                "timeseries_ec": timeseries_ec,
                "ns_policy": ns_policy,
                "replication": to_float(row.get("replication")),
                "ns_new_per_plant_l": to_float(row.get("ns_new_plant")),
                "ns_added_per_plant_l": to_float(row.get("ns_added_plant")),
                "ns_residual_per_plant_l": to_float(row.get("ns_residual_plant")),
            }
        )

    if first_date is None:
        return []

    cleaned: list[dict[str, str]] = []
    for row in parsed:
        ns_date = datetime.fromisoformat(str(row["date"]))
        item = {
            "ns_day": str((ns_date.date() - first_date.date()).days),
            "original_day": str(row["original_day"]),
            "date": str(row["date"]),
            "ec_limit": format_number(str(row["ec_limit"])),
            "timeseries_ec": str(row["timeseries_ec"]),
            "ns_policy": str(row["ns_policy"]),
            "replication": format_number(str(row["replication"]), 0),
            "ns_new_per_plant_l": format_number(str(row["ns_new_per_plant_l"]), 3),
            "ns_added_per_plant_l": format_number(str(row["ns_added_per_plant_l"]), 3),
            "ns_residual_per_plant_l": format_number(str(row["ns_residual_per_plant_l"]), 3),
        }
        cleaned.append(item)
    return cleaned


def aggregate_ns_consumption(ns_rows: list[dict[str, str]]) -> pd.DataFrame:
    ns = pd.DataFrame(ns_rows)
    for column in [
        "ns_day",
        "ec_limit",
        "replication",
        "ns_new_per_plant_l",
        "ns_added_per_plant_l",
        "ns_residual_per_plant_l",
    ]:
        ns[column] = pd.to_numeric(ns[column], errors="coerce")

    return (
        ns.groupby(["ns_day", "timeseries_ec", "ns_policy", "ec_limit"], as_index=False)
        .agg(
            ns_new_per_plant_l=("ns_new_per_plant_l", "mean"),
            ns_added_per_plant_l=("ns_added_per_plant_l", "mean"),
            ns_residual_per_plant_l=("ns_residual_per_plant_l", "mean"),
            ns_replications=("replication", "nunique"),
        )
        .rename(columns={"timeseries_ec": "ec", "ns_day": "days_after_transplant"})
    )


def aggregate_climate_for_mapping(climate_rows: list[dict[str, str]]) -> pd.DataFrame:
    climate = pd.DataFrame(climate_rows)
    climate["days_after_transplant"] = pd.to_numeric(
        climate["days_after_transplant"], errors="coerce"
    )
    for column in ["t_air", "rh", "co2", "ligth_on", "part1", "par2", "par3", "par4"]:
        climate[column] = pd.to_numeric(climate[column], errors="coerce")

    climate["par_lamp"] = climate[["part1", "par2", "par3", "par4"]].mean(axis=1)
    climate["light_on_fraction"] = climate["ligth_on"].clip(lower=0, upper=1)
    daily = (
        climate.groupby("days_after_transplant", as_index=False)
        .agg(
            t_air_mean=("t_air", "mean"),
            rh_mean=("rh", "mean"),
            co2_mean=("co2", "mean"),
            par_lamp_daily=("par_lamp", "sum"),
            light_on_hours_daily=("light_on_fraction", lambda s: s.sum() * 5 / 60),
        )
        .sort_values("days_after_transplant")
    )
    daily["par_lamp_sum"] = daily["par_lamp_daily"].cumsum()
    daily["light_on_hours"] = daily["light_on_hours_daily"].cumsum()
    daily["t_air_mean_7d"] = daily["t_air_mean"].rolling(7, min_periods=1).sum()
    daily["par_lamp_sum_7d"] = daily["par_lamp_daily"].rolling(7, min_periods=1).sum()
    return daily


def daily_growth_states_for_mapping(crop_rows: list[dict[str, str]]) -> pd.DataFrame:
    crop = pd.DataFrame(crop_rows)
    crop["days_after_transplant"] = pd.to_numeric(
        crop["days_after_transplant"], errors="coerce"
    )
    crop["plant_height_cm"] = pd.to_numeric(crop["plantheigth"], errors="coerce")
    crop["num_leaves"] = pd.to_numeric(crop["num_leaves"], errors="coerce")

    observations = (
        crop.groupby(["days_after_transplant", "treatment", "ec", "light"], as_index=False)[
            ["plant_height_cm", "num_leaves"]
        ]
        .mean()
        .dropna(subset=["days_after_transplant", "ec", "light"])
    )

    daily_states: list[pd.DataFrame] = []
    for treatment, group in observations.groupby("treatment"):
        group = group.sort_values("days_after_transplant")
        days = range(
            int(group["days_after_transplant"].min()),
            int(group["days_after_transplant"].max()) + 1,
        )
        state = pd.DataFrame(
            {
                "days_after_transplant": list(days),
                "treatment": treatment,
                "ec": group["ec"].iloc[0],
                "light": group["light"].iloc[0],
            }
        )
        for target in ["plant_height_cm", "num_leaves"]:
            target_group = group.dropna(subset=[target])
            state[target] = pd.Series(
                np.interp(
                    state["days_after_transplant"].to_numpy(dtype=float),
                    target_group["days_after_transplant"].to_numpy(dtype=float),
                    target_group[target].to_numpy(dtype=float),
                )
            )
        daily_states.append(state)
    return pd.concat(daily_states, ignore_index=True)


def build_mapped_ns_training_table(
    climate_rows: list[dict[str, str]],
    crop_rows: list[dict[str, str]],
    ns_rows: list[dict[str, str]],
) -> list[dict[str, str]]:
    ns_daily = aggregate_ns_consumption(ns_rows)
    climate_daily = aggregate_climate_for_mapping(climate_rows)
    growth_daily = daily_growth_states_for_mapping(crop_rows)

    mapped = (
        growth_daily.merge(ns_daily, on=["days_after_transplant", "ec"], how="inner")
        .merge(climate_daily, on="days_after_transplant", how="inner")
        .sort_values(["ec", "light", "days_after_transplant"])
    )

    preferred = [
        "days_after_transplant",
        "ec",
        "ns_policy",
        "ec_limit",
        "light",
        "treatment",
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
        "ns_new_per_plant_l",
        "ns_added_per_plant_l",
        "ns_residual_per_plant_l",
        "ns_replications",
    ]
    mapped = mapped[preferred]
    return [
        {
            column: format_number(str(value), 3) if isinstance(value, float) else str(value)
            for column, value in row.items()
        }
        for row in mapped.to_dict(orient="records")
    ]


def main() -> None:
    OUT.mkdir(exist_ok=True)

    climate = clean_climate()
    crop = clean_crop_measurements()
    harvest = clean_destructive_harvest()
    ns = clean_ns_consumption()
    mapped_ns = build_mapped_ns_training_table(climate, crop, ns)

    write_csv(
        OUT / "climate_timeseries_clean.csv",
        climate,
        ["datetime", "date", "days_after_transplant", "time", "treatment", "ec", "light", "plant_id"],
    )
    write_csv(
        OUT / "crop_measurements_clean.csv",
        crop,
        [
            "date",
            "days_after_transplant",
            "date_serial",
            "week",
            "treatment",
            "ec",
            "light",
            "variety",
            "plant_id",
            "plant_label",
        ],
    )
    write_csv(
        OUT / "destructive_harvest_clean.csv",
        harvest,
        [
            "date",
            "days_after_transplant",
            "date_serial",
            "das",
            "phase",
            "treatment",
            "ec",
            "light",
            "variety",
            "plant_id",
        ],
    )
    write_csv(
        OUT / "ns_consumption_clean.csv",
        ns,
        [
            "ns_day",
            "original_day",
            "date",
            "ec_limit",
            "timeseries_ec",
            "ns_policy",
            "replication",
            "ns_new_per_plant_l",
            "ns_added_per_plant_l",
            "ns_residual_per_plant_l",
        ],
    )
    write_csv(
        OUT / "mapped_ns_training_table.csv",
        mapped_ns,
        [
            "days_after_transplant",
            "ec",
            "ns_policy",
            "ec_limit",
            "light",
            "treatment",
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
            "ns_new_per_plant_l",
            "ns_added_per_plant_l",
            "ns_residual_per_plant_l",
            "ns_replications",
        ],
    )

    print("Data cleaning complete.")
    print(f"  {OUT / 'climate_timeseries_clean.csv'} rows={len(climate)}")
    print(f"  {OUT / 'crop_measurements_clean.csv'} rows={len(crop)}")
    print(f"  {OUT / 'destructive_harvest_clean.csv'} rows={len(harvest)}")
    print(f"  {OUT / 'ns_consumption_clean.csv'} rows={len(ns)}")
    print(f"  {OUT / 'mapped_ns_training_table.csv'} rows={len(mapped_ns)}")


if __name__ == "__main__":
    main()
