const cookieParser = require("cookie-parser")
const fetch = require("node-fetch")
const express = require("express")
const session = require("express-session")
const OAuth2Strategy = require("passport-oauth2")
const passport = require("passport")

// Check for environment variables
const variables = ["CLIENT_ID", "CLIENT_SECRET", "SERVER_METADATA_URL"]
variables.forEach((variable) => {
  if (!Object.keys(process.env).includes(variable)) {
    console.log(`Missing ${variable}`)
    process.exit(1)
  }
})

// Configure application
const app = express()
const port = 3000
app.set("view engine", "ejs")
app.use(cookieParser());
app.use(session({
  secret: "example-secret",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

// Configure OAuth
fetch(process.env["SERVER_METADATA_URL"])
  .then(res => res.json())
  .then(config => {
    passport.use(new OAuth2Strategy({
      authorizationURL: config["authorization_endpoint"],
      tokenURL: config["token_endpoint"],
      clientID: process.env["CLIENT_ID"],
      clientSecret: process.env["CLIENT_SECRET"],
      callbackURL: `http://localhost:${port}/callback`
    }, (accessToken, refreshToken, profile, cb) => {
      fetch(`${config["userinfo_endpoint"]}?access_token=${accessToken}`)
        .then(res => res.json())
        .then(json => {return cb(null, json)})
    }))
    passport.serializeUser((user, done) => {done(null, user);});
    passport.deserializeUser((user, done) => {done(null, user);})
  })

app.get("/", (req, res) => {
  res.render("index", {userinfo: req.user})
})

app.get('/callback', passport.authenticate('oauth2', {
  successRedirect: '/',
  failureRedirect: '/login'
}))

app.get("/login", passport.authenticate("oauth2", {
  session: true,
  scope: ["openid", "profile", "email"]
}))

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/")
})

app.listen(port)
