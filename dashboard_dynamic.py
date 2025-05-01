from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi_utils.tasks import repeat_every
from jinja2 import Template
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split 
from datetime import datetime, timedelta, timezone
import logging
from dateutil.parser import parse
import os, json, requests
from io import BytesIO
import numpy as np
from fastapi import Form
import base64
import matplotlib.pyplot as plt
import pulp
import joblib
from pulp import LpProblem, LpVariable, LpMinimize, lpSum
import json
app = FastAPI()

# ── Home Assistant API ──
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartwatt")

HA_URL = "https://pi4assistant.oryx-snares.ts.net/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# ── Solcast API ──
SOLCAST_API_KEY = "DTdB0DCo2Qd2F9xiV4T6IcuyP5cEtBvt"
SOLCAST_RESOURCE_ID = "c8b2-78e7-8f50-8b7b"
SOLCAST_URL = f"https://api.solcast.com.au/rooftop_sites/{SOLCAST_RESOURCE_ID}/forecasts?format=json&api_key={SOLCAST_API_KEY}"

SCHEDULE_FILE = "schedules.json"

SENSORS = {
    # Fans
    "sensor.maya_bedroom_hvac_power": "Bedroom HVAC Power (W)",
    "sensor.maya_kitchen_hvac_power": "Kitchen HVAC Power (W)",

    # Washing
    "sensor.espee_washing_machine_power": "Washing Machine Power (W)",
    "sensor.maya_dryer_power": "Dryer  Power (W)",

    # Lighting
    "sensor.maya_bedroom_lighting_power": "Bedroom Lighting Power (W)",
    "sensor.maya_garage_lighting_power": "Garage Lighting Power (W)",
    "sensor.maya_kitchen_lighting_power": "Kitchen Lighting Power (W)",
    "sensor.maya_laundry_lighting_power": "Laundry Lighting Power (W)",

    # Charger
    "sensor.maya_ev_charger_power": "EV Charger Power (W)"
}

DEVICES = [
    # Fans
    {"name": "ESP Bedroom HVAC", "entity": "fan.esp_bedroom_hvac"},
    {"name": "ESP Kitchen Lighting", "entity": "fan.esp_kitchen_hvac"},

    # Washing
    {"name": "ESP Washing Machine", "entity": "switch.espee_washing_machine"},
    {"name": "ESP Dryer", "entity": "switch.espee_dryer"},

    # Lighting
    {"name": "ESP Bedroom Lighting", "entity": "switch.espee_bedroom_lighting"},
    {"name": "ESP Garage Lighting", "entity": "switch.espee_garage_lighting"},
    {"name": "ESP Kitchen Lighting", "entity": "switch.espee_kitchen_lighting"},
    {"name": "ESP Laundry Lighting", "entity": "switch.espee_laundry_lighting"},

    # Charger
    {"name": "ESP EV Charger", "entity": "switch.espee_ev_charger"},
]

# ── Utility Functions ──

def forecast_grid_prices(hours=24):
  
    np.random.seed(42)
    base_price = 0.25
    noise = np.random.normal(0, 0.02, size=hours)
    return np.clip(base_price + np.sin(np.linspace(0, 3*np.pi, hours)) * 0.05 + noise, 0.1, 0.5).tolist()


def load_json(path): return json.load(open(path)) if os.path.exists(path) else {}
def save_json(path, data): json.dump(data, open(path, "w"), indent=2)

def fetch_state(entity):
    try:
        r = requests.get(f"{HA_URL}/states/{entity}", headers=HEADERS, timeout=5)
        return r.json()["state"]
    except: return "unknown"


RECENT_FILE = "recent_optimizations.json"

def load_recent():
    if os.path.exists(RECENT_FILE):
        return json.load(open(RECENT_FILE))
    return []

def save_recent(opt):
    recent = load_recent()
    recent.insert(0, opt)
    recent = recent[:5]  # keep only last 5
    json.dump(recent, open(RECENT_FILE, "w"), indent=2)

def fetch_sensor_data(entity):
    try:
        since = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        url = f"{HA_URL}/history/period/{since}?filter_entity_id={entity}"
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        points = []
        for r in res[0]:
            try:
                ts = parse(r["last_changed"]).astimezone().strftime("%I:%M %p")
                val = float(r["state"])
                points.append({"t": ts, "y": val})
            except: continue
        return points
    except: return []

