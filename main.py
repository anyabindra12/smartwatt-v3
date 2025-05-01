# Erika Ramirez, Apr 29 2025
# Python file to integrate python backend with react

import subprocess
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import random
import logging
import os
import json
import openai
import requests
from datetime import datetime, timedelta, timezone
from dateutil.parser import parse
from fastapi import Form
from dotenv import load_dotenv

app = FastAPI()

# Allow your Vite dev server origin (adjust the port if needed)
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # or ["*"] for dev (less secure)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "erika"}


@app.get("/api/EnergyConsumptionChart")
def get_EnergyConsumptionChart():
    return {
        "time": datetime.now().strftime("%H:%M:%S"),
        "value": random.uniform(0, 100)
    }


# ── Home Assistant API ──

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartwatt")

HA_URL = "https://pi4assistant.oryx-snares.ts.net/"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

SENSORS = {
    # Fans
    "sensor.maya_bedroom_hvac_power": "Bedroom HVAC Power (W)",
    "sensor.maya_kitchen_hvac_power": "Kitchen HVAC Power (W)",
    "sensor.maya_laundry_hvac_power": "Laundry HVAC Power (W)",

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
    {"name": "ESP Laundry HVAC", "entity": "fan.esp_laundry_hvac"},

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

RECENT_FILE = "recent_optimizations.json"
SCHEDULE_FILE = "schedules.json"


def load_recent():
    if os.path.exists(RECENT_FILE):
        return json.load(open(RECENT_FILE))
    return []


def save_recent(opt):
    recent = load_recent()
    recent.insert(0, opt)
    recent = recent[:5]  # keep only last 5
    json.dump(recent, open(RECENT_FILE, "w"), indent=2)


def load_json(path): return json.load(
    open(path)) if os.path.exists(path) else {}


def save_json(path, data): json.dump(data, open(path, "w"), indent=2)


def fetch_state(entity):
    try:
        r = requests.get(f"{HA_URL}/states/{entity}",
                         headers=HEADERS, timeout=5)
        return r.json()["state"]
    except:
        return "unknown"


def fetch_sensor_data(entity):
    try:
        since = (datetime.now(timezone.utc) -
                 timedelta(minutes=30)).isoformat()
        url = f"{HA_URL}/history/period/{since}?filter_entity_id={entity}"
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        points = []
        for r in res[0]:
            try:
                ts = parse(r["last_changed"]).astimezone().strftime("%I:%M %p")
                val = float(r["state"])
                points.append({"t": ts, "y": val})
            except:
                continue
        return points
    except:
        return []


@app.post("/control")
async def control_device(entity_id: str = Form(...), action: str = Form(...)):
    domain = entity_id.split(".")[0]
    requests.post(f"{HA_URL}/services/{domain}/{action}",
                  headers=HEADERS, json={"entity_id": entity_id})
    return RedirectResponse(url="/", status_code=303)


@app.post("/schedule")
async def schedule_device(entity: str = Form(...), start: str = Form(...), end: str = Form(...)):
    logger.info(
        f" Schedule POST received → entity={entity}, start={start}, end={end}")
    schedules = load_json(SCHEDULE_FILE)
    schedules[entity] = {
        "start": start,
        "end": end,
        # "duration": duration
    }
    save_json(SCHEDULE_FILE, schedules)
    logger.info(f"Schedule saved for {entity}: {schedules[entity]}")
    return RedirectResponse("/", status_code=302)

# CHATBOT

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
openai_api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=openai_api_key)


def chat_with_gpt(prompt):
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # lightweight, low latency alternatives: gpt-4.1-mini or gpt-4.1-nano
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an energy assistant. Always reply with 1–3 brief, clear, and simple sentences. "
                    "Avoid technical jargon unless necessary, and keep your explanations easy to understand."
                    "You know specific details about the user's home energy consumption and are equipped to offer suggestions to optimize"
                )
            },
            {"role": "user", "content": prompt}
        ],
        # Determines how creative (1.0) or deterministic (0.0) the model's responses are
        temperature=0.5,
        # "store" = True
    )

    return response.choices[0].message.content.strip()


@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_input = body.get("message")

    response = chat_with_gpt(user_input)
    return {"reply": response}
