# WattBot powered by OpenAI

import openai
import os
from dotenv import load_dotenv
import sqlite3

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
openai_api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=openai_api_key)


def get_openai_models():
    models = client.models.list()

    for model in models.data:
        print(model.id)


def chat_with_gpt(prompt):
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # lightweight, low latency alternatives: gpt-4.1-mini or gpt-4.1-nano
        messages=[{"role": "user", "content": prompt}],
        # Determines how creative (1.0) or deterministic (0.0) the model's responses are
        temperature=0.5,
        # "store" = True
    )

    return response.choices[0].message.content.strip()


def get_energy_consumption(date):
    conn = sqlite3.connect(':memory:')  # Connect to the in-memory database
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM energy_usage WHERE date=?", (date,))
    row = cursor.fetchone()

    conn.close()

    if row:
        return f"On {row[1]}, the energy consumption was {row[2]} kWh."
    else:
        return "No data found for that date."


if __name__ == "__main__":
    while True:
        user_input = input("You: ")
        if user_input.lower() in ["quit", "exit", "bye"]:
            break

        response = chat_with_gpt(user_input)
        print("Chatbot: ", response)
