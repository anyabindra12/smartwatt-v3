import matplotlib
matplotlib.use('Agg')

import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse
from flask import Flask, jsonify
from flask_cors import CORS

# --- CONFIG ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
ENTITY_ID = "sensor.maya_fan_power"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# --- Flask App ---
app = Flask(__name__)
CORS(app)

@app.route('/api/fan_power', methods=['GET'])
def get_fan_power():
    start_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={ENTITY_ID}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()

        records = []
        if data and isinstance(data[0], list):
            for entry in data[0]:
                try:
                    ts = parse(entry["last_changed"])
                    val = float(entry["state"])
                    records.append({"timestamp": ts.isoformat(), "value": val})
                except:
                    continue

        return jsonify({
            "sensor": ENTITY_ID,
            "data": records[-100:]  # send last 100 data points
        })

    except Exception as e:
        return jsonify({
            "error": "Could not fetch fan power data.",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5052)
