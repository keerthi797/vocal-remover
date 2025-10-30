const shortid = require("shortid");
const fs = require("fs");
const { processService } = require("./process");

const uploadService = async (req, res, next) => {
  try {
    const filename = req.headers["file-name"];
    const { chunkId, totalChunks } = req.body;
    
    // Get chunk from req.files (express-fileupload)
    const chunk = req.files?.chunk;
    
    if (!chunk) {
      return res.status(400).json({ error: "No chunk received" });
    }

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads', { recursive: true });
    }

    // Append chunk data to file
    fs.appendFileSync(`./uploads/${filename}`, chunk.data);

    if (parseInt(chunkId) === parseInt(totalChunks)) {
      console.log("All chunks received");
      console.log("Processing file:", filename);
      
      await processService(filename);
      
      res.status(200).json({
        message: "File uploaded successfully",
        processing: true,
      });
    } else {
      console.log(`Chunk ${chunkId}/${totalChunks} received`);
      res.status(200).json({
        message: "Chunk received successfully",
        processing: false,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = uploadService;