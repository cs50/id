import os

from authlib.integrations.flask_client import OAuth
from flask import Flask, abort, redirect, render_template, request, session, url_for
from flask_session import Session
from functools import wraps

# Check for environment variables
for variable in ["CLIENT_ID", "CLIENT_SECRET", "SERVER_METADATA_URL"]:
    if not os.environ.get(variable):
        abort(500, f"Missing {variable}")

# Configure application
app = Flask(__name__)

# Ensure templates are auto-reloaded
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configure OAuth
oauth = OAuth(app)
oauth.register(
    "cs50",
    client_id=os.environ.get("CLIENT_ID"),
    client_kwargs={"scope": "openid profile email"},
    client_secret=os.environ.get("CLIENT_SECRET"),
    server_metadata_url=os.environ.get("SERVER_METADATA_URL")
)


# Decorator to require login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("userinfo") is None:
            return redirect(url_for("login", next=request.url))
        return f(*args, **kwargs)
    return decorated_function


@app.route("/")
def index():
    return render_template("index.html", userinfo=session.get("userinfo"))


@app.route("/callback")
def callback():
    token = oauth.cs50.authorize_access_token()
    session["userinfo"] = oauth.cs50.parse_id_token(token)
    return redirect(url_for("index"))


@app.route("/login")
def login():
    return oauth.cs50.authorize_redirect(redirect_uri=url_for("callback", _external=True))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))