def fetch_average_power(entity_id):
    points = fetch_sensor_data(entity_id)
    if not points:
        return 0.3
    values = [p["y"] for p in points]
    return sum(values) / len(values)

def fetch_prices():
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        url = f"{HA_URL}/history/period/{since.isoformat()}?filter_entity_id=sensor.nord_pool_ger_current_price"
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        entries = res[0]
        values = []
        for r in entries:
            try:
                val = float(r["state"])
                values.append(val)
            except: continue
        return values[-48:]  # last 24h of half-hour slots
    except:
        return [0.3] * 48  # fallback dummy

def fetch_prices2(hours=24):
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        url = f"{HA_URL}/history/period/{since.isoformat()}?filter_entity_id=sensor.nord_pool_ger_current_price"
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        entries = res[0] if res else []

        values = []
        for r in entries:
            try:
                values.append(float(r["state"]))
            except:
                continue

        return values
    except:
        return []

def fetch_prices3():
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=24)
        url = f"{HA_URL}/history/period/{since.isoformat()}?filter_entity_id=sensor.nord_pool_ger_current_price"
        res = requests.get(url, headers=HEADERS, timeout=10).json()

        entries = res[0]
        prices = []

        for r in entries:
            try:
                val = float(r["state"])
                prices.append(val)
            except:
                continue

        # Return most recent 48 entries (30-min intervals for 24h)
        return prices[-48:]
    except Exception as e:
        print(" Error fetching NordPool prices:", e)
        return [0.3] * 48  # fallback dummy

def load_model():
    return joblib.load("models/grid_price_forecaster2.pkl")

def forecast_grid_prices(n=72):
    model = load_model()
    X_future = np.array([[i] for i in range(len(fetch_prices()), len(fetch_prices()) + n)])
    return model.predict(X_future).tolist()

@app.get("/forecast_price", response_class=HTMLResponse)
async def forecast_price_chart():
    values = forecast_grid_prices(24)
    labels = [f"{(8 + i//2):02d}:{'00' if i % 2 == 0 else '30'}" for i in range(24)]
    title = " Forecasted Grid Prices (Next 24h)"
    y_label = "€/kWh"
    color = "#8b5cf6"

    return HTMLResponse(f"""
    <html>
    <head>
      <title>Grid Price Forecast</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
      <style>
        body {{
          background: #f9fafb;
          font-family: sans-serif;
          padding: 2rem;
        }}
        .menu a {{
          margin-right: 1rem;
          font-weight: bold;
          font-size: 1.25rem;
          color: #3b82f6;
          text-decoration: none;
        }}
        #forecastChart {{
          width: 100%;
          height: 600px;
        }}
      </style>
    </head>
    <body>
      <div class="menu">
        <a href="/">🏠 Dashboard</a>
        <a href="/forecast_price">⚡ Grid Price Forecast</a>
      </div>

      <h2>{title}</h2>

      <div id="forecastChart"></div>

      <script>
        const chart = echarts.init(document.getElementById('forecastChart'));
        chart.setOption({{
          tooltip: {{ trigger: 'axis' }},
          xAxis: {{
            type: 'category',
            data: {json.dumps(labels)},
            axisLabel: {{ rotate: 45, fontSize: 14 }}
          }},
          yAxis: {{
            type: 'value',
            name: '{y_label}',
            axisLabel: {{ fontSize: 14 }}
          }},
          series: [{{
            data: {json.dumps(values)},
            type: 'line',
            smooth: true,
            areaStyle: {{ color: '{color}33' }},
            lineStyle: {{ color: '{color}', width: 3 }}
          }}]
        }});
        window.addEventListener('resize', () => chart.resize());
      </script>
    </body>
    </html>
    """)



def fetch_solcast_forecast(raw_only=False):
    try:
        r = requests.get(SOLCAST_URL)
        data = r.json()
        forecasts = []
        for f in data["forecasts"]:
            t = parse(f["period_end"]).astimezone().strftime("%I:%M %p")
            y = f["pv_estimate"] * 1000  # kW to W
            forecasts.append({"t": t, "y": y})

        if raw_only:
            return forecasts  # used for chart display
        return [f["y"] for f in forecasts[:48]]  # used for optimization

    except:
        return [] if raw_only else [0.0] * 48

