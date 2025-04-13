# import matplotlib
# matplotlib.use('Agg')
# import matplotlib.pyplot as plt

# from flask import Flask, jsonify, render_template_string
# from flask_cors import CORS
# from tensorflow.keras.models import Sequential
# from tensorflow.keras.layers import Conv1D, Dense, Flatten, Input
# import requests
# import numpy as np
# import pandas as pd
# import os
# from datetime import datetime, timedelta, timezone
# from dateutil.parser import parse

# # --- CONFIG ---
# HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
# TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
# ENTITY_ID = "sensor.maya_solar_panel"
# HEADERS = {
#     "Authorization": f"Bearer {TOKEN}",
#     "Content-Type": "application/json"
# }

# # --- Flask App ---
# app = Flask(__name__, static_url_path='/static')
# CORS(app)

# forecast_cache = {}
# last_updated = None

# # --- Fetch Sensor History ---
# def fetch_sensor_history(entity_id, days=3):
#     start_time = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
#     url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"
#     try:
#         res = requests.get(url, headers=HEADERS, timeout=10)
#         res.raise_for_status()
#         raw = res.json()
#         records = []
#         if raw and isinstance(raw[0], list):
#             for r in raw[0]:
#                 try:
#                     ts = parse(r["last_changed"])
#                     val = float(r["state"])
#                     records.append({"timestamp": ts, "power": val})
#                 except:
#                     continue
#         return pd.DataFrame(records)
#     except Exception as e:
#         print("❌ Error fetching sensor data:", e)
#         return pd.DataFrame()

# # --- Prepare CNN Input ---
# def prepare_cnn_data(df, window=48, forecast_horizon=24):
#     df = df.set_index("timestamp").resample("15T").mean().interpolate().reset_index()
#     print("✅ Resampled hourly rows:", len(df))

#     df["hour"] = df["timestamp"].dt.hour / 24
#     df["sin_hour"] = np.sin(2 * np.pi * df["hour"])
#     df["cos_hour"] = np.cos(2 * np.pi * df["hour"])

#     features = df[["power", "sin_hour", "cos_hour"]].values

#     # Ensure all features are finite
#     if not np.all(np.isfinite(features)):
#         print("❌ Found non-finite values in features. Aborting.")
#         return np.array([]), np.array([])

#     X, y = [], []
#     max_i = len(features) - window - forecast_horizon
#     print("✅ Preparing training sequences (max index:", max_i, ")")

#     for i in range(max_i):
#         seq_x = features[i:i+window]
#         seq_y = features[i+window:i+window+forecast_horizon, 0]
#         X.append(seq_x)
#         y.append(seq_y)

#     X = np.array(X)
#     y = np.array(y)
#     print("✅ Built X shape:", X.shape, " y shape:", y.shape)
#     return X, y


# # --- CNN Model ---
# def train_cnn(X, y):
#     model = Sequential([
#         Input(shape=(X.shape[1], X.shape[2])),
#         Conv1D(64, kernel_size=3, activation='relu'),
#         Conv1D(64, kernel_size=3, activation='relu'),
#         Flatten(),
#         Dense(64, activation='relu'),
#         Dense(y.shape[1])
#     ])
#     model.compile(optimizer='adam', loss='mse')
#     model.fit(X, y, epochs=15, batch_size=16, verbose=0)
#     return model

# # --- API Route ---
# @app.route("/api/solar_forecast", methods=["GET"])
# def solar_forecast():
#     global forecast_cache, last_updated
#     now = datetime.now()

#     if forecast_cache and last_updated and (now - last_updated).seconds < 600:
#         return jsonify(forecast_cache)

#     df = fetch_sensor_history(ENTITY_ID, days=9)
#     if df.empty or len(df) < 72:
#         return jsonify({"error": "Insufficient data for forecast."}), 400
#     print("Data length after resampling:", len(df))


#     df = df.sort_values("timestamp").drop_duplicates("timestamp")
#     X, y = prepare_cnn_data(df)
#     if X.size == 0:
#         print("Data length after resampling:", len(df))
#         return jsonify({"error": "Not enough sequential data."}), 400

