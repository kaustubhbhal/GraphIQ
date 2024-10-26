# flask-api/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)

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


if __name__ == '__main__':
    app.run(port=5000)  # You can change the port if needed
