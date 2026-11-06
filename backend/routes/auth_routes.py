
from flask import Blueprint, jsonify, request, session
from flask_login import (
    UserMixin,
    login_user,
    logout_user,
    current_user,
    login_required
)
from flask_wtf.csrf import generate_csrf
from werkzeug.security import ( generate_password_hash,check_password_hash )

from contextlib import closing
from psycopg2.errors import UniqueViolation
from extensions import login_manager, csrf

from database import get_connection


auth_bp = Blueprint("auth", __name__)


# Lightweight user object for Flask-Login.
# No SQLAlchemy model is needed.
class User(UserMixin):

    def __init__(self, user_id, name, mail, password_hash):
        self.user_id = user_id
        self.name = name
        self.mail = mail
        self.password_hash = password_hash

    @property
    def id(self):
        return str(self.user_id)

    @property
    def username(self):
        return self.name

    @property
    def email(self):
        return self.mail


def get_user_by_id(user_id):
    with closing(get_connection()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT user_id, name, mail, password_hash
                FROM users
                WHERE user_id = %s;
            """, (user_id,))

            row = cursor.fetchone()

    if not row:
        return None

    return User(*row)


def get_user_by_email(email):
    with closing(get_connection()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT user_id, name, mail, password_hash
                FROM users
                WHERE mail = %s;
            """, (email,))

            row = cursor.fetchone()

    if not row:
        return None

    return User(*row)


# Flask-Login retrieves the user from the session using this function.
@login_manager.user_loader
def load_user(user_id):
    try:
        return get_user_by_id(int(user_id))
    except (ValueError, TypeError):
        return None


@auth_bp.get("/csrf")
def get_csrf():
    return jsonify(csrf_token=generate_csrf())


@auth_bp.post("/register")
def register():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "")
    username = data.get("username", "")
    password = data.get("password", "")

    if not all(
        isinstance(value, str)
        for value in [email, username, password]
    ):
        return jsonify(error="Invalid input"), 400

    email = email.strip().lower()
    username = username.strip()

    if not email or not username or not password:
        return jsonify(error="All fields are required"), 400

    password_hash = generate_password_hash(
        password,
        method="scrypt"
    )

    try:
        with closing(get_connection()) as conn:
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO users (
                            name,
                            mail,
                            password_hash
                        )
                        VALUES (%s, %s, %s)
                        RETURNING user_id;
                    """, (
                        username,
                        email,
                        password_hash
                    ))

                    user_id = cursor.fetchone()[0]

    except UniqueViolation:
        return jsonify(error="Email is already registered"), 409

    return jsonify(
        message="Account created",
        user_id=user_id
    ), 201


@auth_bp.post("/login")
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "")
    password = data.get("password", "")

    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify(error="Invalid email or password"), 400

    user = get_user_by_email(email.strip().lower())

    if not user or not check_password_hash(
        user.password_hash,
        password
    ):
        return jsonify(error="Invalid email or password"), 401

    # Clear previous anonymous session state.
    session.clear()

    login_user(user, remember=False, fresh=True)
    session.permanent = True

    return jsonify(message="Logged in")


@auth_bp.get("/me")
@login_required
def me():
    return jsonify(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username
    )


@auth_bp.post("/logout")
@login_required
def logout():

    logout_user()
    session.clear()

    return jsonify(message="Logged out")
