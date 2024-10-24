// Import required modules
const express = require('express');  // Web framework
const app = express();  // Create Express app instance
const cors = require('cors');  // Enable cross-origin resource sharing
const mongoose = require('mongoose');  // MongoDB ORM
require('dotenv').config();  // Load environment variables from .env file

// Establish MongoDB connection
mongoose.connect(process.env.MONGO_URI);

// Handle MongoDB connection events
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));

// Confirm successful connection
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Enable CORS for cross-origin requests
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static('public'));

// Serve index.html at root URL
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies (non-extended)
app.use(express.urlencoded({ extended: false }));
// Define User schema
const userSchema_801 = new mongoose.Schema({
  // Unique, required username
  username: {
    type: String,  // Data type
    required: true,  // Mandatory field
    unique: true,   // Prevent duplicate usernames
  },
});

// Define Exercise schema
const exerciseSchema_801 = new mongoose.Schema({
  userId: String,  // User ID (reference to User document)
  description: String,  // Exercise description
  duration: Number,  // Exercise duration (minutes)
  date: Date,  // Exercise date
});

// Create User model from schema
const User_801 = mongoose.model('User_801', userSchema_801);

// Create Exercise model from schema
const Exercise_801 = mongoose.model('Exercise_801', exerciseSchema_801);

// Retrieve all users
app.get('/api/users', async (req, res) => {
  try {
    // Query all User documents, selecting only _id and username fields
    const users = await User_801.find().select('_id username');
    
    // Return users list in JSON response
    res.json(users);
  } catch (err) {
    // Return 500 error for internal server error
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    // Validate username presence
    if (!req.body.username) {
      // Return 400 error for missing username
      return res.status(400).json({ error: 'Username is required' });
    }

    // Create new user document
    const user = new User_801({
      username: req.body.username,  // Username from request body
    });

    // Save user document to database
    await user.save();

    // Return created user details
    res.json({
      _id: user._id,  // User ID
      username: user.username,  // Username
    });
  } catch (err) {
    // Log error for debugging
    console.log(err);

    // Handle duplicate username error (MongoDB error code 11000)
    if (err.name === 'MongoError' && err.code === 11000) {
      // Return 400 error for duplicate username
      res.status(400).json({ error: 'Username already exists' });
    } else {
      // Return 500 error for internal server error
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Add exercise to user's log
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    // Extract user ID from URL parameters
    const userId = req.params._id;

    // Retrieve user document by ID
    const user = await User_801.findById(userId);

    // Handle non-existent user
    if (!user) {
      // Return 404 error for user not found
      return res.status(404).json({ error: 'User not found' });
    }

    // Create new exercise document
    const exercise = new Exercise_801({
      userId, // Associate exercise with user
      description: req.body.description, // Exercise description
      duration: req.body.duration, // Exercise duration (minutes)
      date: req.body.date || new Date(), // Optional date or current date
    });

    // Save exercise document to database
    await exercise.save();

    // Return exercise details in response
    res.json({
      _id: user._id, // User ID
      username: user.username, // Username
      date: exercise.date.toDateString(), // Exercise date (string)
      description: exercise.description, // Exercise description
      duration: exercise.duration, // Exercise duration
    });
  } catch (err) {
    // Return 500 error for internal server error
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});



// Retrieve user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    // Extract user ID from URL parameters
    const userId = req.params._id;

    // Validate user ID as a MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      // Return error for invalid user ID
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Retrieve user document by ID
    const user = await User_801.findById(userId);
    
    // Handle non-existent user
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract query parameters: from, to and limit
    const from = req.query.from;
    const to = req.query.to;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    // Validate date query parameters (YYYY-MM-DD format)
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return res.status(400).json({ error: 'Invalid "from" date format. Use YYYY-MM-DD.' });
    }

    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'Invalid "to" date format. Use YYYY-MM-DD.' });
    }

    // Construct query for exercise logs
    const query = Exercise_801.find({ userId })
      .select('description duration date') // Retrieve specific fields
      .sort('date'); // Sort logs by date

    // Apply date range filtering
    if (from) {
      query.gt('date', new Date(from)); // Filter logs after specified date
    }

    if (to) {
      query.lt('date', new Date(to)); // Filter logs before specified date
    }

    // Limit result count
    if (limit) {
      query.limit(limit);
    }

    // Execute query
    const exercises = await query.exec();

    // Handle empty log
    if (exercises.length === 0) {
      return res.status(200).json({
        _id: user._id,
        username: user.username,
        count: 0,
        log: [],
      });
    }

    // Map exercise logs to response format
    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(), // Convert date to string
    }));

    // Return user's exercise log
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log,
    });
  } catch (err) {
    // Log and return internal server error
    console.log(err);
    res.status(500).json({ error: 'Failed to retrieve exercise log' });
  }
});


// Start Express server and listen on specified port
const listener = app.listen(
  process.env.PORT || 3000, 
  // Port fallback: environment variable or default (3000)
  () => {
    // Server listening confirmation callback
    console.log(
      `Your app is listening on port ${listener.address().port}`
    );
  }
);