#     try:
#         model = train_cnn(X, y)
#         forecast = model.predict(X[-1:])[0].tolist()

#         # Plot
#         time_labels = [datetime.now() + timedelta(hours=i) for i in range(24)]
#         os.makedirs("static", exist_ok=True)
#         plot_path = "static/solar_forecast.png"
#         plt.figure(figsize=(12, 6))
#         plt.plot(time_labels, forecast, marker='o', label="Forecasted Solar Power (W)")
#         plt.title("CNN Forecasted Solar Generation (Next 24 Hours)")
#         plt.xlabel("Time")
#         plt.ylabel("Power (Watts)")
#         plt.grid(True)
#         plt.xticks(rotation=45)
#         plt.tight_layout()
#         plt.legend()
#         plt.savefig(plot_path)
#         plt.close()

#         result = {
#             "forecast": forecast,
#             "unit": "W",
#             "source": ENTITY_ID,
#             "plot_url": f"/{plot_path}"
#         }

#         forecast_cache = result
#         last_updated = now
#         return jsonify(result)

#     except Exception as e:
#         return jsonify({"error": "Prediction failed.", "details": str(e)}), 500

# # --- HTML Dashboard ---
# @app.route("/forecast_page")
# def forecast_page():
#     return render_template_string("""
#     <!DOCTYPE html>
#     <html>
#     <head>
#         <title>SmartWatt CNN Forecast</title>
#         <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
#         <style>
#             body { font-family: sans-serif; background: #f5f5f5; padding: 2rem; }
#             .card { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); max-width: 900px; margin: auto; }
#             canvas { width: 100%; height: 400px; }
#         </style>
#     </head>
#     <body>
#         <div class="card">
#             <h2>🔮 CNN Solar Power Forecast (Next 24 Hours)</h2>
#             <canvas id="forecastChart"></canvas>
#             <p id="error" style="color:red; font-weight:bold;"></p>
#         </div>
#         <script>
#             async function fetchForecast() {
#                 try {
#                     const res = await fetch("/api/solar_forecast");
#                     const data = await res.json();
#                     if (!res.ok && data.error) {
#                         document.getElementById("error").textContent = data.error;
#                         return;
#                     }
#                     const now = new Date();
#                     const labels = Array.from({ length: 24 }, (_, i) => {
#                         const dt = new Date(now.getTime() + i * 3600000);
#                         return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
#                     });
#                     const ctx = document.getElementById("forecastChart").getContext("2d");
#                     new Chart(ctx, {
#                         type: "line",
#                         data: {
#                             labels: labels,
#                             datasets: [{
#                                 label: "Predicted Solar Power (W)",
#                                 data: data.forecast,
#                                 borderColor: "rgba(75, 192, 192, 1)",
#                                 backgroundColor: "rgba(75, 192, 192, 0.2)",
#                                 fill: true,
#                                 tension: 0.3
#                             }]
#                         },
#                         options: {
#                             responsive: true,
#                             scales: {
#                                 x: { title: { display: true, text: "Time" }},
#                                 y: { title: { display: true, text: "Watts" }, beginAtZero: true }
#                             },
#                             plugins: {
#                                 legend: { display: true }
#                             }
#                         }
#                     });
#                 } catch (err) {
#                     document.getElementById("error").textContent = "⚠️ Could not load forecast.";
#                     console.error(err);
#                 }
#             }
#             fetchForecast();
#         </script>
#     </body>
#     </html>
#     """)

# # --- Run the App ---
# if __name__ == "__main__":
#     app.run(debug=True, port=5051)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from flask import Flask, jsonify, render_template_string
from flask_cors import CORS
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, Dense, Flatten, Input
import requests
import numpy as np
import pandas as pd
import os
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse

HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
ENTITY_ID = "sensor.maya_solar_panel"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

app = Flask(__name__, static_url_path='/static')
CORS(app)

forecast_cache = {}
last_updated = None

# --- Fetch historical data ---
def fetch_sensor_history(entity_id, days=3):
    start_time = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        raw = res.json()
        records = []
        if raw and isinstance(raw[0], list):
            for r in raw[0]:
                try:
                    ts = parse(r["last_changed"])
                    val = float(r["state"])
                    records.append({"timestamp": ts, "power": val})
                except:
                    continue
        return pd.DataFrame(records)
    except Exception as e:
        print("❌ Error fetching sensor data:", e)
        return pd.DataFrame()

