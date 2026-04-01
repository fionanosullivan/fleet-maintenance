import express from 'https://cdn.skypack.dev/express@4.18.2';
import cors from 'https://cdn.skypack.dev/cors@2.8.5';
import mongoose from 'https://cdn.skypack.dev/mongoose@7.6.1';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// TODO: replace with your actual MongoDB Atlas connection string
const MONGODB_URI = 'YOUR_ATLAS_CONNECTION_STRING_HERE';

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
const UnitSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ['truck', 'trailer'] },
    unitNumber: { type: String, required: true, unique: true },
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: Number, default: null },
    vin: { type: String, unique: true, sparse: true, default: '' },
    licensePlate: { type: String, unique: true, sparse: true, default: '' },
    currentMileage: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const Unit = mongoose.model('Unit', UnitSchema);

// 2. Work Order Schema
const WorkOrderSchema = new mongoose.Schema(
  {
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
    date: { type: Date, required: true, default: Date.now },
    mileage: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
    summary: { type: String, required: true },
    description: { type: String, default: '' },
    laborItems: [
      {
        description: { type: String, required: true },
        hours: { type: Number, default: 0 },
        rate: { type: Number, default: 0 },
      },
    ],
    partItems: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitCost: { type: Number, default: 0 },
      },
    ],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);

// 3. Service Template Schema
const TemplateStepSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const ServiceTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    appliesTo: { type: String, enum: ['truck', 'trailer', 'any'], default: 'any' },
    intervalMiles: { type: Number, default: 0 },
    steps: [TemplateStepSchema],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const ServiceTemplate = mongoose.model('ServiceTemplate', ServiceTemplateSchema);

// --- End Schemas and Models ---

// --------- Units CRUD ----------

// GET all units
app.get('/api/units', async (req, res) => {
  try {
    const units = await Unit.find().sort({ unitNumber: 1 });
    res.json(units);
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).json({ message: 'Failed to fetch units' });
  }
});

// GET single unit by id
app.get('/api/units/:id', async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    console.error('Error fetching unit:', err);
    res.status(500).json({ message: 'Failed to fetch unit' });
  }
});

// POST create unit
app.post('/api/units', async (req, res) => {
  try {
    const unit = new Unit(req.body);
    const saved = await unit.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating unit:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create unit' });
  }
});

// PUT update unit (full update)
app.put('/api/units/:id', async (req, res) => {
  try {
    const updated = await Unit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Unit not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating unit:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to update unit' });
  }
});

// PATCH partial update unit
app.patch('/api/units/:id', async (req, res) => {
  try {
    const updated = await Unit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Unit not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error patching unit:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to patch unit' });
  }
});

// DELETE unit
app.delete('/api/units/:id', async (req, res) => {
  try {
    const deleted = await Unit.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Unit not found' });
    res.json({ message: 'Unit deleted', unit: deleted });
  } catch (err) {
    console.error('Error deleting unit:', err);
    res.status(500).json({ message: 'Failed to delete unit' });
  }
});

// --------- Work Orders CRUD ----------

// GET all work orders
app.get('/api/work-orders', async (req, res) => {
  try {
    const workOrders = await WorkOrder.find().populate('unit').sort({ date: -1 });
    res.json(workOrders);
  } catch (err) {
    console.error('Error fetching work orders:', err);
    res.status(500).json({ message: 'Failed to fetch work orders' });
  }
});

// GET single work order
app.get('/api/work-orders/:id', async (req, res) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id).populate('unit');
    if (!workOrder) return res.status(404).json({ message: 'Work order not found' });
    res.json(workOrder);
  } catch (err) {
    console.error('Error fetching work order:', err);
    res.status(500).json({ message: 'Failed to fetch work order' });
  }
});

// POST create work order
app.post('/api/work-orders', async (req, res) => {
  try {
    const workOrder = new WorkOrder(req.body);
    const saved = await workOrder.save();
    const populated = await saved.populate('unit');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating work order:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create work order' });
  }
});

// PUT update work order
app.put('/api/work-orders/:id', async (req, res) => {
  try {
    const updated = await WorkOrder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('unit');
    if (!updated) return res.status(404).json({ message: 'Work order not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating work order:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to update work order' });
  }
});

// PATCH partial update work order
app.patch('/api/work-orders/:id', async (req, res) => {
  try {
    const updated = await WorkOrder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('unit');
    if (!updated) return res.status(404).json({ message: 'Work order not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error patching work order:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to patch work order' });
  }
});

// DELETE work order
app.delete('/api/work-orders/:id', async (req, res) => {
  try {
    const deleted = await WorkOrder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order deleted', workOrder: deleted });
  } catch (err) {
    console.error('Error deleting work order:', err);
    res.status(500).json({ message: 'Failed to delete work order' });
  }
});

// --------- Service Templates CRUD ----------

// GET all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await ServiceTemplate.find().sort({ name: 1 });
    res.json(templates);
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// GET single template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await ServiceTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
});

// POST create template
app.post('/api/templates', async (req, res) => {
  try {
    const template = new ServiceTemplate(req.body);
    const saved = await template.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating template:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Template name must be unique' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to create template' });
  }
});

// PUT update template
app.put('/api/templates/:id', async (req, res) => {
  try {
    const updated = await ServiceTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Template not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating template:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Template name must be unique' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// PATCH partial update template
app.patch('/api/templates/:id', async (req, res) => {
  try {
    const updated = await ServiceTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Template not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error patching template:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Template name must be unique' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to patch template' });
  }
});

// DELETE template
app.delete('/api/templates/:id', async (req, res) => {
  try {
    const deleted = await ServiceTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted', template: deleted });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Fleet maintenance backend running' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});