const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});







const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Exercise Schema
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);









app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// POST /api/users - Create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  
  const newUser = new User({ username });
  newUser.save((err, savedUser) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  });
});

// GET /api/users - Get a list of all users
app.get('/api/users', (req, res) => {
  User.find({}, (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users.map(user => ({ username: user.username, _id: user._id })));
  });
});

// POST /api/users/:_id/exercises - Add an exercise
app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  User.findById(_id, (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = new Exercise({
      userId: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });

    exercise.save((err, savedExercise) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        username: user.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toDateString(),
        _id: user._id
      });
    });
  });
});

// GET /api/users/:_id/logs - Get a user's exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  User.findById(_id, (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filter = { userId: _id };
    
    // Handle date filtering
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    Exercise.find(filter)
      .limit(parseInt(limit) || 0)
      .exec((err, exercises) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          username: user.username,
          count: exercises.length,
          _id: user._id,
          log: exercises.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          }))
        });
      });
  });
});








const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
