const { authenticateUser } = require("../services/auth.service");

async function login(req, res) {
  try {
    const hashKey = req.header("wushuwar");
    const result = await authenticateUser(hashKey);
    return result
      ? res.success(result)
      : res.unauthorized("Authentication failed");
  } catch (error) {
    res.serverError("Something went wrong");
  }
}

module.exports = { login };
