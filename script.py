import requests
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from dateutil.parser import parse

# --- CONFIG ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
ENTITY_ID = "sensor.nord_pool_ger_current_price"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# --- Fetch history over a week ---
def fetch_sensor_history(entity_id, days=7):
    start_time = (datetime.utcnow() - timedelta(days=days)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        history_data = response.json()

        if history_data and isinstance(history_data[0], list):
            return history_data[0]
        return []

    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to fetch data: {e}")
        return []

# --- Plotting function ---
def plot_history(data):
    timestamps = []
    values = []

    for d in data:
        try:
            ts = parse(d["last_changed"])
            val = float(d["state"])
            timestamps.append(ts)
            values.append(val)
        except (ValueError, KeyError):
            continue  # skip invalid entries

    plt.figure(figsize=(12, 6))
    plt.plot(timestamps, values, marker=".", linestyle='-', linewidth=0.8)
    plt.title("Nordpool Electricity Price History (Last 7 Days)")
    plt.xlabel("Time")
    plt.ylabel("€/kWh")
    plt.xticks(rotation=45)
    plt.grid(True)
    plt.tight_layout()
    plt.savefig("nordpool_week_history.png")
    plt.show()

# --- Run everything ---
if __name__ == "__main__":
    history = fetch_sensor_history(ENTITY_ID, days=7)
    if history:
        plot_history(history)
    else:
        print("⚠️ No data retrieved.")
