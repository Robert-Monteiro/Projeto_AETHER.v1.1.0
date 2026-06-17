const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aether',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const sampleUsers = [
  {
    email: 'admin@aether.com',
    password: 'admin123',
    first_name: 'Admin',
    last_name: 'Aether',
    role: 'admin',
    department: 'TI',
  },
  {
    email: 'usuario@aether.com',
    password: 'usuario123',
    first_name: 'João',
    last_name: 'Silva',
    role: 'user',
    department: 'Financeiro',
  },
];

const sampleDevices = [
  { hostname: 'SRV-DB-01', category: 'server', online: true, status: 'online', site: 'Data Center', ip: '10.0.0.11', alert_level: 'normal' },
  { hostname: 'PC-OPERACAO-01', category: 'pc', online: true, status: 'online', site: 'Sede', ip: '10.0.1.25', alert_level: 'warning' },
  { hostname: 'MAC-ADM-01', category: 'mac', online: false, status: 'offline', site: 'Sede', ip: '10.0.1.50', alert_level: 'critical' },
  { hostname: 'LINUX-APP-01', category: 'linux', online: true, status: 'online', site: 'Filial', ip: '10.0.2.10', alert_level: 'normal' },
  { hostname: 'SNMP-NET-01', category: 'snmp', online: true, status: 'online', site: 'Data Center', ip: '10.0.0.20', alert_level: 'warning' },
];

const sampleTickets = [
  {
    title: 'Impressora não imprime',
    description: 'Usuário relata que a impressora do setor de vendas não imprime documentos.',
    summary: 'Falha de impressão',
    category: 'Hardware',
    priority: 'high',
    status: 'open',
    user_name: 'Maria Souza',
    ip: '10.0.1.100',
    due_date: '2026-06-18',
  },
  {
    title: 'Erro ao acessar sistema financeiro',
    description: 'Sistema retorna erro de login para o departamento financeiro.',
    summary: 'Falha de software',
    category: 'Software',
    priority: 'urgent',
    status: 'pending',
    user_name: 'Carlos Pereira',
    ip: '10.0.1.101',
    due_date: '2026-06-16',
    assigned_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    title: 'Atualização de anti-vírus',
    description: 'Solicitação de atualização do antivírus em estações de trabalho.',
    summary: 'Manutenção preventiva',
    category: 'Segurança',
    priority: 'medium',
    status: 'resolved',
    user_name: 'Fernanda Lima',
    ip: '10.0.1.102',
    due_date: '2026-06-12',
    resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Falha de rede no setor de logística',
    description: 'Rede intermitente impactando operações de logística.',
    summary: 'Problema de conectividade',
    category: 'Rede',
    priority: 'high',
    status: 'open',
    user_name: 'Ricardo Nunes',
    ip: '10.0.2.200',
    due_date: '2026-06-17',
  },
  {
    title: 'Solicitação de novo acesso ao ERP',
    description: 'Usuário precisa de acesso ao módulo de compras.',
    summary: 'Acesso',
    category: 'Suporte',
    priority: 'low',
    status: 'open',
    user_name: 'Ana Beatriz',
    ip: '10.0.1.103',
    due_date: '2026-06-20',
  },
];

const sampleAlerts = [
  { title: 'CPU alta no servidor de banco', description: 'Uso de CPU acima de 90% no servidor primário.', level: 'critical', category: 'Servidor', site: 'Data Center', status: 'active' },
  { title: 'Atualização pendente em estação', description: 'Estação PC-OPERACAO-01 com atualização de segurança pendente.', level: 'warning', category: 'Segurança', site: 'Sede', status: 'active' },
  { title: 'Falha de backup', description: 'Rotina de backup diário falhou no servidor de arquivos.', level: 'critical', category: 'Backup', site: 'Data Center', status: 'active' },
  { title: 'Sincronização lenta', description: 'Sincronização entre filiais está lenta.', level: 'warning', category: 'Rede', site: 'Filial', status: 'active' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticketCount = parseInt((await client.query('SELECT COUNT(*) FROM tickets')).rows[0].count, 10);
    if (ticketCount === 0) {
      for (const ticket of sampleTickets) {
        await client.query(
          `INSERT INTO tickets (title, description, summary, category, priority, status, user_name, ip, due_date, assigned_at, resolved_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
          [
            ticket.title,
            ticket.description,
            ticket.summary,
            ticket.category,
            ticket.priority,
            ticket.status,
            ticket.user_name,
            ticket.ip,
            ticket.due_date,
            ticket.assigned_at || null,
            ticket.resolved_at || null,
          ]
        );
      }
      console.log('Seeded tickets');
    } else {
      console.log(`Tickets already present: ${ticketCount}`);
    }

    const deviceCount = parseInt((await client.query('SELECT COUNT(*) FROM devices')).rows[0].count, 10);
    if (deviceCount === 0) {
      for (const device of sampleDevices) {
        await client.query(
          `INSERT INTO devices (hostname, category, online, status, site, ip, alert_level, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [device.hostname, device.category, device.online, device.status, device.site, device.ip, device.alert_level]
        );
      }
      console.log('Seeded devices');
    } else {
      console.log(`Devices already present: ${deviceCount}`);
    }

    const alertCount = parseInt((await client.query('SELECT COUNT(*) FROM alerts')).rows[0].count, 10);
    if (alertCount === 0) {
      for (const alert of sampleAlerts) {
        await client.query(
          `INSERT INTO alerts (title, description, level, category, site, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
          [alert.title, alert.description, alert.level, alert.category, alert.site, alert.status]
        );
      }
      console.log('Seeded alerts');
    } else {
      console.log(`Alerts already present: ${alertCount}`);
    }

    await client.query('COMMIT');
    console.log('Sample seed completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Unexpected seed failure:', err);
  process.exit(1);
});
