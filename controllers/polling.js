const fs = require("fs");

const pollingService = async (req, res) => {
  const { id } = req.query;

  let attempts = 0;
  const maxAttempts = 60; // e.g. check 60 times (1 min total)
  const interval = 1000;  // 1 second

  const intervalId = setInterval(() => {
    const filePath = `output/${id}/vocals.wav`;
    const isExists = fs.existsSync(filePath);
    console.log(id, "exists:", isExists);

    if (isExists) {
      clearInterval(intervalId);
      res.status(200).json({
        message: "File found",
        isProcessed: true,
      });
    } else if (++attempts >= maxAttempts) {
      clearInterval(intervalId);
      res.status(200).json({
        message: "File not found after timeout",
        isProcessed: false,
      });
    }
  }, interval);

  // Clean up if client disconnects
  req.on("close", () => {
    clearInterval(intervalId);
  });
};

module.exports = { pollingService };
