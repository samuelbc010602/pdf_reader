
from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/api/email-replies", methods=["GET", "POST"])
def receive_email_reply():

    print("ReplyFlow webhook reached!")

    if request.method == "GET":
        return jsonify({"status": "Webhook is running"}), 200

    data = request.get_json(silent=True)

    print("Received data:", data)

    return jsonify({"success": True}), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
