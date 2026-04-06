require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes — Auth + Users
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/users',  require('./routes/users'));
app.use('/api/import', require('./routes/importData'));

// Clinical routes
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/vaccines', require('./routes/vaccines'));
app.use('/api/clinical-history', require('./routes/clinical-history'));
app.use('/api/petguardianship', require('./routes/petguardianship'));
app.use('/api/grooming', require('./routes/grooming'));
app.use('/api/hospitalization', require('./routes/hospitalization'));
app.use('/api/remissions', require('./routes/remissions'));
app.use('/api/eps', require('./routes/eps'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SofVet API running', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`SofVet API corriendo en http://localhost:${PORT}`);
});

module.exports = app;
