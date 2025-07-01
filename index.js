const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const pathRoutes = require('./path');
const cors = require('cors');

dotenv.config();


const app = express();

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json()); 
app.use('/api', pathRoutes);


mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
