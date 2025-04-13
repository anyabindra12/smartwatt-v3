# from fastapi import FastAPI
# from fastapi.responses import HTMLResponse
# from jinja2 import Template
# import requests
# from datetime import datetime, timedelta, timezone
# from dateutil.parser import parse

# app = FastAPI()

# # --- Home Assistant Setup ---
# HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
# TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
# HEADERS = {
#     "Authorization": f"Bearer {TOKEN}",
#     "Content-Type": "application/json"
# }

# SENSORS = {
#     "sensor.maya_fan_power": "💨 Fan Power (W)",
#     "sensor.maya_solar_panel": "☀️ Solar Output (W)",
#     "sensor.maya_fan_current": "⚡ Fan Current (A)",
#     "sensor.maya_fan_voltage": "🔋 Fan Voltage (V)"
# }

# # --- HTML Template (Jinja2 + HTMX) ---
# TEMPLATE = Template("""
# <!DOCTYPE html>
# <html>
# <head>
#     <title>SmartWatt HTMX Dashboard</title>
#     <script src="https://unpkg.com/htmx.org@1.9.2"></script>
#     <style>
#         body { font-family: sans-serif; padding: 2rem; background: #f8f9fa; }
#         .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
#         .card { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
#         h2 { margin-bottom: 0.5rem; }
#     </style>
# </head>
# <body>
#     <h1>📊 SmartWatt HTMX Live Dashboard</h1>
#     <div class="grid" hx-get="/dashboard" hx-trigger="every 5s" hx-swap="innerHTML">
#         {% for sensor, values in data.items() %}
#         <div class="card">
#             <h2>{{ labels[sensor] }}</h2>
#             <p><strong>Latest:</strong> {{ values[-1].y if values else "N/A" }}</p>
#             <ul>
#                 {% for point in values[-5:] %}
#                     <li>{{ point.t[-8:] }} – {{ point.y }}</li>
#                 {% endfor %}
#             </ul>
#         </div>
#         {% endfor %}
#     </div>
# </body>
# </html>
# """)

# # --- Fetch data from Home Assistant ---
# def fetch_sensor_data(sensor_id):
#     try:
#         since = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
#         url = f"{HA_URL}/history/period/{since}?filter_entity_id={sensor_id}"
#         res = requests.get(url, headers=HEADERS, timeout=10)
#         res.raise_for_status()
#         raw = res.json()

#         records = []
#         if raw and isinstance(raw[0], list):
#             for r in raw[0]:
#                 try:
#                     ts = parse(r["last_changed"]).isoformat()
#                     val = float(r["state"])
#                     records.append({"t": ts, "y": val})
#                 except:
#                     continue
#         return records
#     except Exception as e:
#         return []

# # --- Routes ---
# @app.get("/", response_class=HTMLResponse)
# async def root():
#     return await render_dashboard()

# @app.get("/dashboard", response_class=HTMLResponse)
# async def render_dashboard():
#     data = {}
#     for sensor_id in SENSORS:
#         data[sensor_id] = fetch_sensor_data(sensor_id)
#     return TEMPLATE.render(data=data, labels=SENSORS)

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from jinja2 import Template
import requests
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse

app = FastAPI()

# --- Home Assistant Config ---
HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

SENSORS = {
    "sensor.maya_fan_power": "💨 Fan Power (W)",
    "sensor.maya_solar_panel": "☀️ Solar Output (W)",
    "sensor.maya_fan_current": "⚡ Fan Current (A)",
    "sensor.maya_fan_voltage": "🔋 Fan Voltage (V)"
}

TEMPLATE = Template("""
<!DOCTYPE html>
<html>
<head>
    <title>SmartWatt HTMX + Chart.js</title>
    <script src="https://unpkg.com/htmx.org@1.9.2"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: sans-serif; padding: 2rem; background: #f8f9fa; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .card { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        canvas { width: 100%; height: 200px; }
    </style>
</head>
<body>
    <h1>📊 SmartWatt Live Charts</h1>
    <div class="grid" hx-get="/dashboard" hx-trigger="every 30s" hx-swap="innerHTML">
        {% for sensor, values in data.items() %}
        <div class="card">
            <h2>{{ labels[sensor] }}</h2>
            <p><strong>Latest:</strong> {{ values[-1].y if values else "N/A" }}</p>
            <canvas id="{{ sensor }}_chart"></canvas>
            <script>
                const ctx{{ loop.index }} = document.getElementById('{{ sensor }}_chart').getContext('2d');
                new Chart(ctx{{ loop.index }}, {
                    type: 'line',
                    data: {
                        labels: {{ values | map(attribute='t') | list }},
                        datasets: [{
                            label: '{{ labels[sensor] }}',
                            data: {{ values | map(attribute='y') | list }},
                            borderColor: 'rgba(13, 110, 253, 1)',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            tension: 0.3,
                            fill: true,
                        }]
                    },
                    options: {
                        animation: false,
                        responsive: true,
                        scales: {
                            x: { ticks: { autoSkip: true, maxTicksLimit: 6 } },
                            y: { beginAtZero: false }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            </script>
        </div>
        {% endfor %}
    </div>
</body>
</html>
""")

def fetch_sensor_data(sensor_id):
    try:
        since = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        url = f"{HA_URL}/history/period/{since}?filter_entity_id={sensor_id}"
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        raw = res.json()

        records = []
        if raw and isinstance(raw[0], list):
            for r in raw[0]:
                try:
                    ts = parse(r["last_changed"]).strftime("%H:%M:%S")
                    val = float(r["state"])
                    records.append({"t": ts, "y": val})
                except:
                    continue
        return records
    except Exception as e:
        print(f"Error fetching {sensor_id}: {e}")
        return []

@app.get("/", response_class=HTMLResponse)
async def root():
    return await render_dashboard()

@app.get("/dashboard", response_class=HTMLResponse)
async def render_dashboard():
    data = {sensor: fetch_sensor_data(sensor) for sensor in SENSORS}
    return TEMPLATE.render(data=data, labels=SENSORS)
