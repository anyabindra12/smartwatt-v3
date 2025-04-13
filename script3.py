import requests

HA_URL = "https://pi4assistant.mayasbigbox.duckdns.org/api"
ENTITY_ID = "sensor.nord_pool_ger_current_price"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI2YWZmZGYzNDdhMmI0Y2U2OGQyOGNlMDM3YmVlZDNhZCIsImlhdCI6MTc0NDQ4NzQ5MSwiZXhwIjoyMDU5ODQ3NDkxfQ.zqjmNHT_xWrYqkaMb7wEIkrvq0yDltwntayRVCSZnxc"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_sensor():
    url = f"{HA_URL}/states/{ENTITY_ID}"
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        print("✅ Success! Here's the sensor state:")
        print(data)
    except requests.exceptions.HTTPError as e:
        print("❌ HTTP error:", e)
    except Exception as e:
        print("❌ Other error:", e)

if __name__ == "__main__":
    test_sensor()
