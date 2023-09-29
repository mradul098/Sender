const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const cors = require('cors');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;
const uploadDirectory = path.join(__dirname, 'uploads/');


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
      const uniqueId = uuidv4(); // Generate a unique ID
      const fileExtension = path.extname(file.originalname); // Get the file extension
      const newFileName = `${uniqueId}${fileExtension}`; // Construct a new unique filename
      cb(null, newFileName);
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
app.get('/list', (req, res) => {
  fs.readdir((req.body.userFolder || 'uploads'), (err, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const fileUrls = files.map((fileName) => {
      return `${req.protocol}://${req.get('host')}/file/${fileName.slice(0, -4)}`;
    });

    res.json({ fileUrls });
  });
});
// API Endpoint to Get File by ID
// app.get('/file/:id', async (req, res) => {
//   try {
//     const file = await File.findById(req.params.id);

//     if (!file) {
//       return res.status(404).json({ message: 'File not found' });
//     }

//     res.sendFile(path.join(__dirname, file.path));
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });
// File access endpoint using UUID
app.get('/file/:uuid', (req, res) => {
  const uuid = req.params.uuid;
  const fileNameWithExtension = `${uuid}.txt`; // Add back the .txt extension
  const filePath = path.join(uploadDirectory, fileNameWithExtension);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    // Serve the file as a response with the root option
    res.sendFile(fileNameWithExtension, { root: uploadDirectory });
  } else {
    res.status(404).send('File not found');
  }
});


// File listing endpoint with clickable links
app.get('/deletelist', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Create an array of file objects with clickable links
    const fileList = files.map((file) => ({
      filename: file,
      link: `/delete/${file.slice(0,-4)}`,
    }));

    res.json({ files: fileList });
  });
});


// File deletion by UUID endpoint
app.delete('/delete/:uuid', (req, res) => {
  const uuid = req.params.uuid;
  const filePath = path.join('uploads', uuid);

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.send('File deleted successfully');
  });
});

// Delete all files endpoint
app.delete('/deleteall', (req, res) => {
  const directory = 'uploads';

  fs.readdir(directory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${filePath}`);
        }
      });
    });

    res.send('All files deleted successfully');
  });
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
