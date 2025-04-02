import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
import os

app = Flask(__name__, template_folder="templates", static_folder="static")

# Stored privately
GEMINI_API_KEY = "-"

genai.configure(api_key=GEMINI_API_KEY)

# List available models
models = genai.list_models()

for model in models:
    print(model.name)


def chat_with_gemini(prompt):
    model = genai.GenerativeModel(model_name="models/gemini-2.5-pro-exp-03-25")
    response = model.generate_content([prompt])
    return response.text if response else "Error: No response from Gemini."


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    user_input = data["message"]
    response = chat_with_gemini(user_input)
    return jsonify({"response": response})


@app.route("/")
def home():
    return render_template("index.html")


if __name__ == "__main__":
    os.makedirs("templates", exist_ok=True)
    with open("templates/index.html", "w") as f:
        f.write("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SmartWatt - Chatbot</title>
            <!-- Bootstrap CSS -->
            <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body {
                    background-color: #f7f7f7;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .chat-container {
                    max-width: 500px;
                    margin: 50px auto;
                    background-color: #fff;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .chat-header {
                    background-color: #007bff;
                    color: white;
                    padding: 15px;
                    text-align: center;
                }
                .chat-window {
                    padding: 20px;
                    height: 400px;
                    overflow-y: scroll;
                    border-bottom: 2px solid #f1f1f1;
                }
                .chat-message {
                    margin-bottom: 20px;
                }
                .user-message {
                    text-align: right;
                    color: #333;
                }
                .bot-message {
                    text-align: left;
                    color: #007bff;
                }
                .input-area {
                    display: flex;
                    padding: 10px;
                    border-top: 2px solid #f1f1f1;
                }
                .input-area input {
                    flex: 1;
                    border-radius: 20px;
                    padding: 10px;
                    border: 1px solid #ddd;
                    margin-right: 10px;
                }
                .input-area button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    padding: 10px 15px;
                }
                .input-area button:hover {
                    background-color: #0056b3;
                }
            </style>
            <script>
                async function sendMessage() {
                    const userInput = document.getElementById("userInput").value;
                    const response = await fetch("/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: userInput })
                    });
                    const data = await response.json();
                    document.getElementById("chat-window").innerHTML += "<div class='chat-message user-message'><b>You:</b> " + userInput + "</div>";
                    document.getElementById("chat-window").innerHTML += "<div class='chat-message bot-message'><b>Bot:</b> " + (data.response || "Error: No response.") + "</div>";
                    document.getElementById("userInput").value = "";
                    document.getElementById("chat-window").scrollTop = document.getElementById("chat-window").scrollHeight;
                }
            </script>
        </head>
        <body>
            <div class="chat-container">
                <div class="chat-header">
                    <h4>Gemini Chatbot</h4>
                </div>
                <div class="chat-window" id="chat-window">
                    <!-- Chat messages will be displayed here -->
                    <div class="chat-message bot-message">Hi I'm SmartWatt! How can I assist you today?</div>
                </div>
                <div class="input-area">
                    <input type="text" id="userInput" placeholder="Type a message...">
                    <button onclick="sendMessage()">Send</button>
                </div>
            </div>
        </body>
        </html>
        """)
    app.run(host="0.0.0.0", port=8000, debug=True)
