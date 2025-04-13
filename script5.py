import matplotlib
matplotlib.use('Agg')  # non-GUI backend for macOS/server
from flask import Flask, jsonify, render_template_string

import matplotlib.pyplot as plt
import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse
from flask import Flask, jsonify
from flask_cors import CORS
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import os

# --- CONFIG ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
ENTITY_ID = "sensor.maya_solar_panel"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# --- Flask App ---
app = Flask(__name__, static_url_path='/static')
CORS(app)

# --- Fetch historical data ---
def fetch_sensor_history(entity_id, days=9):
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
                records.append({"timestamp": ts, "power": val})
            except Exception:
                continue
        return pd.DataFrame(records)

    except requests.exceptions.RequestException as e:
        print("❌ Request error:", e)
        return pd.DataFrame()

# --- Prepare LSTM input/output ---
def prepare_lstm_data(df, window=22):
    values = df["power"].values
    if len(values) < window + 1:
        return np.array([]), np.array([])
    X, y = [], []
    for i in range(len(values) - window):
        X.append(values[i:i+window])
        y.append(values[i+window])
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

# --- Predict next 24 hours ---
def predict_next_24(model, last_24):
    preds = []
    input_seq = last_24.reshape(1, 24, 1)
    for _ in range(24):
        pred = model.predict(input_seq, verbose=0)[0][0]
        preds.append(pred)
        input_seq = np.append(input_seq[:, 1:, :], [[[pred]]], axis=1)
    return preds

# --- API Endpoint ---
@app.route('/api/solar_forecast', methods=['GET'])
def solar_forecast():
    df = fetch_sensor_history(ENTITY_ID, days=9)

    if df.empty or len(df) < 24:
        return jsonify({
            "error": f"Not enough data to train (found {len(df)} rows).",
            "hint": "Ensure the solar sensor is updating regularly and recorded."
        }), 400

    df = df.sort_values("timestamp").drop_duplicates("timestamp")
    X, y = prepare_lstm_data(df)

    if X.size == 0:
        return jsonify({
            "error": "Not enough sequential data to create training windows.",
            "hint": "Need at least 25 sequential data points."
        }), 400

    try:
        model = train_lstm(X, y)
        last_24 = df["power"].values[-24:]
        forecast = predict_next_24(model, last_24)
        forecast_floats = [float(v) for v in forecast]

        # --- Plot forecast ---
        now = datetime.now()
        time_labels = [now + timedelta(hours=i) for i in range(24)]

        plt.figure(figsize=(12, 6))
        plt.plot(time_labels, forecast_floats, marker='o', label="Forecasted Solar Power (W)")
        plt.title("LSTM Forecasted Solar Generation (Next 24 Hours)")
        plt.xlabel("Time")
        plt.ylabel("Power (Watts)")
        plt.grid(True)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.legend()

        os.makedirs("static", exist_ok=True)
        plot_path = "static/solar_forecast.png"
        plt.savefig(plot_path)
        plt.close()

        return jsonify({
            "forecast": forecast_floats,
            "unit": "W",
            "source": ENTITY_ID,
            "plot_url": f"/{plot_path}"
        })

    except Exception as e:
        return jsonify({
            "error": "Unexpected error during model training or prediction.",
            "details": str(e)
        }), 500


@app.route('/forecast_page')
def forecast_page():
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>SmartWatt Forecast</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: sans-serif; padding: 2rem; background: #f0f0f0; }
            .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 900px; margin: auto; }
            canvas { width: 100%; height: 400px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>🔮 LSTM Solar Power Forecast (Next 24 Hours)</h2>
            <canvas id="forecastChart"></canvas>
            <p id="error" style="color:red; font-weight:bold;"></p>
        </div>

        <script>
            async function fetchForecast() {
                try {
                    const res = await fetch("/api/solar_forecast");
                    const data = await res.json();

                    if (!res.ok) {
                        document.getElementById("error").textContent = data.error || "Forecast error.";
                        return;
                    }

                    const now = new Date();
                    const labels = Array.from({ length: 24 }, (_, i) => {
                        const dt = new Date(now.getTime() + i * 60 * 60 * 1000);
                        return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    });

                    const ctx = document.getElementById("forecastChart").getContext("2d");
                    new Chart(ctx, {
                        type: "line",
                        data: {
                            labels: labels,
                            datasets: [{
                                label: "Predicted Solar Power (W)",
                                data: data.forecast,
                                borderColor: "rgba(255, 99, 132, 1)",
                                backgroundColor: "rgba(255, 99, 132, 0.2)",
                                tension: 0.3,
                                fill: true,
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                x: { title: { display: true, text: "Time" } },
                                y: { title: { display: true, text: "Watts" }, beginAtZero: true }
                            },
                            plugins: {
                                legend: { display: true }
                            }
                        }
                    });

                } catch (err) {
                    document.getElementById("error").textContent = "⚠️ Could not load forecast data.";
                    console.error(err);
                }
            }

            fetchForecast();
        </script>
    </body>
    </html>
    """)


# --- Run Server ---
if __name__ == '__main__':
    app.run(debug=True, port=5051)
