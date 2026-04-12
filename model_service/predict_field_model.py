import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler


df = pd.read_csv("tomato_cleaned.csv")

target = 'yield_kg_per_m2'

features = [col for col in df.columns if col not in [
    'yield_kg_per_m2',
    'days_to_maturity'
]]

X = df[features]
y = df[target]

print("\nFeatures used:")
print(features)


X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

train_df = pd.concat([X_train, y_train], axis=1)
train_df = train_df.drop_duplicates()
train_df = train_df.dropna()

X_train = train_df.drop(columns=[target])
y_train = train_df[target]

test_df = pd.concat([X_test, y_test], axis=1)
test_df = test_df.dropna()

X_test = test_df.drop(columns=[target])
y_test = test_df[target]


scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)


model = GradientBoostingRegressor(
    learning_rate=0.05,
    n_estimators=200,
    max_depth=4,
    subsample=0.8,
    random_state=42,
    
    n_iter_no_change=5, 
    validation_fraction=0.1,
    tol=1e-4,
    loss='huber',
    alpha=0.9
)

model.fit(X_train_scaled, y_train)


y_pred = model.predict(X_test_scaled)


r2 = r2_score(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)

print("\n=== Gradient Boosting ===")
print(f"R²: {r2:.4f}")
print(f"MSE: {mse:.4f}")
print(f"RMSE: {rmse:.4f}")

results = X_test.copy()
results['Actual'] = y_test
results['Predicted'] = y_pred

print("\nSample Predictions (10 rows):")
print(results[['Actual', 'Predicted']].head(5))

learning_rates = [0.1, 0.05, 0.01]

for lr in learning_rates:
    gb = GradientBoostingRegressor(
        learning_rate=lr,
        n_estimators=200,
        max_depth=4,
        subsample=0.8,
        random_state=42
    )
    gb.fit(X_train_scaled, y_train)
    pred = gb.predict(X_test_scaled)
    score = r2_score(y_test, pred)
    print(f"learning_rate={lr} → R²={score:.4f}")


X_scaled = scaler.fit_transform(X)

cv_model = GradientBoostingRegressor(
    learning_rate=0.05,
    n_estimators=200,
    max_depth=4,
    subsample=0.8,
    random_state=42,

    n_iter_no_change=5, 
    validation_fraction=0.1,
    tol=1e-4,

    loss='huber',
    alpha=0.9
)

cv_scores = cross_val_score(cv_model, X_scaled, y, cv=5, scoring='r2')

print("\n=== Cross Validation ===")
print("Scores:", cv_scores)
print(f"Mean R²: {cv_scores.mean():.4f}")
print(f"Std R²: {cv_scores.std():.4f}")

def predict_yield(data):
    data = data.copy()

    data["temp_range"] = data["max_temperature_C"] - data["min_temperature_C"]

    data["NPK_total"] = (
        data["fertilizer_N_kg_ha"] +
        data["fertilizer_P_kg_ha"] +
        data["fertilizer_K_kg_ha"]
    )

    data["N_ratio"] = data["fertilizer_N_kg_ha"] / (data["NPK_total"] + 1e-6)
    data["P_ratio"] = data["fertilizer_P_kg_ha"] / (data["NPK_total"] + 1e-6)
    data["K_ratio"] = data["fertilizer_K_kg_ha"] / (data["NPK_total"] + 1e-6)

    data["light_energy"] = (
        data["light_intensity_lux"] * data["photoperiod_hours"]
    )

    varieties = ["Beefsteak", "Cherry", "Heirloom", "Roma"]
    for v in varieties:
        user_variety = data.get("variety")
        if user_variety == v:
            data["variety_" + v] = 1
        else:
            data["variety_" + v] = 0
    data.pop("variety", None)
    row = {col: data.get(col, 0) for col in features}
    df_input = pd.DataFrame([row])
    df_scaled = scaler.transform(df_input)
    prediction = model.predict(df_scaled)[0]
    return float(prediction)