def fetch_solcast_forecast2():
    try:
        r = requests.get(SOLCAST_URL)
        data = r.json()
        forecasts = []
        for f in data["forecasts"]:
            t = parse(f["period_end"]).astimezone().strftime("%I:%M %p")
            y = f["pv_estimate"] * 1000  # kW to W
            forecasts.append({"t": t, "y": y})
        return forecasts
    except: return []

prices = fetch_prices()
price_labels = [f"{(8 + i//2):02d}:{'00' if i % 2 == 0 else '30'}" for i in range(len(prices))]


# ── Dashboard Template ──
DASHBOARD_TEMPLATE = Template("""
<!DOCTYPE html>
<html>
<head>
  <title>SmartWatt Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1"></script>
  <style>
    html, body {
      font-family: sans-serif;
      margin: 0;
      padding: 0;
      font-size: 1.25rem;
      background: #f9fafb;
      overflow-x: hidden;
    }

    .menu {
      padding: 1rem 2rem;
      background: white;
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid #e5e7eb;
    }

    .menu a {
      margin-right: 1rem;
      text-decoration: none;
      color: #3b82f6;
      font-weight: bold;
    }

    .container {
      padding: 2rem;
      max-width: 100%;
      overflow-y: auto;
      min-height: 100vh;
    }

    .grid-2x2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
    }

    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      width: 100%;
      overflow-x: auto;
    }

    .centered-chart {
      max-width: 1000px;
      margin: 3rem auto;
    }

    canvas {
      height: 400px !important;
      max-width: 100%;
    }

    button {
      padding: 0.5rem 1rem;
      font-size: 1rem;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }

    input[type="time"] {
      font-size: 1.1rem;
      padding: 0.4rem;
      margin-right: 0.5rem;
    }

    .green { background: #22c55e; color: white; }
    .red { background: #ef4444; color: white; }
    .blue { background: #3b82f6; color: white; width: 100%; }
  </style>
</head>
<body>
  <div class="menu">
    <a href="/">Dashboard</a>
    <a href="/forecast">Forecast</a>
    <a href="/optimize">Optimize</a>
    <a href="/history">History</a>
    <a href="/analysis">Analysis</a>
    <a href="/forecast_price">Grid Price Forecast</a>
  </div>

  <div class="container">
    <h1> SmartWatt Dashboard</h1>

    <h2>Devices</h2>
    <div class="grid-2x2">
      {% for device in devices %}
      <div class="card">
        <h3>{{ device.name }}</h3>
        <p>Status: <strong>{{ device.state }}</strong></p>
        <form method="post" action="/control">
          <input type="hidden" name="entity_id" value="{{ device.entity }}">
          <button name="action" value="turn_on" class="green">Turn On</button>
          <button name="action" value="turn_off" class="red">Turn Off</button>
        </form>
        <form method="post" action="/schedule" style="margin-top: 1rem;">
          <input type="hidden" name="entity" value="{{ device.entity }}">
          <label>Start:
            <input type="time" name="start" value="{{ device.schedule.start if device.schedule else '' }}">
          </label>
          <label>End:
            <input type="time" name="end" value="{{ device.schedule.end if device.schedule else '' }}">
          </label>
          <button type="submit" class="blue">Save Schedule</button>
        </form>
      </div>
      {% endfor %}
    </div>

    <h2 style="margin-top:2rem;">Sensor Charts</h2>
    <div class="grid-2x2">
      {% for sensor, values in data.items() %}
      <div class="card">
        <h4>{{ labels[sensor] }}</h4>
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
                borderColor: 'blue',
                backgroundColor: 'rgba(147, 197, 253, 0.3)',
                fill: true,
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              scales: {
                x: { ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 45 } },
                y: { beginAtZero: true }
              }
            }
          });
        </script>
      </div>
      {% endfor %}
    </div>

    <!-- NEW: Grid Prices Chart Centered -->
    <div class="centered-chart card">
      <h3> Grid Prices (€/kWh)</h3>
      <canvas id="grid_price_chart"></canvas>
      <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1"></script>
      <script>
        const ctxGrid = document.getElementById('grid_price_chart').getContext('2d');
        new Chart(ctxGrid, {
          type: 'bar',
          data: {
            labels: {{ price_labels | tojson }},
            datasets: [{
              label: 'Grid Price',
              data: {{ prices | tojson }},
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: '#3b82f6',
              borderWidth: 1
            }]
          },
          options: {
          responsive: true,
          maintainAspectRatio: false,
            scales: {
              y: {
                title: { display: true, text: '€/kWh' },
                beginAtZero: false
              },
              x: {
                ticks: { maxRotation: 45 }
              }
            }
            
          }
        });
      </script>
    </div>
    <!-- END -->
    
  </div>
</body>
</html>
""")

