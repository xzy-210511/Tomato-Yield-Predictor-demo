from __future__ import annotations

import csv
import math
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "cleaned_data"
TRANSPLANT_DATE = datetime(2023, 9, 4)

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
RAW_MISSING = {"", "NaN", "N/A", "NA", "nan", "n/a", "#DIV/0!"}

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


def main() -> None:
    OUT.mkdir(exist_ok=True)

    climate = clean_climate()
    crop = clean_crop_measurements()
    harvest = clean_destructive_harvest()

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

    print("Data cleaning complete.")
    print(f"  {OUT / 'climate_timeseries_clean.csv'} rows={len(climate)}")
    print(f"  {OUT / 'crop_measurements_clean.csv'} rows={len(crop)}")
    print(f"  {OUT / 'destructive_harvest_clean.csv'} rows={len(harvest)}")


if __name__ == "__main__":
    main()
