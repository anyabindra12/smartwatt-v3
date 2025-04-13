import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse
import plotly.graph_objs as go

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

# --- Fetch 2 hours of sensor data from HA ---
def fetch_data(entity_id):
    start_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    url = f"{HA_URL}/history/period/{start_time}?filter_entity_id={entity_id}"

    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        rows = []
        if data and isinstance(data[0], list):
            for entry in data[0]:
                try:
                    ts = parse(entry["last_changed"])
                    val = float(entry["state"])
                    rows.append({"timestamp": ts, "value": val})
                except:
                    continue
        df = pd.DataFrame(rows)
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df.dropna(inplace=True)
        df = df.sort_values("timestamp")

        # Debug summary
        print(f"{entity_id}: count={len(df)}, min={df['value'].min()}, max={df['value'].max()}")

        # Simulate jitter if all values are same
        if df["value"].nunique() <= 1:
            df["value"] += np.random.normal(0, 0.1, size=len(df))

        return df

    except Exception as e:
        print(f"❌ Error fetching {entity_id}: {e}")
        return pd.DataFrame(columns=["timestamp", "value"])

# --- Dash App Layout ---
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])
app.title = "SmartWatt Real-Time Dashboard"

app.layout = html.Div([
    html.H1("📊 SmartWatt Real-Time Sensor Dashboard", className="text-center my-4"),
    dcc.Interval(id='interval', interval=5000000, n_intervals=0),  # 5 seconds

    dbc.Container([
        dbc.Row([
            dbc.Col(dcc.Graph(id='plot-0'), md=6),
            dbc.Col(dcc.Graph(id='plot-1'), md=6),
        ]),
        dbc.Row([
            dbc.Col(dcc.Graph(id='plot-2'), md=6),
            dbc.Col(dcc.Graph(id='plot-3'), md=6),
        ])
    ])
])

# --- Dash Callback: update all plots ---
@app.callback(
    [dash.Output(f"plot-{i}", "figure") for i in range(4)],
    [dash.Input("interval", "n_intervals")]
)
def update_plots(_):
    figures = []
    for i, (entity, label) in enumerate(SENSORS.items()):
        df = fetch_data(entity)
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=df["timestamp"], y=df["value"],
            mode='lines+markers',
            name=label
        ))
        fig.update_layout(
            title=label,
            height=300,
            margin={"l": 20, "r": 20, "t": 40, "b": 20},
            template="plotly_white",
            xaxis_title="Time", yaxis_title=label
        )
        figures.append(fig)
    return figures

if __name__ == '__main__':
    app.run_server(debug=True, port=8050)