# ── Routes ──
@app.get("/", response_class=HTMLResponse)
async def dashboard():
    schedules = load_json(SCHEDULE_FILE)
    devices_data = []
    active_device_count = 0
    scheduled_count = 0

    for d in DEVICES:
        state = fetch_state(d["entity"])
        sched = schedules.get(d["entity"])
        if state == "on":
            active_device_count += 1
        if sched:
            scheduled_count += 1
        devices_data.append({**d, "state": state, "schedule": sched})

    # Get total solar output from sensor
    solar_data = fetch_sensor_data("sensor.maya_solar_panel")
    total_solar_output = round(sum(p["y"] for p in solar_data), 2)

    return DASHBOARD_TEMPLATE.render(
        devices=devices_data,
        data={k: fetch_sensor_data(k) for k in SENSORS},
        labels=SENSORS,
        active_device_count=active_device_count,
        total_device_count=len(DEVICES),
        scheduled_count=scheduled_count,
        total_solar_output=total_solar_output,
        prices=prices,
        price_labels=price_labels
    )


@app.post("/control")
async def control_device(entity_id: str = Form(...), action: str = Form(...)):
    domain = entity_id.split(".")[0]
    post = requests.post(f"{HA_URL}/services/{domain}/{action}", 
                  headers=HEADERS, json={"entity_id": entity_id})
    print(f"{HA_URL}/services/{domain}/{action} - {entity_id}")
    print(f"\"{entity_id}\"")
    print(post)
    return RedirectResponse(url="/", status_code=303)

