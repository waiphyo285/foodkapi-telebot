const { get2DResult } = require("../services/result.service");

async function getResult(req, res) {
  try {
    const filter = req.body.date;
    const result = await get2DResult(filter);
    res.success(result);
  } catch (error) {
    res.serverError("Something went wrong");
  }
}

module.exports = { getResult };
