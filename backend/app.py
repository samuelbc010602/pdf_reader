
from flask import Flask
from flask_cors import CORS

from extensions import login_manager, csrf

from extensions import csrf

app = Flask(__name__)

app.config.from_object("config")

CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5177"]
)

# Initialize Flask extensions
login_manager.init_app(app)
csrf.init_app(app)

# Register routes
from routes.auth_routes import auth_bp
from routes.signatures_routes import signature_bp
from routes.dashboard_routes import dashboard_bp

app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(signature_bp, url_prefix="/api")

# Exempt signature endpoints from CSRF
csrf.exempt(signature_bp)


if __name__ == "__main__":
    app.run(debug=True)