@app.get("/optimize", response_class=HTMLResponse)
async def optimize_form():
    recent = load_recent()
    recent_html = ""
    for r in recent:
        recent_html += f"<li><b>{r['device'].split('.')[-1]}</b>: {r['optimal_start']} → {r['optimal_end']} ⏱ {r['duration']}h</li>"
    if not recent:
        recent_html = "<p class='text-gray-500'>No optimizations yet</p>"

    return HTMLResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
      <title>Device Scheduling</title>
      <script src="https://cdn.tailwindcss.com"></script>
      
    </head>
    <body class="bg-gray-50 text-gray-800">
    <div class="menu mb-6">
        <a href="/" class="text-blue-600 hover:underline mr-4">Dashboard</a>
        <a href="/forecast" class="text-blue-600 hover:underline mr-4"> Forecast</a>
        <a href="/optimize" class="text-blue-600 font-bold underline mr-4">Optimize</a>
        <a href="/history" class="text-blue-600 hover:underline mr-4"> History</a>
    </div>

      <div class="max-w-7xl mx-auto py-10 px-6">
        <h1 class="text-3xl font-bold mb-2">Device Scheduling</h1>
        <p class="mb-8 text-gray-500">Schedule your devices to run at optimal times based on energy prices and solar production</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Left form column -->
          <div class="bg-white shadow rounded-lg p-6 col-span-2">
            <h2 class="text-xl font-semibold mb-4">📅 Create New Schedule</h2>
            <form method="post" action="/optimize/suggest" class="space-y-6">

              <div>
                <label class="block font-semibold mb-1">Device</label>
                <select name="entity" class="w-full border rounded px-3 py-2">
                  <option value="switch.maya_big_led">Big LED</option>
                  <option value="fan.maya_pwm_fan">PWM Fan</option>
                  <option value="fan.maya_big_pwm_fan">Big PWM Fan</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold mb-1">Duration (hours)</label>
                <input type="number" name="duration" value="2" min="1" max="24"
                       class="w-full border rounded px-3 py-2">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block font-semibold mb-1">Start Time</label>
                  <input type="time" name="start" value="08:00" class="w-full border rounded px-3 py-2">
                </div>
                <div>
                  <label class="block font-semibold mb-1">End Time</label>
                  <input type="time" name="end" value="20:00" class="w-full border rounded px-3 py-2">
                 
                </div>
                <div>
                    <label class="block text-sm">Preferred Duration (hours):
                    <input type="number" name="duration" min="1" max="24"
                    value="{{ device.schedule.duration if device.schedule and device.schedule.duration else 2 }}"
                    class="w-full border px-2 py-1 rounded">
                </label>
                        
              </div>
             

              <div>
                <label class="block font-semibold mb-1">Priority</label>
                <select name="priority" class="w-full border rounded px-3 py-2">
                  <option value="medium">Medium – Balance time and savings</option>
                  <option value="high">High – Minimize cost</option>
                  <option value="low">Low – Run anytime</option>
                </select>
              </div>

              <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded text-lg">
                 Optimize Schedule
              </button>
            </form>
          </div>

          <!-- Right column: Recent Optimizations -->
          <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4"> Recent Optimizations</h2>
            <ul class="space-y-2 text-sm text-gray-700">
              {recent_html}
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
    """)

from pulp import LpProblem, LpVariable, LpMinimize, lpSum
from datetime import datetime

@app.post("/optimize/suggest", response_class=HTMLResponse)
async def suggest_optimization(entity: str = Form(...),
                                duration: int = Form(...),
                                start: str = Form(...),
                                end: str = Form(...),
                                priority: str = Form(...)):
    
    prices = fetch_prices()
    solar = fetch_solcast_forecast()
    T = min(len(prices), len(solar))

    def time_to_slot(t_str):
        h, m = map(int, t_str.split(":"))
        raw_slot = (h * 60 + m - 480) // 30
        return max(0, min(raw_slot, T - 1))

    start_slot = time_to_slot(start)
    end_slot = time_to_slot(end)

    if start_slot >= end_slot:
        result = {
            "device": entity, "duration": duration,
            "start": start, "end": end,
            "priority": priority,
            "optimal_start": "Invalid",
            "optimal_end": "Invalid"
        }
        save_recent(result)
        return RedirectResponse("/optimize", status_code=302)

    duration_slots = min(duration * 2, end_slot - start_slot)
    weights = [max(0, prices[t] - solar[t]) for t in range(T)]

    model = LpProblem("ContiguousOptimization", LpMinimize)

    # Binary vars: only 1 of them should be 1 (start of block)
    z = {t: LpVariable(f"z_{t}", cat="Binary") for t in range(start_slot, end_slot - duration_slots + 1)}

    # Objective: minimize cost of block of size duration_slots starting from t
    model += lpSum(z[t] * sum(weights[t + i] for i in range(duration_slots)) for t in z)

    # Enforce only one block to be selected
    model += lpSum(z[t] for t in z) == 1

    model.solve()

    # Find block start
    block_start = next((t for t in z if z[t].varValue == 1), None)

    def slot_to_time(s):
        total_minutes = 480 + s * 30
        return datetime.strptime(f"{total_minutes//60}:{total_minutes%60:02d}", "%H:%M").strftime("%H:%M")

    if block_start is None:
        result = {
            "device": entity, "duration": duration,
            "start": start, "end": end,
            "priority": priority,
            "optimal_start": "N/A",
            "optimal_end": "N/A"
        }
    else:
        result = {
            "device": entity, "duration": duration,
            "start": start, "end": end,
            "priority": priority,
            "optimal_start": slot_to_time(block_start),
            "optimal_end": slot_to_time(block_start + duration_slots)
        }

    save_recent(result)
    return RedirectResponse("/optimize", status_code=302)


@app.post("/apply_schedule", response_class=HTMLResponse)
async def apply(schedule_json: str = Form(...)):
    schedule = json.loads(schedule_json)
    apply_schedule(schedule)

    html = "<h2>✅ Schedule Successfully Applied</h2><ul>"
    for entity, times in schedule.items():
        name = next((d["name"] for d in DEVICES if d["entity"] == entity), entity)
        html += f"<li><b>{name}</b>: {times['start']} → {times['end']}</li>"
    html += "</ul><a href='/'>← Back to Dashboard</a>"
    return HTMLResponse(html)

@app.post("/schedule")
async def schedule_device(entity: str = Form(...), start: str = Form(...), end: str = Form(...)):
    logger.info(f" Schedule POST received → entity={entity}, start={start}, end={end}")
    schedules = load_json(SCHEDULE_FILE)
    schedules[entity] = {
        "start": start,
        "end": end,
        # "duration": duration
    }
    save_json(SCHEDULE_FILE, schedules)
    logger.info(f"Schedule saved for {entity}: {schedules[entity]}")
    return RedirectResponse("/", status_code=302)




# ── Optimization Core ──
def run_optimization(devices, prices, solar):
    T = 24  # hourly time slots
    model = pulp.LpProblem("Smart_Scheduling", pulp.LpMinimize)
   

    x = {}

    # Decision variables
    for i, dev in enumerate(devices):
        for t in range(T):
            x[i, t] = pulp.LpVariable(f"x_{i}_{t}", cat="Binary")

    powers = [get_device_power(dev) for dev in devices]

    # Grid usage = device power - solar
    grid_load = []
    for t in range(T):
        total_load = pulp.lpSum(powers[i] * x[i, t] for i in range(len(devices)))
        grid_use = total_load - solar[t]
        grid_load.append(grid_use)

    # Objective: minimize cost from grid
    for t in range(T):
        model += grid_load[t] >= 0
    
    schedules = load_json(SCHEDULE_FILE)
    


    model += pulp.lpSum(prices[t] * grid_load[t] for t in range(T))


 
    for i, dev in enumerate(devices):
        duration = schedules.get(dev["entity"], {}).get("duration", 2)  # default = 2
        model += pulp.lpSum(x[i, t] for t in range(T)) == duration

    model.solve()

    # Format schedule
    schedule = {}
    for i, dev in enumerate(devices):
        run_hours = [t for t in range(T) if pulp.value(x[i, t]) == 1]
        if run_hours:
            schedule[dev["entity"]] = {
                "start": f"{min(run_hours):02d}:00",
                "end": f"{(max(run_hours)+1)%24:02d}:00"
            }

    return schedule

def apply_schedule(schedule):
    existing = load_json(SCHEDULE_FILE)
    for entity_id, times in schedule.items():
        existing[entity_id] = {"start": times["start"], "end": times["end"]}
    save_json(SCHEDULE_FILE, existing)

# ── FastAPI Endpoint ──
@app.get("/recommend", response_class=HTMLResponse)
async def recommend():
    prices = fetch_prices()
    solar = fetch_solcast_forecast()
    solar_values = [float(p["y"]) for p in solar]  # flatten forecast values
    schedule = run_optimization(DEVICES, prices, solar_values)

    html = "<h2> Recommended Schedule (Not Applied)</h2><ul>"
    for entity, times in schedule.items():
        name = next((d["name"] for d in DEVICES if d["entity"] == entity), entity)
        html += f"<li><b>{name}</b>: {times['start']} → {times['end']}</li>"
    html += "</ul>"

    html += """
    <form method="post" action="/apply_schedule">
      <input type="hidden" name="schedule_json" value='""" + json.dumps(schedule) + """'>
      <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 mt-4 rounded">
         Apply This Schedule
      </button>
    </form>
    <br><a href="/">← Back to Dashboard</a>
    """
    return HTMLResponse(html)




def fig_to_img(fig):
    buf = BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode()

@app.get("/analysis", response_class=HTMLResponse)
async def analysis_dashboard():
    def get_power_series(entity_id):
        sensor_id = f"sensor.{entity_id.split('.')[-1]}_power"
        data = fetch_sensor_data(sensor_id)
        values = [p["y"] for p in data]
        # Ensure exactly 25 values
        if len(values) >= 25:
            return values[-25:]
        else:
            return [0.0] * (25 - len(values)) + values

    device_power_series = {
    dev["name"]: get_power_series(dev["entity"]) for dev in DEVICES
}

    # Force prices to 25 entries
    prices = fetch_prices()
    if len(prices) >= 25:
        prices = prices[-25:]
    else:
        prices = [0.3] * (25 - len(prices)) + prices

    # Now safe to do matrix math
    power_matrix = np.array(list(device_power_series.values()))  # shape: (N devices, 25)
    price_array = np.array(prices)  # shape: (25,)
    total_costs_by_time = np.sum(power_matrix, axis=0) * price_array  # ✅ shape (25,)


    category_map = {
        "Big LED": "Lighting",
        "Small LED": "Lighting",
        "PWM Fan": "HVAC",
        "Big PWM Fan": "HVAC",
    }


    device_totals = {
    dev["name"]: sum(get_power_series(dev["entity"]))
    for dev in DEVICES
    }
    labels = list(device_totals.keys())
    values = list(device_totals.values())

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(labels, values, color="#3b82f6")
    ax.set_ylabel("Total Power (W)")
    ax.set_title("🔋 Power Consumption by Device")
    ax.tick_params(axis='x', rotation=30)
    plt.tight_layout()

    img_power = fig_to_img(fig)
    plt.close(fig)

    return HTMLResponse(f"""
