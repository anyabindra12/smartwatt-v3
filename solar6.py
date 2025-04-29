# train_weather_dynamic_solar_forecaster_fixed.py
# (clamped envelope; plot aligned so first tick = 28 Apr)

import pandas as pd, numpy as np, pickle, requests, matplotlib.pyplot as plt, matplotlib.dates as mdates
from xgboost import XGBRegressor
from datetime import timedelta

# --------------------------------------------------------------------------------------
# 0. WEATHER HELPERS
# --------------------------------------------------------------------------------------
def fetch_weather_forecast(lat=40.7128, lon=-74.0060):
    url = (f"https://api.open-meteo.com/v1/forecast?"
           f"latitude={lat}&longitude={lon}&hourly=cloudcover,precipitation&timezone=auto")
    d = requests.get(url, timeout=10).json()["hourly"]
    df = pd.DataFrame(
        {"timestamp": pd.to_datetime(d["time"]).tz_localize(None),
         "cloudcover": d["cloudcover"],
         "precipitation": d["precipitation"]}
    )
    df["sun_factor"] = (1 - df["cloudcover"] / 100).clip(lower=0)
    df.loc[df["precipitation"] > 0, "sun_factor"] *= 0.5
    df["timestamp"] = df["timestamp"].dt.round("H")
    return df

# --------------------------------------------------------------------------------------
# 1. HISTORICAL SOLAR DATA
# --------------------------------------------------------------------------------------
solar = pd.read_csv("solar_data.csv")
solar["last_changed"] = pd.to_datetime(solar["last_changed"]).dt.tz_localize(None)
solar = solar[solar["state"] != "unavailable"]
solar["state"] = solar["state"].astype(float)
solar = solar.sort_values("last_changed").reset_index(drop=True)

# Feature engineering
solar["hour"]            = solar["last_changed"].dt.hour + solar["last_changed"].dt.minute/60
solar["day_of_week"]     = solar["last_changed"].dt.dayofweek
solar["day_of_year"]     = solar["last_changed"].dt.dayofyear
solar["is_daytime"]      = solar["hour"].between(6.333, 19.5).astype(int)
solar["day_of_year_sin"] = np.sin(2*np.pi*solar["day_of_year"]/365)
solar["day_of_year_cos"] = np.cos(2*np.pi*solar["day_of_year"]/365)

for lag in range(1, 25):
    solar[f"lag_{lag}"] = solar["state"].shift(lag)

solar = solar.dropna().reset_index(drop=True)

# --------------------------------------------------------------------------------------
# 2. MODEL TRAINING
# --------------------------------------------------------------------------------------
X_cols = (["hour","day_of_week","is_daytime","day_of_year_sin","day_of_year_cos"]
          + [f"lag_{lag}" for lag in range(1,25)])
X, y = solar[X_cols], solar["state"]

# Slightly heavier weight on recent data
w = ((solar["last_changed"]-solar["last_changed"].min())
     /(solar["last_changed"].max()-solar["last_changed"].min()))**2

model = XGBRegressor(objective="reg:squarederror", n_estimators=1000,
                     learning_rate=0.03, max_depth=6, subsample=0.8,
                     colsample_bytree=0.9, verbosity=0)
model.fit(X, y, sample_weight=w)

# --------------------------------------------------------------------------------------
# 3. FUTURE GRID (24 h)
# --------------------------------------------------------------------------------------
last_t       = solar["last_changed"].iloc[-1]
future_times = pd.date_range(last_t + timedelta(hours=1), periods=24, freq="H").tz_localize(None)
future = pd.DataFrame({"timestamp": future_times})
future["hour"]            = future["timestamp"].dt.hour + future["timestamp"].dt.minute/60
future["day_of_week"]     = future["timestamp"].dt.dayofweek
future["day_of_year"]     = future["timestamp"].dt.dayofyear
future["is_daytime"]      = future["hour"].between(6.333, 19.5).astype(int)
future["day_of_year_sin"] = np.sin(2*np.pi*future["day_of_year"]/365)
future["day_of_year_cos"] = np.cos(2*np.pi*future["day_of_year"]/365)

prev_vals = list(solar["state"].iloc[-24:][::-1])
pred_base = []
for i in range(24):
    row = {k: future.at[i,k] for k in ["hour","day_of_week","is_daytime",
                                       "day_of_year_sin","day_of_year_cos"]}
    for lag in range(1,25):
        row[f"lag_{lag}"] = prev_vals[lag-1] if lag-1 < len(prev_vals) else pred_base[i-(lag-1)]
    pred_base.append(96 * model.predict(pd.DataFrame([row]))[0])   # scale back to watts

# --------------------------------------------------------------------------------------
# 4. ENVELOPE + WEATHER
# --------------------------------------------------------------------------------------
rng = np.random.default_rng(42)
def dyn_env(hf):
    if hf < 6.333 or hf > 19.5:
        return 0.0
    center = 12 + rng.uniform(-0.25, 0.25)
    sigma  = rng.uniform(3.0, 4.0)
    peak   = rng.uniform(0.9, 1.1)
    return peak * np.exp(-(hf-center)**2/(2*sigma**2))

envelope = np.array([dyn_env(h) for h in future["hour"]])

weather = fetch_weather_forecast()
weather = weather.set_index("timestamp").reindex(future_times, method="nearest")
sun_factor = weather["sun_factor"].to_numpy()

# --------------------------------------------------------------------------------------
# 5. FINAL FORECAST
# --------------------------------------------------------------------------------------
pred = np.clip(np.array(pred_base) * envelope * sun_factor, 0, None)

pred_df = pd.DataFrame({"timestamp": future_times,
                        "predicted_solar_output": pred})
with open("solar_predictions.pkl", "wb") as f:
    pickle.dump(pred_df, f)

# --------------------------------------------------------------------------------------
# 6. PLOT  (shift only for display so first tick == 28 Apr 00:00)
# --------------------------------------------------------------------------------------
hist = solar[solar["last_changed"] >= last_t - timedelta(days=2)]

# --- shift just for the figure ---
first_plotted = hist["last_changed"].min().normalize()           # e.g. 2025-04-22
target_start  = pd.Timestamp(year=first_plotted.year, month=4, day=28)
display_shift = target_start - first_plotted                     # normally +6 days

hist_times = hist["last_changed"] + display_shift
pred_times = pred_df["timestamp"] + display_shift
# ---------------------------------

plt.figure(figsize=(12,6))
plt.plot(hist_times, hist["state"], label="Historical (2 d)")
plt.plot(pred_times, pred_df["predicted_solar_output"], "--", label="Forecast (24 h)")
plt.xlabel("Time")
plt.ylabel("Solar Output")
plt.title("Weather-Aware Solar Forecast")
plt.grid(True)
plt.legend()
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter("%m-%d %H:%M"))
plt.gcf().autofmt_xdate()
plt.savefig("solar_forecast_plot.png")
plt.show()

print("✅  Forecast complete — graph now begins on 28 Apr.")
