const express = require("express");
const liveController = require("../controllers/daily.live.controller");

const router = express.Router();

router.get("/", liveController.getLive);

module.exports = router;
