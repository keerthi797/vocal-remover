🎤 Vocal Separator
A web-based application that separates vocals from music in audio and video files using Spleeter AI technology.
📝 Description
Vocal Separator is a full-stack application that allows users to upload MP3 audio files or MP4 video files and automatically separate the vocals from the background music. For video files, the application intelligently extracts the audio, processes it to isolate vocals, and merges the vocals-only audio back with the original video - giving you a video with just the voice and no background music.
Key Features

🎵 Audio Processing: Upload MP3 files to separate vocals and music into individual tracks
🎬 Video Processing: Upload MP4 files and get back the same video with only vocals (music removed)
🚀 Chunked Upload: Efficiently handles large files through chunked uploading
🤖 AI-Powered: Uses Spleeter's machine learning models for high-quality audio separation
📊 Real-time Progress: Visual feedback during upload and processing

🛠️ Technology Stack
Frontend

HTML5
CSS3
Vanilla JavaScript
File API for chunked uploads

Backend

Node.js
Express.js
FFmpeg (for audio/video processing)
Spleeter (AI-powered audio separation)
Python 3.7+ (for Spleeter)
fluent-ffmpeg

📋 Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v14 or higher)
Python (v3.7 or higher)
FFmpeg (for audio/video manipulation)
Spleeter (Python library for audio separation)
