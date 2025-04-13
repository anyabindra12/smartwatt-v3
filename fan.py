import matplotlib
matplotlib.use('Agg')

from flask import Flask, jsonify, send_file, render_template_string
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
ENTITY_ID = "sensor.maya_fan_power"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# --- Fetch last 2 hours of fan power ---
def get_fan_power_data():
    start_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={ENTITY_ID}"

    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        data = res.json()
        points = []

        if data and isinstance(data[0], list):
            for d in data[0]:
                try:
                    ts = parse(d["last_changed"])
                    val = float(d["state"])
                    points.append((ts, val))
                except:
                    continue

        return pd.DataFrame(points, columns=["timestamp", "value"])

    except Exception as e:
        print(f"⚠️ Error fetching data: {e}")
        return pd.DataFrame(columns=["timestamp", "value"])

# --- Route to return plot image ---
@app.route('/fan_power_plot.png')
def fan_power_plot():
    df = get_fan_power_data()
    if df.empty:
        return "No data", 404

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df["timestamp"], df["value"], marker="o")
    ax.set_title("Fan Power (Last 2 Hours)")
    ax.set_xlabel("Time")
    ax.set_ylabel("Power (Watts)")
    ax.grid(True)
    fig.autofmt_xdate()

    buf = io.BytesIO()
    plt.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

# --- Dashboard HTML view ---
@app.route('/dashboard')
def dashboard():
    html = """
    <html>
    <head>
        <title>Fan Power Dashboard</title>
        <meta http-equiv="refresh" content="10">  <!-- Auto-refresh every 10s -->
    </head>
    <body style="font-family:sans-serif; text-align:center;">
        <h1>💨 Fan Power Dashboard</h1>
        <p>Auto-updates every 10 seconds</p>
        <img src="/fan_power_plot.png" width="90%">
    </body>
    </html>
    """
    return render_template_string(html)

# --- Run Server ---
if __name__ == '__main__':
    app.run(debug=True, port=5053)
