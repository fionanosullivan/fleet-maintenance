// server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Replace this with your actual Atlas connection string,
// or set it in an environment variable called MONGODB_URI.
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://fionanosullivan:KrFc1314!@myfleetappcluster.g0jixfi.mongodb.net/?appName=MyFleetAppCluster';

// Connect to MongoDB Atlas (no deprecated options)
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// --- Mongoose Schemas and Models ---

// 1. Fleet Unit Schema (for Trucks and Trailers)
const UnitSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['truck', 'trailer'] }, // 'truck' or 'trailer'
  unitNumber: { type: String, required: true, unique: true }, // e.g., "TRK-001"
  make: { type: String, default: '' },
  model: { type: String, default: '' },
  year: { type: Number, default: null },
  vin: { type: String, unique: true, sparse: true, default: '' }, // VIN can be optional, but unique if present
  licensePlate: { type: String, unique: true, sparse: true, default: '' }, // Optional, unique if present
  currentMileage: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  // Additional fields for trucks/trailers could go here
}, { timestamps: true }); // Adds createdAt and updatedAt fields automatically

const Unit = mongoose.model('Unit', UnitSchema);

// 2. Work Order Schema
const WorkOrderSchema = new mongoose.Schema({
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true }, // Link to a Unit
  date: { type: Date, required: true, default: Date.now },
  mileage: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
  summary: { type: String, required: true },
  description: { type: String, default: '' }, // Detailed description of the work

  // Nested arrays for line items
  laborItems: [
    {
      description: { type: String, required: true },
      hours: { type: Number, default: 0 },
      rate: { type: Number, default: 0 }, // hourly rate
      // cost will be calculated on frontend or in backend logic
    },
  ],
  partItems: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      unitCost: { type: Number, default: 0 }, // cost per unit
      // total cost will be calculated on frontend or in backend logic
    },
  ],
  notes: { type: String, default: '' }, // Technician's notes
}, { timestamps: true });

const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);

// 3. Service Template Schema
const TemplateStepSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const ServiceTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliesTo: { type: String, enum: ['truck', 'trailer', 'any'], default: 'any' },
  intervalMiles: { type: Number, default: 0 }, // Recommended service interval
  steps: [TemplateStepSchema], // Array of steps (checklist items)
  notes: { type: String, default: '' },
}, { timestamps: true });

const ServiceTemplate = mongoose.model('ServiceTemplate', ServiceTemplateSchema);

// --- END Mongoose Schemas and Models ---

// Your simple health check endpoint (app.get('/')) will go AFTER these schemas
// All other API endpoints will go AFTER these schemas too


// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fleet maintenance backend running',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