# --- Prepare CNN Input ---
def prepare_cnn_data(df, window=48, forecast_horizon=24):
    df = df.set_index("timestamp").resample("15T").mean().interpolate().reset_index()
    df["hour"] = df["timestamp"].dt.hour / 24
    df["sin_hour"] = np.sin(2 * np.pi * df["hour"])
    df["cos_hour"] = np.cos(2 * np.pi * df["hour"])
    features = df[["power", "sin_hour", "cos_hour"]].values

    if not np.all(np.isfinite(features)):
        return np.array([]), np.array([])

    X, y = [], []
    for i in range(len(features) - window - forecast_horizon):
        X.append(features[i:i+window])
        y.append(features[i+window:i+window+forecast_horizon, 0])
    return np.array(X), np.array(y)

# --- CNN Model ---
def train_cnn(X, y):
    model = Sequential([
        Input(shape=(X.shape[1], X.shape[2])),
        Conv1D(64, kernel_size=3, activation='relu'),
        Conv1D(64, kernel_size=3, activation='relu'),
        Flatten(),
        Dense(64, activation='relu'),
        Dense(y.shape[1])
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X, y, epochs=15, batch_size=16, verbose=0)
    return model

# --- Daylight envelope ---
def daylight_mask(n=24):
    hours = np.array(range(n))
    return np.maximum(0, np.sin((np.pi * (hours - 6)) / 12))

# --- API Route ---
@app.route("/api/solar_forecast", methods=["GET"])
def solar_forecast():
    global forecast_cache, last_updated
    now = datetime.now()

    if forecast_cache and last_updated and (now - last_updated).seconds < 600:
        return jsonify(forecast_cache)

    df = fetch_sensor_history(ENTITY_ID, days=5)
    if df.empty or len(df) < 100:
        return jsonify({"error": "Insufficient data for forecast."}), 400

    df = df.sort_values("timestamp").drop_duplicates("timestamp")
    X, y = prepare_cnn_data(df)
    if X.size == 0:
        return jsonify({"error": "Not enough sequential data."}), 400

    try:
        model = train_cnn(X, y)
        raw_forecast = model.predict(X[-1:])[0]
        forecast = (raw_forecast * daylight_mask(len(raw_forecast))).tolist()

        time_labels = [datetime.now() + timedelta(minutes=15 * i) for i in range(len(forecast))]
        os.makedirs("static", exist_ok=True)
        plot_path = "static/solar_forecast.png"
        plt.figure(figsize=(12, 6))
        plt.plot(time_labels, forecast, marker='o', label="Forecasted Solar Power (W)")
        plt.title("CNN Forecasted Solar Generation (With Daylight Envelope)")
        plt.xlabel("Time")
        plt.ylabel("Power (Watts)")
        plt.grid(True)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.legend()
        plt.savefig(plot_path)
        plt.close()

        result = {
            "forecast": forecast,
            "unit": "W",
            "source": ENTITY_ID,
            "plot_url": f"/{plot_path}"
        }

        forecast_cache = result
        last_updated = now
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": "Prediction failed.", "details": str(e)}), 500

# --- Forecast Page UI ---
@app.route("/forecast_page")
def forecast_page():
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Solar Forecast</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: sans-serif; background: #f5f5f5; padding: 2rem; }
            .card { background: white; padding: 1rem; border-radius: 8px; max-width: 900px; margin: auto; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
            canvas { width: 100%; height: 400px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>CNN Solar Power Forecast</h2>
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
                    const labels = Array.from({ length: data.forecast.length }, (_, i) => {
                        const dt = new Date(now.getTime() + i * 15 * 60 * 1000);
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
                                borderColor: "rgba(75, 192, 192, 1)",
                                backgroundColor: "rgba(75, 192, 192, 0.2)",
                                fill: true,
                                tension: 0.3
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

# --- Run the Flask app ---
if __name__ == "__main__":
    app.run(debug=True, port=5051)
