require('dotenv').config()
const bodyParser = require("body-parser");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

//Sets up EJS
app.set("view engine", "ejs");

//Use body-parser
app.use(bodyParser.urlencoded({
  extended: true
}));

//Use CSS file in the public folder, must be done when using express
app.use(express.static("public"));

//Deprecation warning
mongoose.set('useFindAndModify', false);

mongoose.connect("mongodb://localhost:27017/userDB", {
  // Deprecation warnings
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// Encryption for the password
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = mongoose.model("User", userSchema);


app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
// Stores new username and password in database in the users collection
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
// Saves to DB
  newUser.save((err) => {
    if (err) {
      console.log(err);
    } else {
      res.render("secrets");
    }
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Look through database to find matching username inputted by user
  User.findOne({email: username}, (err, foundUser) => {
    if(err){
      console.log(err);
    } else {
      // If there is a match for the username and then a password match then render secrets page
      if(foundUser){
        if(foundUser.password === password){
          res.render("secrets");
        }
      }
    }
  });

});


app.listen(3000, () => console.log("Server started on port 3000"));
