const express = require("express");
const resultController = require("../controllers/result.controller");

const router = express.Router();

router.get("/", resultController.getResult);

module.exports = router;
