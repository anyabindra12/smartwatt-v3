# import requests
# import numpy as np
# import pandas as pd
# from datetime import datetime, timedelta, timezone
# from dateutil.parser import parse
# from flask import Flask, jsonify
# from flask_cors import CORS
# from tensorflow.keras.models import Sequential
# from tensorflow.keras.layers import LSTM, Dense

# # --- CONFIG ---
# HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
# TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
# ENTITY_ID = "sensor.nord_pool_ger_current_price"

# HEADERS = {
#     "Authorization": f"Bearer {TOKEN}",
#     "Content-Type": "application/json"
# }

# # --- Flask App ---
# app = Flask(__name__)
# CORS(app)

# # --- Fetch historical data from Home Assistant ---
# def fetch_sensor_history(entity_id, days=14):
#     start_time = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
#     url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"

#     try:
#         response = requests.get(url, headers=HEADERS, timeout=15)
#         response.raise_for_status()
#         history_data = response.json()

#         if not history_data or not isinstance(history_data[0], list):
#             return pd.DataFrame()

#         records = []
#         for entry in history_data[0]:
#             try:
#                 ts = parse(entry["last_changed"])
#                 val = float(entry["state"])
#                 records.append({"timestamp": ts, "price": val})
#             except Exception:
#                 continue
#         return pd.DataFrame(records)

#     except requests.exceptions.RequestException as e:
#         print("❌ Request error:", e)
#         return pd.DataFrame()

# # --- Prepare LSTM input/output ---
# def prepare_lstm_data(df, window=24):
#     prices = df["price"].values
#     X, y = [], []
#     for i in range(len(prices) - window):
#         X.append(prices[i:i+window])
#         y.append(prices[i+window])
#     X = np.array(X)
#     y = np.array(y)
#     X = X.reshape((X.shape[0], X.shape[1], 1))
#     return X, y

# # --- Train the LSTM model ---
# def train_lstm(X, y):
#     model = Sequential([
#         LSTM(64, input_shape=(X.shape[1], 1)),
#         Dense(1)
#     ])
#     model.compile(optimizer='adam', loss='mse')
#     model.fit(X, y, epochs=30, batch_size=16, verbose=0)
#     return model

# # --- Predict next 24 hours using last 24 hours recursively ---
# def predict_next_24(model, last_24):
#     preds = []
#     input_seq = last_24.reshape(1, 24, 1)
#     for _ in range(24):
#         pred = model.predict(input_seq, verbose=0)[0][0]
#         preds.append(pred)
#         input_seq = np.append(input_seq[:, 1:, :], [[[pred]]], axis=1)
#     return preds

# # --- API endpoint ---
# @app.route('/api/predict', methods=['GET'])
# def predict():
#     df = fetch_sensor_history(ENTITY_ID, days=9)

#     if df.empty:
#         return jsonify({"error": "No historical data found. Ensure Home Assistant is recording this sensor."}), 400

#     df = df.sort_values("timestamp").drop_duplicates("timestamp")
#     X, y = prepare_lstm_data(df)
#     model = train_lstm(X, y)
#     last_24 = df["price"].values[-24:]
#     forecast = predict_next_24(model, last_24)

#     return jsonify({
#         "forecast": forecast,
#         "unit": "€/kWh",
#         "source": ENTITY_ID
#     })

# # --- Run app ---
# if __name__ == '__main__':
#     app.run(debug=True,port=5050)

import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse
from flask import Flask, jsonify
from flask_cors import CORS
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# --- CONFIG ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
ENTITY_ID = "sensor.nord_pool_ger_current_price"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# --- Flask App ---
app = Flask(__name__)
CORS(app)

# --- Fetch historical data from Home Assistant ---
def fetch_sensor_history(entity_id, days=2):
    start_time = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        history_data = response.json()

        if not history_data or not isinstance(history_data[0], list):
            return pd.DataFrame()

        records = []
        for entry in history_data[0]:
            try:
                ts = parse(entry["last_changed"])
                val = float(entry["state"])
                records.append({"timestamp": ts, "price": val})
            except Exception:
                continue
        return pd.DataFrame(records)

    except requests.exceptions.RequestException as e:
        print("❌ Request error:", e)
        return pd.DataFrame()

# --- Prepare LSTM input/output ---
def prepare_lstm_data(df, window=22):
    prices = df["price"].values
    if len(prices) < window + 1:
        return np.array([]), np.array([])
    X, y = [], []
    for i in range(len(prices) - window):
        X.append(prices[i:i+window])
        y.append(prices[i+window])
    X = np.array(X)
    y = np.array(y)
    X = X.reshape((X.shape[0], X.shape[1], 1))
    return X, y

# --- Train the LSTM model ---
def train_lstm(X, y):
    model = Sequential([
        LSTM(64, input_shape=(X.shape[1], 1)),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X, y, epochs=30, batch_size=16, verbose=0)
    return model

# --- Predict next 24 hours using last 24 hours recursively ---
def predict_next_24(model, last_24):
    preds = []
    input_seq = last_24.reshape(1, 24, 1)
    for _ in range(24):
        pred = model.predict(input_seq, verbose=0)[0][0]
        preds.append(pred)
        input_seq = np.append(input_seq[:, 1:, :], [[[pred]]], axis=1)
    return preds

# --- API endpoint ---
@app.route('/api/predict', methods=['GET'])
def predict():
    df = fetch_sensor_history(ENTITY_ID, days=9)

    if df.empty or len(df) < 24:
        return jsonify({
            "error": f"Not enough data to train (found {len(df)} rows).",
            "hint": "Ensure the sensor has been updating hourly and is being recorded in Home Assistant."
        }), 400

    df = df.sort_values("timestamp").drop_duplicates("timestamp")

    X, y = prepare_lstm_data(df)
    if X.size == 0:
        return jsonify({
            "error": "Not enough sequential data to create training windows.",
            "hint": "Need at least 25 sequential price points."
        }), 400

    try:
        model = train_lstm(X, y)
        last_24 = df["price"].values[-24:]
        forecast = predict_next_24(model, last_24)

        return jsonify({
           "forecast": [float(v) for v in forecast],
            "unit": "€/kWh",
            "source": ENTITY_ID
        })

    except IndexError as e:
        return jsonify({
            "error": "IndexError during prediction. Possibly not enough data points.",
            "details": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "error": "Unexpected error during model training or prediction.",
            "details": str(e)
        }), 500

# --- Run app ---
if __name__ == '__main__':
    app.run(debug=True, port=5050)
