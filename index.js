const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const port = 5000;
require("dotenv").config();
const admin = require("firebase-admin");

const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wascw.mongodb.net/<dbname>?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("database connected");
});
//firebase authentication
var serviceAccount = require("./configs/burj-al-arab95-firebase-adminsdk-dj3w3-c81641203f.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `${process.env.FIREBASE_DATABASE}`,
});

client.connect((err) => {
  const bookingCollection = client.db("burjdb").collection("bookings");
  app.post("/addBooking", (req, res) => {
    bookingCollection.insertOne(req.body).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/booking", (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = bearer.split(" ")[1];
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          let tokenEmail = decodedToken.email;
          let queryEmail = req.query.email;
          if (tokenEmail === queryEmail) {
            bookingCollection
              .find({ email: req.query.email })
              .toArray((err, documents) => {
                res.send(documents);
              });
          } else {
            res.status(403).send("un-authorized access");
          }
        })
        .catch((error) => {
          res.status(403).send("un-authorized access");
        });
    } else {
      res.status(403).send("un-authorized access");
    }
  });
});

app.listen(port);
