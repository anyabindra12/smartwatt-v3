import pandas as pd
import numpy as np
import pickle
from xgboost import XGBRegressor
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import timedelta

# 1. Load and preprocess the data
price_data = pd.read_csv('price_data.csv')

# Convert timestamps
price_data['last_changed'] = pd.to_datetime(price_data['last_changed'])

# Remove rows where state is 'unknown'
price_data = price_data[price_data['state'] != 'unknown']

# Now safe to convert to float
price_data['state'] = price_data['state'].astype(float)

# Sort by time
price_data = price_data.sort_values('last_changed').reset_index(drop=True)

# ====== SHIFT DATES TO ALIGN END DATE WITH APRIL 30 ======
# Calculate how much to shift
last_actual_date = price_data['last_changed'].max()
desired_last_date = pd.Timestamp('2025-04-30 23:00:00')  # You can change 2025 to 2024 if needed

# Remove timezone info if needed
if last_actual_date.tzinfo is not None:
    last_actual_date = last_actual_date.tz_localize(None)

# Compute shift
shift_delta = desired_last_date - last_actual_date

# Apply the shift
price_data['last_changed'] = price_data['last_changed'] + shift_delta
# ==========================================================

# Create time features
price_data['hour'] = price_data['last_changed'].dt.hour
price_data['day_of_week'] = price_data['last_changed'].dt.dayofweek

# Create lag features (lags 1-24)
for lag in range(1, 25):
    price_data[f'lag_{lag}'] = price_data['state'].shift(lag)

# Drop rows with NaNs caused by shifting
price_data = price_data.dropna()

# 2. Define X and y
X = price_data[['hour', 'day_of_week'] + [f'lag_{lag}' for lag in range(1, 25)]]
y = price_data['state']

# 3. Train XGBoost
model = XGBRegressor(objective='reg:squarederror', n_estimators=100)
model.fit(X, y)

# 4. Predict next 24 hours
last_row = price_data.iloc[-1]
future_times = [last_row['last_changed'] + timedelta(hours=i) for i in range(1, 25)]
future_df = pd.DataFrame({
    'last_changed': future_times,
    'hour': [t.hour for t in future_times],
    'day_of_week': [t.dayofweek for t in future_times],
})

# Prepare lag values
lags = [last_row[f'lag_{i}'] for i in range(1, 25)]
lags = lags[::-1] + [last_row['state']]  # latest price becomes lag1, etc.

future_preds = []
for i in range(24):
    row = {
        'hour': future_df.loc[i, 'hour'],
        'day_of_week': future_df.loc[i, 'day_of_week']
    }
    for j in range(1, 25):
        if i - j < 0:
            row[f'lag_{j}'] = lags[i - j]
        else:
            row[f'lag_{j}'] = future_preds[i - j]
    pred = model.predict(pd.DataFrame([row]))[0]
    future_preds.append(pred)

# Save predictions
predictions_df = pd.DataFrame({
    'timestamp': future_times,
    'predicted_price': future_preds
})
with open('predictions.pkl', 'wb') as f:
    pickle.dump(predictions_df, f)

# 5. Plotting last 2 days of price data + future 24h forecast
last_timestamp = price_data['last_changed'].max()
two_days_ago = last_timestamp - pd.Timedelta(days=2)

# Filter historical data to last 2 days
price_data_last2days = price_data[price_data['last_changed'] >= two_days_ago]

plt.figure(figsize=(12,6))
plt.plot(price_data_last2days['last_changed'], price_data_last2days['state'], label='Historical Price (Last 2 Days)')
plt.plot(predictions_df['timestamp'], predictions_df['predicted_price'], label='Predicted Next 24h', linestyle='--')

plt.xlabel('Time')
plt.ylabel('Price')
plt.title('Electricity Price Forecast (Last 2 Days + 24h Prediction)')
plt.legend()
plt.grid(True)

# Make time axis nice
plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%m-%d %H:%M'))
plt.gcf().autofmt_xdate()

# Zoom x-axis to 2 days + future
plt.xlim(two_days_ago, predictions_df['timestamp'].max() + pd.Timedelta(hours=1))

# Show the plot during training
plt.show()

# Save the figure for dashboard
plt.savefig('forecast_plot.png')
plt.close()

print("Model trained, predictions saved, and plot generated!")
