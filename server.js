require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const dataDirectory = path.join(__dirname, "data");
const localDataFile = path.join(dataDirectory, "leads.json");
let localLeads = loadLocalLeads();

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  source: { type: String, default: "Website" },
  status: { type: String, enum: ["New", "Contacted", "Converted"], default: "New" },
  notes: { type: String, default: "" }
}, { timestamps: true });

const Lead = mongoose.model("Lead", leadSchema);

function loadLocalLeads() {
  try {
    return JSON.parse(fs.readFileSync(localDataFile, "utf8"));
  } catch (error) {
    return [];
  }
}

function saveLocalLeads() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(localDataFile, JSON.stringify(localLeads, null, 2));
}

function validateLead(data) {
  const name = String(data.name || "").trim();
  const email = String(data.email || "").trim();
  const status = data.status || "New";
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return "A valid name and email are required";
  }
  if (!["New", "Contacted", "Converted"].includes(status)) {
    return "Invalid lead status";
  }
  return null;
}

function localLead(data, existing = {}) {
  const now = new Date().toISOString();
  return {
    _id: existing._id || `local-${crypto.randomUUID()}`,
    name: String(data.name).trim(),
    email: String(data.email).trim(),
    source: String(data.source || "Website").trim(),
    status: data.status || "New",
    notes: String(data.notes || "").trim(),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

let useMongo = Boolean(process.env.MONGODB_URI);

// GET all leads
app.get("/api/leads", async (req, res) => {
  try {
    const leads = useMongo
      ? await Lead.find().sort({ createdAt: -1 })
      : [...localLeads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
});

// CREATE a lead
app.post("/api/leads", async (req, res) => {
  try {
    const validationError = validateLead(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    const lead = useMongo ? await Lead.create(req.body) : localLead(req.body);
    if (!useMongo) {
      localLeads.push(lead);
      saveLocalLeads();
    }
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a lead
app.put("/api/leads/:id", async (req, res) => {
  try {
    const validationError = validateLead(req.body);
    if (validationError) return res.status(400).json({ message: validationError });
    let lead;
    if (useMongo) {
      lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    } else {
      const index = localLeads.findIndex(item => item._id === req.params.id);
      if (index !== -1) {
        lead = localLead(req.body, localLeads[index]);
        localLeads[index] = lead;
        saveLocalLeads();
      }
    }
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a lead
app.delete("/api/leads/:id", async (req, res) => {
  try {
    let lead;
    if (useMongo) {
      lead = await Lead.findByIdAndDelete(req.params.id);
    } else {
      const index = localLeads.findIndex(item => item._id === req.params.id);
      if (index !== -1) lead = localLeads.splice(index, 1)[0];
      if (lead) saveLocalLeads();
    }
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (useMongo) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } catch (error) {
      useMongo = false;
      console.error(`MongoDB connection failed. Using local data store: ${error.message}`);
    }
  } else {
    console.log("No MONGODB_URI found. Using local data store in data/leads.json");
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();