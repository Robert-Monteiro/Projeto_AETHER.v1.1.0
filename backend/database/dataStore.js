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
    this.alerts = [];
    this.nextUserId = 1;
    this.nextAssetId = 1;
    this.nextTicketId = 1;
    this.nextInstallId = 1;
    this.nextDeviceId = 1;
    this.nextAlertId = 1;
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
      // Removido os tickets de teste padrão para manter apenas dados reais.
    }

    if (this.devices.length === 0) {
      this.addOrUpdateDevice({
        hostname: 'SRV-01',
        category: 'server',
        online: true,
        status: 'online',
        site: 'Data Center',
        ip: '10.0.0.10',
        alert_level: 'normal',
      });
      this.addOrUpdateDevice({
        hostname: 'PC-02',
        category: 'pc',
        online: false,
        status: 'offline',
        site: 'Sede',
        ip: '10.0.1.22',
        alert_level: 'warning',
      });
    }

    if (this.alerts.length === 0) {
      this.addAlert({
        title: 'CPU elevada no servidor',
        description: 'Uso de CPU acima de 90% no servidor principal.',
        level: 'critical',
        category: 'Servidor',
        site: 'Data Center',
        status: 'active',
      });
      this.addAlert({
        title: 'Atualização pendente',
        description: 'Estação de trabalho aguarda patch de segurança.',
        level: 'warning',
        category: 'Segurança',
        site: 'Sede',
        status: 'active',
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

  addAlert(alertData) {
    const alert = {
      id: this.nextAlertId++,
      ...alertData,
      status: alertData.status || 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.alerts.push(alert);
    return alert;
  }

  getAllAlerts() {
    return [...this.alerts];
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
