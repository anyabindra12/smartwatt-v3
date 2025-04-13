import requests
import pandas as pd
import streamlit as st
import time
import altair as alt

st.set_page_config(page_title="Fan Power Dashboard", layout="wide")
st.title("💨 Real-Time Fan Power Chart (sensor.maya_fan_power)")

plot_area = st.empty()

# API endpoint
API_URL = "http://localhost:5052/api/fan_power"

while True:
    try:
        res = requests.get(API_URL)
        if res.status_code == 200:
            data = res.json()["data"]
            df = pd.DataFrame(data)

            if not df.empty:
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                df = df.sort_values("timestamp")

                chart = (
                    alt.Chart(df)
                    .mark_line(point=True)
                    .encode(
                        x=alt.X("timestamp:T", title="Time"),
                        y=alt.Y("value:Q", title="Fan Power (Watts)"),
                        tooltip=["timestamp:T", "value:Q"]
                    )
                    .properties(title="Live Fan Power (Last 2 Hours)", height=400)
                    .interactive()
                )

                plot_area.altair_chart(chart, use_container_width=True)
            else:
                st.warning("No data received from sensor.")
        else:
            st.error("Failed to fetch data from API.")

    except Exception as e:
        st.error(f"Error: {e}")

    time.sleep(10)
