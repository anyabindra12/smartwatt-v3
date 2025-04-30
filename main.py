# Erika Ramirez, Apr 29 2025
# Python file to integrate python backend with react

import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os


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


@app.get("/forecast-plot")
def get_forecast_plot():
    # Run the forecast script before serving the image
    # result = subprocess.run(["python", "solar6.py"],
    #                         capture_output=True, text=True)

    # if result.returncode != 0:
    #     return {"error": "Failed to generate plot", "details": result.stderr}

    file_path = "solar_forecast_plot.png"
    if os.path.exists(file_path):
        return FileResponse(path=file_path, media_type='image/png')
    else:
        return {"error": "Plot not found"}
