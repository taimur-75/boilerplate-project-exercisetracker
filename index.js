const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// User schema
const userSchema_801 = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});

// Exercise schema
const exerciseSchema_801 = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});

// User model
const User_801 = mongoose.model('User_801', userSchema_801);

// Exercise model
const Exercise_801 = mongoose.model('Exercise_801', exerciseSchema_801);

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User_801.find().select('_id username');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    if (!req.body.username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = new User_801({ username: req.body.username });
    await user.save();
    res.json({ _id: user._id, username: user.username });
  } catch (err) {
    console.log(err);
    if (err.name === 'MongoError' && err.code === 11000) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Add exercise to user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const user = await User_801.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exercise = new Exercise_801({
      userId,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date || new Date(),
    });
    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      description: exercise.description,
      duration: exercise.duration,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// Get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User_801.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    const query = {
      userId,
      date: {},
    };
    
    if (from) {
      query.date.$gte = from;
    }
    
    if (to) {
      query.date.$lte = to;
    }
    
    const exercises = await Exercise_801.find(query)
      .select('description duration date')
      .sort('date')
      .limit(limit);
    
    if (exercises.length === 0) {
      return res.status(200).json({ 
        _id: user._id, 
        username: user.username, 
        count: 0, 
        log: [] 
      });
    }
    
    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log,
    });
  } catch (err) {
    console.log(err); 
    res.status(500).json({ error: 'Failed to retrieve exercise log' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
  });