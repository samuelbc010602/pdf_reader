from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/api/documents", methods=["GET"])
def get_documents():
    documents = [
        {"id": 1, "title": "My first document"},
        {"id": 2, "title": "React learning notes"},
        {"id": 3, "title": "Project ideas"},
    ]

    return jsonify(documents)

@app.route("/api/options", methods=["GET"])
def get_options():
    options = [
        "New",
        "Open",
        "Sigature",
        "Export"
    ]

    return jsonify(options)

if __name__ == "__main__":
    app.run(debug=True, port=5000)