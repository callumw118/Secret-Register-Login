require('dotenv').config()
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

//Sets up EJS
app.set("view engine", "ejs");

//Use body-parser
app.use(bodyParser.urlencoded({
  extended: true
}));

//Use CSS file in the public folder, must be done when using express
app.use(express.static("public"));

// Tell app to use session package with the default options
app.use(session({
  secret: "A String.",
  resave: false,
  saveUninitialized: false
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

//Deprecation warnings
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose.connect("mongodb://localhost:27017/userDB", {
  // Deprecation warnings
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Encryption for the password using mongoose-encryption
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);

// Setup for passport-local-mongoose
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Configures the Google Authentication Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Finds or creates user into database, uses mongoose findOrCreate
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
  res.render("home");
});

// Sign in page with Google
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect("/secrets");
  });


app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  // Look throught the secret fields in the database selecting the one's which don't equal null
  User.find({"secret": {$ne: null}}, (err, foundUsers) => {
    if(err){
      console.log(err);
    }else {
      if(foundUsers){
        // Render the secrets page and pass over the usersWithSecrets variable to front-end
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", (req, res) => {
  // If user is already authenticated (already logged in during current session)
  // then allowed them to access secrets page
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, (err, foundUser) => {
    if(err){
      console.log(err);
    }else {
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", (req, res) => {
  // Logs out user and clears the login session
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {
// Registers users and adds them to DB
  User.register({username: req.body.username}, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      // Uses passport to authenticate user and saves the current session allowing them to stay logged in
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", (req, res) => {
// Creates a new user
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

// Looks for match in DB and logs in user
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      // Uses passport to authenticate user and saves the current session allowing them to stay logged in
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(3000, () => console.log("Server started on port 3000"));