<html>
<head><title>Power Breakdown</title></head>
<body style="font-family:sans-serif;padding:2rem;">
  <h1>Device Power Consumption Breakdown</h1>
  <img src="data:image/png;base64,{img_power}" />
  <br><a href="/">← Back to Dashboard</a>
</body>
</html>
""")

@app.get("/forecast", response_class=HTMLResponse)
async def forecast_chart(mode: str = "24h"):
    forecasts = fetch_solcast_forecast2()
    if mode == "7d":
        data = forecasts[:7*24]
        title = "📅 7-Day Solar Forecast"
    else:
        data = forecasts[:24]
        title = "🔄 Next 24h Solar Forecast"

    labels = [p["t"] for p in data]
    values = [p["y"] for p in data]

    labels_json = json.dumps(labels)
    values_json = json.dumps(values)

    return HTMLResponse(f"""
    <html>
    <head>
      <title>Forecast Chart</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
      <style>
        html, body {{
          margin: 0;
          padding: 0;
          height: 100%;
          background: #f9fafb;
          font-family: sans-serif;
        }}
        .menu {{
          padding: 1rem 2rem;
          background: white;
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid #e5e7eb;
        }}
        .menu a {{
          margin-right: 1rem;
          font-weight: bold;
          font-size: 1.25rem;
          color: #3b82f6;
          text-decoration: none;
        }}
        .container {{
          padding: 2rem;
        }}
        h2 {{
          font-size: 2rem;
          margin-bottom: 1rem;
        }}
        select {{
          font-size: 1.2rem;
          padding: 0.6rem;
          margin-top: 0.5rem;
          margin-bottom: 2rem;
        }}
        #forecastChart {{
          width: 100%;
          height: 600px;
        }}
      </style>
    </head>
    <body>
      <div class="menu">
        <a href="/">Dashboard</a>
        <a href="/forecast"> Forecast</a>
      </div>

      <div class="container">
        <h2>{title}</h2>
        <form method="get">
          <label style="font-size: 1.25rem;">
            Forecast:
            <select name="mode" onchange="this.form.submit()">
              <option value="24h" {"selected" if mode == "24h" else ""}>Next 24 Hours</option>
              <option value="7d" {"selected" if mode == "7d" else ""}>Next 7 Days</option>
            </select>
          </label>
        </form>

        <div id="forecastChart"></div>
      </div>

      
      <script>
        const chart = echarts.init(document.getElementById('forecastChart'));
        const option = {{
          tooltip: {{ trigger: 'axis' }},
          xAxis: {{
            type: 'category',
            data: {labels_json},
            axisLabel: {{ rotate: 45, fontSize: 14 }}
          }},
          yAxis: {{
            type: 'value',
            name: 'Watts (W)',
            axisLabel: {{ fontSize: 14 }}
          }},
          series: [{{
            data: {values_json},
            type: 'line',
            smooth: true,
            areaStyle: {{ color: '#fde68a' }},
            lineStyle: {{ color: '#f59e0b', width: 2 }}
          }}]
        }};
        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
      </script>
    </body>
    </html>
    """)
from collections import defaultdict
@app.get("/history", response_class=HTMLResponse)
async def device_history(view_range: str = "1h"):
    now = datetime.now(timezone.utc)

    if view_range == "24h":
        since = now - timedelta(hours=24)
        interval = timedelta(minutes=60)
        title = " Device Usage Timeline (Last 24 Hours)"
    else:
        since = now - timedelta(hours=1)
        interval = timedelta(minutes=6)
        title = " Device Usage Timeline"

    timestamps = [(since + i * interval).astimezone().strftime("%H:%M") for i in range(25)]
    device_states = defaultdict(list)

    for d in DEVICES:
        entity_id = d["entity"]
        try:
            url = f"{HA_URL}/history/period/{since.isoformat()}?filter_entity_id={entity_id}&minimal_response"
            res = requests.get(url, headers=HEADERS, timeout=10).json()
            entity_history = res[0] if res else []

            timeline = [(parse(e["last_changed"]).astimezone().strftime("%H:%M"), e["state"]) for e in entity_history]
            j = 0
            last_state = "off"
            filled = []
            for t in timestamps:
                while j < len(timeline) and timeline[j][0] <= t:
                    last_state = timeline[j][1]
                    j += 1
                filled.append((t, "on" if last_state == "on" else "off"))
            device_states[d["name"]] = filled
        except:
            continue

    return HTMLResponse(f"""
    <html>
    <head>
      <title>Device History</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{
          font-family: sans-serif;
          background: #f9fafb;
          padding: 2rem;
        }}
        .menu a {{
          margin-right: 1rem;
          font-weight: bold;
          font-size: 1.1rem;
          color: #3b82f6;
          text-decoration: none;
        }}
        .range-selector {{
          margin-top: 1rem;
          font-size: 1rem;
        }}
        .timeline {{
          overflow-x: auto;
          white-space: nowrap;
          margin-top: 2rem;
          border-top: 1px solid #ddd;
        }}
        .device-row {{
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
        }}
        .device-label {{
          width: 140px;
          font-weight: bold;
          flex-shrink: 0;
          font-size: 1.1rem;
        }}
        .bar {{
          width: 32px;
          height: 32px;
          margin-right: 3px;
          display: inline-block;
          border-radius: 4px;
        }}
        .on {{
          background-color: #4ade80;
        }}
        .off {{
          background-color: #e5e7eb;
        }}
        .timestamp-row {{
          display: flex;
          margin-left: 140px;
          gap: 3px;
        }}
        .timestamp {{
          width: 32px;
          font-size: 0.75rem;
          text-align: center;
          color: #555;
        }}
      </style>
    </head>
    <body>
      <div class="menu">
        <a href="/">Dashboard</a>
        <a href="/forecast">Forecast</a>
        <a href="/history"> History</a>
      </div>

      <h2>{title}</h2>
      <div class="range-selector">
        View:
        <a href="/history?range=1h">Last Hour</a> | 
        <a href="/history?range=24h">Last 24 Hours</a>
      </div>

      <div class="timeline">
        {''.join(f'''
        <div class="device-row">
          <div class="device-label">{device}</div>
          {''.join(f'<div class="bar {state}"></div>' for _, state in states)}
        </div>
        ''' for device, states in device_states.items())}

        <div class="timestamp-row">
          {''.join(f'<div class="timestamp">{ts}</div>' for ts in timestamps)}
        </div>
      </div>
    </body>
    </html>
    """)

# ── Scheduled Device Logic ──
@app.on_event("startup")
@repeat_every(seconds=60)
def run_scheduled_control():
    now = datetime.now().time()
    schedules = load_json(SCHEDULE_FILE)
    for d in DEVICES:
        eid = d["entity"]
        sched = schedules.get(eid)
        if not sched: continue
        try:
            st = datetime.strptime(sched["start"], "%H:%M").time()
            en = datetime.strptime(sched["end"], "%H:%M").time()
            should_on = st <= now <= en
            action = "turn_on" if should_on else "turn_off"
            domain = eid.split(".")[0]
            requests.post(f"{HA_URL}/services/{domain}/{action}", headers=HEADERS, json={"entity_id": eid})
        except: continue
