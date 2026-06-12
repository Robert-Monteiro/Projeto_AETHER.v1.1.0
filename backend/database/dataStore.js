const bcrypt = require('bcryptjs');

// In-Memory Data Layer for Development
class DataStore {
  constructor() {
    this.users = [];
    this.assets = [];
    this.tickets = [];
    this.assetHistory = [];
    this.installRequests = [];
    this.devices = [];
    this.nextUserId = 1;
    this.nextAssetId = 1;
    this.nextTicketId = 1;
    this.nextInstallId = 1;
    this.nextDeviceId = 1;
  }

  // Users
  addUser(userData) {
    const user = {
      id: this.nextUserId++,
      ...userData,
      created_at: new Date(),
    };
    this.users.push(user);
    return user;
  }

  findUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  findUserById(id) {
    return this.users.find(u => u.id === id);
  }

  findUserByRole(role) {
    return this.users.find(u => u.role === role);
  }

  ensureUser(email, userData) {
    let user = this.findUserByEmail(email);
    if (!user) {
      user = this.addUser(userData);
    }
    return user;
  }

  seedInitialData() {
    const adminUser = this.ensureUser('admin@aether.com', {
      email: 'admin@aether.com',
      password: bcrypt.hashSync('admin123', 10),
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      department: 'TI',
    });

    if (this.tickets.length === 0) {
      this.addTicket({
        title: 'Chamado de exemplo para TI',
        description: 'Este chamado foi criado automaticamente para a fila de atendimento da TI.',
        priority: 'medium',
        category: 'Suporte',
        assignedTo: adminUser.id,
        userName: 'Usuário Exemplo',
        summary: 'Suporte técnico',
        ip: '0.0.0.0',
        anydeskCode: '000-000-000',
      });
    }
  }
  // Assets
  addAsset(assetData) {
    const asset = {
      id: this.nextAssetId++,
      ...assetData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.assets.push(asset);
    return asset;
  }

  getAllAssets(filters = {}) {
    let result = [...this.assets];
    
    if (filters.type) result = result.filter(a => a.type === filters.type);
    if (filters.status) result = result.filter(a => a.status === filters.status);
    if (filters.category) result = result.filter(a => a.category === filters.category);
    
    return result;
  }

  findAssetById(id) {
    return this.assets.find(a => a.id === parseInt(id));
  }

  updateAsset(id, data) {
    const asset = this.findAssetById(id);
    if (asset) {
      Object.assign(asset, data, { updated_at: new Date() });
    }
    return asset;
  }

  deleteAsset(id) {
    const index = this.assets.findIndex(a => a.id === parseInt(id));
    if (index !== -1) {
      return this.assets.splice(index, 1)[0];
    }
    return null;
  }

  // Tickets
  addTicket(ticketData) {
    const ticket = {
      id: this.nextTicketId++,
      status: 'open',
      ...ticketData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.tickets.push(ticket);
    return ticket;
  }

  // Agent install requests
  addInstallRequest(data) {
    const request = {
      id: this.nextInstallId++,
      ...data,
      created_at: new Date(),
    };
    this.installRequests.push(request);
    return request;
  }

  getInstallRequests() {
    return [...this.installRequests];
  }

  addOrUpdateDevice(deviceData) {
    const existing = this.devices.find(d => d.hostname === deviceData.hostname);
    if (existing) {
      Object.assign(existing, deviceData, { updated_at: new Date() });
      return existing;
    }

    const device = {
      id: this.nextDeviceId++,
      ...deviceData,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.devices.push(device);
    return device;
  }

  getAllDevices() {
    return [...this.devices];
  }

  getDeviceByHostname(hostname) {
    return this.devices.find(d => d.hostname === hostname);
  }

  getAllTickets(filters = {}) {
    let result = [...this.tickets];
    
    if (filters.status) result = result.filter(t => t.status === filters.status);
    if (filters.priority) result = result.filter(t => t.priority === filters.priority);
    
    return result;
  }

  findTicketById(id) {
    return this.tickets.find(t => t.id === parseInt(id));
  }

  updateTicket(id, data) {
    const ticket = this.findTicketById(id);
    if (ticket) {
      Object.assign(ticket, data, { updated_at: new Date() });
    }
    return ticket;
  }

  deleteTicket(id) {
    const index = this.tickets.findIndex(t => t.id === parseInt(id));
    if (index !== -1) {
      return this.tickets.splice(index, 1)[0];
    }
    return null;
  }
}

// Create global instance
const store = new DataStore();

module.exports = store;
