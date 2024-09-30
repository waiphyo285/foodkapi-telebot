const cron = require("node-cron");
const socketClient = require("./socket-client");

// const { get2DResult } = require("./services/result.service");
const { getLiveResult } = require("./services/daily.live.service");

// The job fetches the live result by calling the getLiveResult function,
// and then sends the result to the socket client as a JSON string.
cron.schedule("*/20 16 * * *", async () => {
  const currentMinute = new Date().getMinutes();
  if (currentMinute >= 0 && currentMinute < 30) {
    const liveResult = await getLiveResult();
    socketClient.send(JSON.stringify(liveResult));
  }
});
