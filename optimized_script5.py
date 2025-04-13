import matplotlib
matplotlib.use('Agg')  # non-GUI backend for server use
import matplotlib.pyplot as plt

from flask import Flask, jsonify, render_template_string
from flask_cors import CORS
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import requests
import numpy as np
import pandas as pd
import os
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse

# --- CONFIG ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
ENTITY_ID = "sensor.maya_solar_panel"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# --- Flask App Setup ---
app = Flask(__name__, static_url_path='/static')
CORS(app)

# --- Forecast Cache ---
forecast_cache = {}
last_updated = None

# --- Fetch Historical Sensor Data ---
def fetch_sensor_history(entity_id, days=3):
    start_time = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        raw = res.json()
        records = []
        if raw and isinstance(raw[0], list):
            for entry in raw[0]:
                try:
                    ts = parse(entry["last_changed"])
                    val = float(entry["state"])
                    records.append({"timestamp": ts, "power": val})
                except:
                    continue
        return pd.DataFrame(records)
    except Exception as e:
        print("❌ Error fetching sensor data:", e)
        return pd.DataFrame()

# --- LSTM Utilities ---
def prepare_lstm_data(df, window=24):
    values = df["power"].values
    if len(values) < window + 1:
        return np.array([]), np.array([])
    X, y = [], []
    for i in range(len(values) - window):
        X.append(values[i:i + window])
        y.append(values[i + window])
    return np.array(X).reshape((-1, window, 1)), np.array(y)

def train_lstm(X, y):
    model = Sequential([
        LSTM(64, input_shape=(X.shape[1], 1)),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X, y, epochs=15, batch_size=16, verbose=0)
    return model

def predict_next_24(model, last_24):
    preds = []
    input_seq = last_24.reshape(1, 24, 1)
    for _ in range(24):
        pred = model.predict(input_seq, verbose=0)[0][0]
        preds.append(pred)
        input_seq = np.append(input_seq[:, 1:, :], [[[pred]]], axis=1)
    return preds

# --- API Route for Forecast ---
@app.route("/api/solar_forecast", methods=["GET"])
def solar_forecast():
    global forecast_cache, last_updated
    now = datetime.now()

    # Serve cached forecast if recent
    if forecast_cache and last_updated and (now - last_updated).seconds < 600:
        return jsonify(forecast_cache)

    df = fetch_sensor_history(ENTITY_ID)
    if df.empty or len(df) < 24:
        return jsonify({"error": "Insufficient data for forecast."}), 400

    df = df.sort_values("timestamp").drop_duplicates("timestamp")
    X, y = prepare_lstm_data(df)
    if X.size == 0:
        return jsonify({"error": "Not enough sequential data."}), 400

    try:
        model = train_lstm(X, y)
        last_24 = df["power"].values[-24:]
        forecast = predict_next_24(model, last_24)
        forecast_floats = [float(v) for v in forecast]

        # Plot and save image
        now = datetime.now()
        time_labels = [now + timedelta(hours=i) for i in range(24)]
        os.makedirs("static", exist_ok=True)
        plot_path = "static/solar_forecast.png"
        plt.figure(figsize=(12, 6))
        plt.plot(time_labels, forecast_floats, marker='o', label="Forecasted Solar Power (W)")
        plt.title("LSTM Forecasted Solar Generation (Next 24 Hours)")
        plt.xlabel("Time")
        plt.ylabel("Power (Watts)")
        plt.grid(True)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.legend()
        plt.savefig(plot_path)
        plt.close()

        result = {
            "forecast": forecast_floats,
            "unit": "W",
            "source": ENTITY_ID,
            "plot_url": f"/{plot_path}"
        }

        forecast_cache = result
        last_updated = now
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": "Prediction failed.", "details": str(e)}), 500

# --- Forecast Chart Page ---
@app.route("/forecast_page")
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
                    if (!res.ok && data.error) {
                        document.getElementById("error").textContent = data.error;
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
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                x: { title: { display: true, text: "Time" }},
                                y: { title: { display: true, text: "Watts" }, beginAtZero: true }
                            },
                            plugins: { legend: { display: true }}
                        }
                    });
                } catch (err) {
                    document.getElementById("error").textContent = "⚠️ Could not load forecast.";
                    console.error(err);
                }
            }
            fetchForecast();
        </script>
    </body>
    </html>
    """)

# --- Run the Flask App ---
if __name__ == "__main__":
    app.run(debug=True, port=5051)
