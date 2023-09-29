const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3000;


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fileSchema = new mongoose.Schema({
  filename: String,
  path: String,
});

const File = mongoose.model('File', fileSchema);

// Multer Configuration
// Update the destination function in Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Check if userFolder is provided in the request body, or use a default folder
      const userFolder = req.body.userFolder || 'uploads'; // Default folder is 'uploads'
  
      // Create the specified folder (if it doesn't exist) and store the uploaded file there
      fs.mkdirSync(userFolder, { recursive: true });
      cb(null, userFolder);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  });
  
const upload = multer({ storage });

// Express Middleware
app.use(express.json());

// API Endpoint to Upload Text File
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide a file' });
    }

    const file = new File({
      filename: req.file.filename,
      path: req.file.path,
    });

    await file.save();

    res.status(201).json({ message: 'File uploaded successfully', fileId: file._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// API Endpoint to Get File by ID
app.get('/file/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.sendFile(path.join(__dirname, file.path));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
