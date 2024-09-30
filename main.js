require("dotenv").config();
const express = require("express");
const session = require("express-session");
const morgan = require("morgan");
const resmaker = require("express-resmaker").default;

// Socket started
require("./socket");

// Scheduler running
require("./scheduler");

const app = express();
const PORT = process.env.APP_PORT || 5000;
const version = process.env.API_VERSION;

app.use(morgan());
app.use(express.urlencoded());
app.use(express.json());
app.use(resmaker);

app.use(
  session({
    secret: "my_secrect_key",
    saveUninitialized: true,
    resave: false,
  })
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

//use public
app.use(express.static("public"));

const verifyToken = require("./middlewares/verify.token");

const authRouter = require("./routes/auth.routes");
const liveRouter = require("./routes/daily.live.routes");
const resultRouter = require("./routes/result.routes");

app.use(version + "/generate", authRouter);
app.use(version + "/live", liveRouter);
app.use(version + "/result", resultRouter);

app.listen(PORT, () => {
  console.log(`Server  : 🚀 Listening on port ` + PORT);
});
