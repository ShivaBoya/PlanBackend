// workers/scheduler.worker.js
const { Queue, Worker } = require("bullmq");
const connection = { host: process.env.REDIS_HOST || "127.0.0.1", port: process.env.REDIS_PORT || 6379 };

const scheduleQueue = new Queue("schedule", { connection });

const worker = new Worker("schedule", async job => {
  const { eventId, pollResults } = job.data;
  // naive logic: pick top poll option and suggest time based on pollResults.availability
  const recommendedPlace = pollResults.topOption || "Local Cafe";
  const recommendedTime = pollResults.preferredTime || "Saturday 6 PM";

  // return schedule (worker could also write to DB)
  return { recommendedPlace, recommendedTime, reason: "Calculated from poll results" };
}, { connection });

module.exports = { scheduleQueue };
