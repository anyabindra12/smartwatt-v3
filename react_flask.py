from flask import Flask, jsonify
import requests
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse

app = Flask(__name__)

# --- Home Assistant Config ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}


# --- Sensors to query ---
SENSORS = [
    "sensor.maya_fan_power",
    "sensor.maya_solar_panel",
    "sensor.maya_fan_current",
    "sensor.maya_fan_voltage"
]

@app.route("/api/sensor_data", methods=["GET"])
def get_sensor_data():
    all_data = {}
    for sensor in SENSORS:
        start = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        url = f"{HA_URL}/history/period/{start}?filter_entity_id={sensor}"

        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            res.raise_for_status()
            raw = res.json()
            values = []

            if raw and isinstance(raw[0], list):
                for entry in raw[0]:
                    try:
                        ts = parse(entry["last_changed"])
                        val = float(entry["state"])
                        values.append({"t": ts.isoformat(), "y": val})
                    except:
                        continue

            all_data[sensor] = values
        except Exception as e:
            all_data[sensor] = {"error": str(e)}

    return jsonify(all_data)

if __name__ == "__main__":
    app.run(debug=True, port=5055)
