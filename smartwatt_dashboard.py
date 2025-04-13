import matplotlib
matplotlib.use('Agg')

from flask import Flask, send_file, render_template_string
import requests
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse
import io

# --- Flask Setup ---
app = Flask(__name__)

# --- Config ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

SENSORS = {
    "fan_power_plot.png": {
        "entity": "sensor.maya_fan_power",
        "title": "Fan Power",
        "ylabel": "Watts"
    },
    "solar_power_plot.png": {
        "entity": "sensor.maya_solar_panel",
        "title": "☀️ Solar Panel Output",
        "ylabel": "Watts"
    },
    "fan_current_plot.png": {
        "entity": "sensor.maya_fan_current",
        "title": "⚡ Fan Current",
        "ylabel": "Amps"
    },
    "fan_voltage_plot.png": {
        "entity": "sensor.maya_fan_voltage",
        "title": "🔋 Fan Voltage",
        "ylabel": "Volts"
    }
}

# --- Helper to get sensor data ---
def fetch_sensor_data(entity_id, hours=2):
    start_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
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
                    records.append((ts, val))
                except:
                    continue

        return pd.DataFrame(records, columns=["timestamp", "value"])
    except Exception as e:
        print(f"❌ Error fetching {entity_id}: {e}")
        return pd.DataFrame(columns=["timestamp", "value"])

# --- Dynamic Plot Image Route ---
@app.route("/<plot_name>")
def plot_image(plot_name):
    config = SENSORS.get(plot_name)
    if not config:
        return "Not found", 404

    df = fetch_sensor_data(config["entity"])
    if df.empty:
        return "No data", 404

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df["timestamp"], df["value"], marker="o")
    ax.set_title(config["title"])
    ax.set_xlabel("Time")
    ax.set_ylabel(config["ylabel"])
    ax.grid(True)
    fig.autofmt_xdate()

    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

# --- All-in-one Dashboard View ---
@app.route("/dashboard")
def dashboard():
    html = """
    <html>
    <head>
        <title>SmartWatt Sensor Dashboard</title>
        <meta http-equiv="refresh" content="15">
        <style>
            body { font-family: sans-serif; margin: 20px; background: #f8f9fa; }
            .card { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 30px; }
            img { width: 100%; border: 1px solid #ccc; border-radius: 6px; }
            h1 { text-align: center; }
        </style>
    </head>
    <body>
        <h1>📊 SmartWatt Live Sensor Dashboard</h1>
        {% for name, config in sensors.items() %}
        <div class="card">
            <h2>{{ config.title }}</h2>
            <img src="/{{ name }}" alt="{{ name }}">
        </div>
        {% endfor %}
        <p style="text-align:center; color:gray;">Auto-refreshes every 15 seconds</p>
    </body>
    </html>
    """
    return render_template_string(html, sensors=SENSORS)

# --- Run the App ---
if __name__ == "__main__":
    app.run(debug=True, port=5053)
