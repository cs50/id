import crypto from "node:crypto";

import express from "express";
import session from "express-session";
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import sessionFileStore from "session-file-store";

// Check for environment variables
for (const variable of ["CLIENT_ID", "CLIENT_SECRET", "SERVER_METADATA_URL"]) {
    if (!process.env[variable]) {
        throw new Error(`Missing ${variable}`);
    }
}

// Configure application
const app = express();
app.set("view engine", "ejs");

// Configure session to use filesystem (instead of signed cookies);
// secret only signs the session ID cookie, so a random one will do
const FileStore = sessionFileStore(session);
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: crypto.randomBytes(32).toString("hex"),
    store: new FileStore({ logFn: () => {} })
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure OAuth
const config = await client.discovery(
    new URL(process.env.SERVER_METADATA_URL),
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
);
passport.use("cs50", new Strategy({ config, scope: "openid profile email" }, (tokens, verified) => {
    verified(null, tokens.claims());
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get("/", (req, res) => {
    res.render("index", { userinfo: req.user });
});

app.get("/callback", passport.authenticate("cs50", {
    failureRedirect: "/",
    successRedirect: "/"
}));

app.get("/login", (req, res, next) => {
    // Infer redirect URI from request rather than hardcoding host and port
    passport.authenticate("cs50", {
        callbackURL: new URL("/callback", `${req.protocol}://${req.host}`)
    })(req, res, next);
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

app.listen(8080);
