import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from datetime import datetime
from dash_dynamic12 import fetch_prices3  # Import this from your app

# 1. Load Data
prices = fetch_prices3()
if len(prices) < 25:
    raise ValueError("Not enough price data")

# 2. Simulate timestamps for each price point
end_time = datetime.now()
timestamps = pd.date_range(end=end_time, periods=len(prices), freq="30min")

df = pd.DataFrame({
    "price": prices,
    "timestamp": timestamps
})

# 3. Add trend-based features
df["hour"] = df["timestamp"].dt.hour
df["minute"] = df["timestamp"].dt.minute
df["dayofweek"] = df["timestamp"].dt.dayofweek
df["time_index"] = np.arange(len(df))

# Optional: cyclic encodings
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
df["dow_sin"] = np.sin(2 * np.pi * df["dayofweek"] / 7)
df["dow_cos"] = np.cos(2 * np.pi * df["dayofweek"] / 7)

# 4. Features and Target
features = ["hour", "minute", "dayofweek", "time_index", "hour_sin", "hour_cos", "dow_sin", "dow_cos"]
X = df[features]
y = df["price"]

# 5. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, shuffle=False, test_size=0.2)

# 6. Train Model
model = XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.1)
model.fit(X_train, y_train)

# 7. Save model
import os
os.makedirs("models", exist_ok=True)
joblib.dump(model, "models/grid_price_forecaster2.pkl")

print("✅ Model trained and saved to models/grid_price_forecaster.pkl")
