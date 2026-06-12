const express = require('express');
const Joi = require('joi');
const store = require('../database/dataStore');

const router = express.Router();

// Validation schemas
const ticketSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').insensitive().lowercase().default('medium'),
  category: Joi.string().required(),
  assignedTo: Joi.alternatives().try(Joi.number().integer(), Joi.string().allow('')).optional(),
  assetId: Joi.number().integer().optional(),
  userName: Joi.string().optional(),
  summary: Joi.string().optional(),
  ip: Joi.string().optional(),
  anydeskCode: Joi.string().allow('').optional(),
  hostname: Joi.string().optional(),
  serialNumber: Joi.string().optional(),
  operatingSystem: Joi.string().optional(),
  processor: Joi.string().optional(),
  ramMemory: Joi.string().optional(),
  realVncId: Joi.string().optional(),
  rustDeskId: Joi.string().optional(),
});

const updateTicketSchema = Joi.object({
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').insensitive().lowercase().optional(),
  assignedTo: Joi.number().integer().optional(),
  resolution: Joi.string().optional(),
});

// Get all tickets
router.get('/', (req, res) => {
  try {
    const { status, priority, assigned_to } = req.query;
    const tickets = store.getAllTickets({ status, priority });
    
    const filtered = assigned_to 
      ? tickets.filter(t => t.assignedTo === parseInt(assigned_to))
      : tickets;

    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create ticket
router.post('/', (req, res) => {
  try {
    const { error, value } = ticketSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const ticketPayload = { ...value };
    if (!ticketPayload.assignedTo) {
      const defaultTiUser = store.findUserByRole('admin') || store.findUserByRole('manager');
      if (defaultTiUser) {
        ticketPayload.assignedTo = defaultTiUser.id;
      }
    }

    const newTicket = store.addTicket(ticketPayload);
    const io = req.app.get('io');
    if (io) {
      io.emit('ticketCreated', newTicket);
    }
    res.status(201).json(newTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ticket by ID
router.get('/:id', (req, res) => {
  try {
    const ticket = store.findTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ticket
router.put('/:id', (req, res) => {
  try {
    const { error, value } = updateTicketSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const updatedTicket = store.updateTicket(req.params.id, value);
    if (!updatedTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete ticket
router.delete('/:id', (req, res) => {
  try {
    const deletedTicket = store.deleteTicket(req.params.id);
    if (!deletedTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

module.exports = router;