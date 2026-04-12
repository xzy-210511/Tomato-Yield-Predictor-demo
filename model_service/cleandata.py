import pandas as pd
import numpy as np

df = pd.read_csv("greenhouse_crop_yields.csv")

df = df[df['crop_type'] == 'Tomato'].copy()

df['planting_date'] = pd.to_datetime(df['planting_date'])
df['harvest_date'] = pd.to_datetime(df['harvest_date'])

df['calculated_days'] = (df['harvest_date'] - df['planting_date']).dt.days

mask = df['days_to_maturity'] != df['calculated_days']
df.loc[mask, 'days_to_maturity'] = df.loc[mask, 'calculated_days']

df = df.drop(columns=[
    'greenhouse_id',
    'crop_type',
    'planting_date',
    'harvest_date',
    'calculated_days'
], errors='ignore')

df = pd.get_dummies(df, columns=['variety'], dtype=int)


df['temp_range'] = df['max_temperature_C'] - df['min_temperature_C']

df['NPK_total'] = (
    df['fertilizer_N_kg_ha'] +
    df['fertilizer_P_kg_ha'] +
    df['fertilizer_K_kg_ha']
)

df['N_ratio'] = df['fertilizer_N_kg_ha'] / (df['NPK_total'] + 1e-6)
df['P_ratio'] = df['fertilizer_P_kg_ha'] / (df['NPK_total'] + 1e-6)
df['K_ratio'] = df['fertilizer_K_kg_ha'] / (df['NPK_total'] + 1e-6)

df['light_energy'] = df['light_intensity_lux'] * df['photoperiod_hours']

df = df.drop_duplicates()
df = df.dropna()

df = df.rename(columns={'soil_pH': 'pH'})

df.to_csv("tomato_cleaned.csv", index=False)
print("Shape:", df.shape)
print("Columns:", df.columns.tolist())
