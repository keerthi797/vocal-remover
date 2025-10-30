const { spawn } = require("child_process");
const fs = require("fs");
const fs_extra = require("fs-extra");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Extract audio from MP4 video
const extractAudioFromVideo = (videoPath, outputAudioPath) => {
  return new Promise((resolve, reject) => {
    console.log(`Extracting audio from: ${videoPath} to: ${outputAudioPath}`);
    ffmpeg(videoPath)
      .output(outputAudioPath)
      .audioCodec('libmp3lame')
      .audioBitrate(320)
      .noVideo()
      .on('start', (commandLine) => {
        console.log('FFmpeg audio extraction command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Audio extraction progress:', progress.percent + '%');
      })
      .on('end', () => {
        console.log('✓ Audio extraction completed');
        resolve(outputAudioPath);
      })
      .on('error', (err) => {
        console.error('Error extracting audio:', err);
        reject(err);
      })
      .run();
  });
};

// Merge processed audio back with original video
const mergeAudioWithVideo = (videoPath, audioPath, outputPath) => {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Starting Video Merge ===`);
    console.log(`Video: ${videoPath}`);
    console.log(`Audio: ${audioPath}`);
    console.log(`Output: ${outputPath}`);
    
    // Check if input files exist
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video file not found: ${videoPath}`));
      return;
    }
    if (!fs.existsSync(audioPath)) {
      reject(new Error(`Audio file not found: ${audioPath}`));
      return;
    }
    
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v copy',        // Copy video codec (no re-encoding)
        '-c:a aac',         // Audio codec AAC
        '-b:a 192k',        // Audio bitrate
        '-map 0:v:0',       // Map video from first input
        '-map 1:a:0',       // Map audio from second input
        '-shortest'         // Match shortest stream duration
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg merge command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Merge progress:', progress.percent + '%');
      })
      .on('end', () => {
        console.log('✓ Video merging completed:', outputPath);
        // Verify the output file exists
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`✓ Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          resolve(outputPath);
        } else {
          reject(new Error('Output file was not created'));
        }
      })
      .on('error', (err) => {
        console.error('Error merging video:', err);
        reject(err);
      })
      .run();
  });
};

const processService = async (filename) => {
  console.log(`\n========== Processing File: ${filename} ==========`);
  
  const isExists = fs.existsSync(`uploads/${filename}`);
  console.log("File exists:", isExists);

  if (!isExists) {
    throw new Error(`File not found: uploads/${filename}`);
  }

  console.log("Starting processing...");
  
  // Determine if file is video or audio
  const isVideo = filename.toLowerCase().endsWith('.mp4');
  const trimmedFilename = filename.replace(/\.(mp3|mp4)$/, "");
  
  let audioFileForProcessing = `uploads/${filename}`;
  let originalVideoPath = null;

  console.log(`File type: ${isVideo ? 'VIDEO (MP4)' : 'AUDIO (MP3)'}`);

  // If it's a video, extract audio first
  if (isVideo) {
    console.log("\n--- Step 1: Extracting Audio from Video ---");
    originalVideoPath = `uploads/${filename}`;
    audioFileForProcessing = `uploads/${trimmedFilename}_extracted.mp3`;
    
    console.log(`Original video path: ${originalVideoPath}`);
    console.log(`Audio will be saved to: ${audioFileForProcessing}`);
    
    try {
      await extractAudioFromVideo(originalVideoPath, audioFileForProcessing);
      console.log("✓ Audio extracted successfully:", audioFileForProcessing);
      
      // Verify extracted audio exists
      if (!fs.existsSync(audioFileForProcessing)) {
        throw new Error("Extracted audio file not found after extraction");
      }
      const audioStats = fs.statSync(audioFileForProcessing);
      console.log(`✓ Extracted audio size: ${(audioStats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error("Failed to extract audio:", error);
      throw new Error("Audio extraction failed: " + error.message);
    }
  }

  console.log("\n--- Step 2: Running Spleeter ---");
  
  // Path to your virtual environment's Python executable
  const pythonPath = "C:\\spleeter\\venv\\Scripts\\python.exe";

  // Spawn spleeter using the venv Python
  const spleeter = spawn(pythonPath, [
    "-m",
    "spleeter",
    "separate",
    "-p",
    "spleeter:2stems-16kHz",
    "-o",
    "output/",
    audioFileForProcessing,
  ]);

  // Collect data from script
  spleeter.stdout.on("data", (data) => {
    console.log(`Spleeter: ${data}`);
  });

  spleeter.stderr.on("data", (data) => {
    console.error(`Spleeter stderr: ${data}`);
  });

  spleeter.on("error", (error) => {
    console.error(`Spawn error: ${error.message}`);
  });

  return new Promise((resolve, reject) => {
    spleeter.on("close", async (code) => {
      console.log(`\nSpleeter process closed with code ${code}`);

      if (code === 0) {
        console.log("✓ Separation completed successfully!");

        // If it was a video, merge ONLY the VOCALS back with video
        if (isVideo) {
          try {
            console.log("\n--- Step 3: Merging Video with Vocals ONLY (Music Removed) ---");
            
            // Spleeter creates output in: output/{audioFilename_without_extension}/vocals.wav and accompaniment.wav
            const spleeterOutputFolder = `output/${path.basename(audioFileForProcessing, '.mp3')}`;
            console.log("Spleeter output folder:", spleeterOutputFolder);
            
            const vocalsPath = path.join(spleeterOutputFolder, 'vocals.wav');
            const accompanimentPath = path.join(spleeterOutputFolder, 'accompaniment.wav');
            
            console.log("Expected vocals path:", vocalsPath);
            console.log("Expected accompaniment path:", accompanimentPath);
            
            // Check if files exist
            if (!fs.existsSync(vocalsPath)) {
              throw new Error(`Vocals file not found: ${vocalsPath}`);
            }
            if (!fs.existsSync(accompanimentPath)) {
              throw new Error(`Accompaniment file not found: ${accompanimentPath}`);
            }
            
            const vocalsStats = fs.statSync(vocalsPath);
            const accompStats = fs.statSync(accompanimentPath);
            
            console.log(`✓ Found vocals: ${vocalsPath} (${(vocalsStats.size / 1024 / 1024).toFixed(2)} MB)`);
            console.log(`✓ Found accompaniment: ${accompanimentPath} (${(accompStats.size / 1024 / 1024).toFixed(2)} MB)`);
            
            // Create output directory if it doesn't exist
            if (!fs.existsSync('output')) {
              fs.mkdirSync('output');
            }

            // Create video with VOCALS ONLY (no music) - THIS IS WHAT YOU WANT!
            const videoVocalsOnly = `output/${trimmedFilename}_vocals_only.mp4`;
            console.log(`\nMerging video with vocals-only audio...`);
            console.log(`Output will be: ${videoVocalsOnly}`);
            
            await mergeAudioWithVideo(originalVideoPath, vocalsPath, videoVocalsOnly);
            
            // Final verification
            if (fs.existsSync(videoVocalsOnly)) {
              const finalStats = fs.statSync(videoVocalsOnly);
              console.log(`\n✓✓✓ SUCCESS! Video with vocals only created: ${videoVocalsOnly}`);
              console.log(`✓✓✓ Final video size: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
            } else {
              throw new Error("Final video file was not created!");
            }

            // Delete extracted audio file
            fs.unlink(audioFileForProcessing, (err) => {
              if (err) console.error("Error deleting extracted audio:", err);
              else console.log("✓ Deleted extracted audio file");
            });

            // Delete original video from uploads
            fs.unlink(originalVideoPath, (err) => {
              if (err) console.error("Error deleting original video:", err);
              else console.log("✓ Deleted original video file");
            });

          } catch (error) {
            console.error("\n!!! ERROR processing video:", error);
            console.error("Stack trace:", error.stack);
            reject(error);
            return;
          }
        } else {
          // Delete uploaded original audio file (MP3 only)
          fs.unlink(`uploads/${filename}`, (err) => {
            if (err) {
              console.error("Error deleting audio file:", err);
            } else {
              console.log("Successfully deleted the audio file");
            }
          });
        }

        // Delete the generated files after 10 minutes
        setTimeout(() => {
          console.log("\n--- Cleanup: Deleting temporary files ---");
          if (isVideo) {
            const spleeterOutputFolder = `output/${path.basename(audioFileForProcessing, '.mp3')}`;
            
            // Delete Spleeter output folder
            if (fs.existsSync(spleeterOutputFolder)) {
              fs_extra.remove(spleeterOutputFolder, (err) => {
                if (err) {
                  console.error(`Error deleting folder ${spleeterOutputFolder}:`, err);
                } else {
                  console.log(`✓ Output folder deleted: ${spleeterOutputFolder}`);
                }
              });
            }

            // Delete processed video file
            const videoFile = `output/${trimmedFilename}_vocals_only.mp4`;
            if (fs.existsSync(videoFile)) {
              fs.unlink(videoFile, (err) => {
                if (err) console.error(`Error deleting ${videoFile}:`, err);
                else console.log(`✓ Deleted: ${videoFile}`);
              });
            }
          } else {
            // For MP3 files, delete the Spleeter output folder
            const outputFolder = `output/${trimmedFilename}`;
            if (fs.existsSync(outputFolder)) {
              fs_extra.remove(outputFolder, (err) => {
                if (err) {
                  console.error("Error deleting folder:", err);
                } else {
                  console.log("Output folder deleted!");
                }
              });
            }
          }
        }, 600000);

        resolve({
          success: true,
          isVideo: isVideo,
          outputPath: isVideo 
            ? `output/${trimmedFilename}_vocals_only.mp4` 
            : `output/${trimmedFilename}`,
          videoVocalsOnly: isVideo ? `${trimmedFilename}_vocals_only.mp4` : null,
        });
      } else {
        console.error(`Spleeter process failed with code ${code}`);
        reject(new Error(`Spleeter failed with code ${code}`));
      }
    });
  });
};

module.exports = {
  processService,
};