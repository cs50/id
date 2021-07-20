import os

from authlib.integrations.django_client import OAuth
from django.shortcuts import redirect, render
from django.urls import reverse

# Check for environment variables
for variable in ["CLIENT_ID", "CLIENT_SECRET", "SERVER_METADATA_URL"]:
    if not os.environ.get(variable):
        raise RuntimeError(f"Missing {variable}")

# Configure OAuth
oauth = OAuth()
oauth.register(
    "cs50",
    client_id=os.environ.get("CLIENT_ID"),
    client_kwargs={"scope": "openid profile email"},
    client_secret=os.environ.get("CLIENT_SECRET"),
    server_metadata_url=os.environ.get("SERVER_METADATA_URL")
)


def index(request):
    return render(request, "index.html", {
        "userinfo": request.session.get("userinfo")
    })


def login(request):
    redirect_uri = request.build_absolute_uri(reverse("callback"))
    return oauth.cs50.authorize_redirect(request, redirect_uri=redirect_uri)


def callback(request):
    token = oauth.cs50.authorize_access_token(request)
    request.session["userinfo"] = oauth.cs50.parse_id_token(request, token)
    return redirect(reverse("index"))


def logout(request):
    request.session.flush()
    return redirect(reverse("index"))
