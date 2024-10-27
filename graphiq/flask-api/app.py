# flask-api/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from agent import Model


app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

@app.route('/api/save_diagram', methods=['POST'])
def save_diagram():
    data = request.json
    diagram = data.get('diagram')

    # Save the diagram to a file or database
    with open('saved_diagram.svg', 'w') as f:
        f.write(diagram)

    return jsonify({"message": "Diagram saved successfully!"}), 200

@app.route('/test', methods=['GET'])
def test():
    return "This is a testing message for testing purposes."

my_model = Model()

@app.route('/chat', methods=['POST'])
def chat():
    # Get the input from the request JSON
    data = request.json
    user_message = data.get('message', '')

    # Call the chat function with the user's message
    response = my_model.chat(user_message)

    # Return the response in JSON format
    return jsonify(response)

if __name__ == '__main__':
    app.run(port=5000)  # You can change the port if needed
