#!/usr/bin/env python3
"""
ha_power_history_json.py
~~~~~~~~~~~~~~~~~~~~~~~~

Return **raw JSON** history for every sensor in the SENSORS dict below
(-- the same set you pasted).  Each sensor maps to a list of
`{"t": <ISO-timestamp>, "v": <float>}` objects covering the last 24 h.

Usage
-----
    python ha_power_history_json.py   >  history.json

`history.json` will look like:

```json
{
  "sensor.maya_bedroom_hvac_power": [
    {"t": "2025-04-29T20:30:01.713530+00:00", "v": 0.0},
    {"t": "2025-04-29T20:45:01.987654+00:00", "v": 113.4},
    ...
  ],
  "sensor.maya_solar_panel": [...],
  ...
}
``` 
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from typing import Dict, List

import requests

# ── Home-Assistant credentials ──────────────────────────────────────────────
HA_URL: str = "https://pi4assistant.oryx-snares.ts.net"
TOKEN: str = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwi"
    "ZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
)
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# ── Sensors you want in the JSON output ──────────────────────────────────────
SENSORS: Dict[str, str] = {
    # Fans
    "sensor.maya_bedroom_hvac_power": "Bedroom HVAC Power (W)",
    "sensor.maya_solar_panel": "Solar Output (W)",
    "sensor.maya_kitchen_hvac_power": "Kitchen HVAC Power (W)",
    "sensor.maya_laundry_hvac_power": "Laundry HVAC Power (W)",

    # Washing
    "sensor.espee_washing_machine_power": "Washing Machine Power (W)",
    "sensor.maya_dryer_power": "Dryer Power (W)",

    # Lighting
    "sensor.maya_bedroom_lighting_power": "Bedroom Lighting Power (W)",
    "sensor.maya_garage_lighting_power": "Garage Lighting Power (W)",
    "sensor.maya_kitchen_lighting_power": "Kitchen Lighting Power (W)",
    "sensor.maya_laundry_lighting_power": "Laundry Lighting Power (W)",

    # Charger
    "sensor.maya_ev_charger_power": "EV Charger Power (W)",
}

# ── Helper ───────────────────────────────────────────────────────────────────


def fetch_series(entity_id: str, hours: int = 24) -> List[dict]:
    """Return list of {t, v} dictionaries for *entity_id* covering last *hours*."""
    since = (dt.datetime.utcnow() - dt.timedelta(hours=hours)).isoformat()
    url = (
        f"{HA_URL}/api/history/period/{since}"
        f"?filter_entity_id={entity_id}"
        f"&include_start_time_state=true&timezone=UTC"
    )
    r = requests.get(url, headers=HEADERS, timeout=10)
    r.raise_for_status()
    data = r.json()
    if not data:
        return []

    series: List[dict] = []
    for rec in data[0]:
        state = rec.get("state", "")
        try:
            val = float(state)
            series.append({"t": rec["last_changed"], "v": val})
        except ValueError:
            continue  # skip 'unavailable', 'unknown', etc.
    return series

# ── Main ────────────────────────────────────────────────────────────────────


def main() -> None:
    bundle = {eid: fetch_series(eid) for eid in SENSORS}
    with open("devices.json", "w") as f:
        json.dump(bundle, f, indent=2)


if __name__ == "__main__":
    main()
