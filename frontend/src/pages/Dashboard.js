import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAssets } from '../features/assetsSlice';
import { fetchTickets } from '../features/ticketsSlice';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Mapeamento de logos dos Sistemas Operacionais
const osLogos = {
  'Windows': '/logos/hd-windows-11-logo-icon-transparent-background-701751694967888zqtluh5aaw.png',
  'Windows Server': '/logos/aazmvbysy.webp',
  'Mac': '/logos/mac-21.png',
  'Linux': '/logos/36-363344_windows-linux-macos-linux-logo-png.png',
};

const OSIcon = ({ osName, size = 48 }) => {
  const logoPath = osLogos[osName] || osLogos['Windows'];
  return (
    <img 
      src={logoPath} 
      alt={osName}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        maxWidth: '100%',
        maxHeight: '100%'
      }}
    />
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { assets } = useSelector(state => state.assets);
  const { tickets } = useSelector(state => state.tickets);

  useEffect(() => {
    dispatch(fetchAssets());
    dispatch(fetchTickets());
  }, [dispatch]);

  // Calculate stats
  const totalAssets = assets.length;
  const activeAssets = assets.filter(asset => asset.status === 'active').length;
  const openTickets = tickets.filter(ticket => ticket.status === 'open').length;
  const pendingTickets = tickets.filter(ticket => ticket.status === 'pending' || ticket.status === 'awaiting').length;
  const now = new Date();
  const dueToday = tickets.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString()).length;
  const overdue = tickets.filter(t => t.dueDate && new Date(t.dueDate) < now).length;
  const highPriorityTickets = tickets.filter(ticket => ticket.priority === 'high' || ticket.priority === 'urgent').length;

  // Asset types chart
  const assetTypes = assets.reduce((acc, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + 1;
    return acc;
  }, {});

  const assetTypeData = {
    labels: Object.keys(assetTypes),
    datasets: [{
      label: 'Assets by Type',
      data: Object.values(assetTypes),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
    }],
  };

  // Ticket status chart
  const ticketStatuses = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {});

  const ticketStatusData = {
    labels: Object.keys(ticketStatuses),
    datasets: [{
      label: 'Tickets by Status',
      data: Object.values(ticketStatuses),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }],
  };

  // Activity/Ingress Chart Data (last 7 days) - Cálculo em tempo real
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
  });

  // Calcular dados de atividade para os últimos 7 dias
  const calculateActivityData = () => {
    const activityByDay = last7Days.map((_, dayIndex) => {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - (6 - dayIndex));
      targetDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      let opened = 0;
      let resolved = 0;
      let overdue = 0;
      let moreThan7Days = 0;

      tickets.forEach(ticket => {
        const ticketDate = ticket.createdAt ? new Date(ticket.createdAt) : null;
        if (!ticketDate) return;

        ticketDate.setHours(0, 0, 0, 0);

        if (ticketDate >= targetDate && ticketDate < nextDate) {
          if (ticket.status === 'closed' || ticket.status === 'resolved') {
            resolved++;
          } else {
            opened++;
            
            // Verifica se passou do prazo
            if (ticket.dueDate) {
              const dueDate = new Date(ticket.dueDate);
              if (dueDate < now && ticket.status !== 'closed' && ticket.status !== 'resolved') {
                overdue++;
              }
            }

            // Verifica se tem mais de 7 dias aberto
            const daysOpen = Math.floor((now - ticketDate) / (1000 * 60 * 60 * 24));
            if (daysOpen > 7 && ticket.status !== 'closed' && ticket.status !== 'resolved') {
              moreThan7Days++;
            }
          }
        }
      });

      return { opened, resolved, overdue, moreThan7Days };
    });

    return {
      labels: last7Days,
      datasets: [
        {
          label: 'Aberto',
          data: activityByDay.map(d => d.opened),
          backgroundColor: '#1976d2',
        },
        {
          label: 'Resolvido',
          data: activityByDay.map(d => d.resolved),
          backgroundColor: '#4caf50',
        },
        {
          label: 'Em atraso',
          data: activityByDay.map(d => d.overdue),
          backgroundColor: '#f44336',
        },
        {
          label: 'Mais de 7 dias',
          data: activityByDay.map(d => d.moreThan7Days),
          backgroundColor: '#ff9800',
        },
      ],
    };
  };

  const activityData = calculateActivityData();

  // SLA Statistics (average times)
  const slaStats = {
    firstResponse: '00m',
    resolution: '00m',
    averageTime: '00m',
  };

  // Satisfaction metrics
  const satisfactionData = {
    overall: 0,
    support: 0,
    technical: 0,
    general: 0,
  };

  // Calculate OS distribution from assets
  const osDistribution = assets.reduce((acc, asset) => {
    if (asset.osType) {
      acc[asset.osType] = (acc[asset.osType] || 0) + 1;
    }
    return acc;
  }, {});

  const totalMachines = assets.length || 1;
  const osStats = [
    { name: 'Windows', percentage: Math.round((osDistribution['Windows'] || 0) / totalMachines * 100), count: osDistribution['Windows'] || 0, color: '#0078D4' },
    { name: 'Windows Server', percentage: Math.round((osDistribution['Windows Server'] || 0) / totalMachines * 100), count: osDistribution['Windows Server'] || 0, color: '#0078D4' },
    { name: 'Mac', percentage: Math.round((osDistribution['Mac'] || 0) / totalMachines * 100), count: osDistribution['Mac'] || 0, color: '#555555' },
    { name: 'Linux', percentage: Math.round((osDistribution['Linux'] || 0) / totalMachines * 100), count: osDistribution['Linux'] || 0, color: '#FCC624' },
  ];

  // Generate donut chart data for each OS
  const generateOSDonutData = (os) => {
    return {
      labels: [os.name, 'Outros'],
      datasets: [{
        data: [os.percentage, 100 - os.percentage],
        backgroundColor: [os.color, '#e0e0e0'],
        borderColor: ['#fff', '#fff'],
        borderWidth: 2,
        cutout: '65%',
      }],
    };
  };

  // Device availability (correction status)
  const deviceStatus = osStats;

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Painel
      </Typography>

      <Grid container spacing={2}>
        {/* Top status bars */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-around' }}>
            <Box>
              <Typography variant="subtitle1">Status dos tickets</Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Chip label={`Aberto ${openTickets}`} color="primary" size="small" />
                <Chip label={`Pendente ${pendingTickets}`} color="warning" size="small" />
                <Chip label={`Vencimento hoje ${dueToday}`} color="info" size="small" />
                <Chip label={`Vencido ${overdue}`} color="error" size="small" />
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle1">Status dos alertas</Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Chip label="Aviso 0" color="warning" size="small" />
                <Chip label="Crítico 0" color="error" size="small" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* tables row */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tickets não atribuídos
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Detalhes</TableCell>
                  <TableCell>Técnico</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>SLA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets
                  .filter(t => !t.assignedTo)
                  .map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.description || '-'}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{t.priority}</TableCell>
                      <TableCell>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Alertas recentes
            </Typography>
            {/* placeholder list */}
            <Typography color="textSecondary">Nenhum alerta disponível</Typography>
          </Paper>
        </Grid>

        {/* bottom row */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Monitoramento de disponibilidade
            </Typography>
            <Table size="small">
              <TableBody>
                {['Server', 'PC', 'Mac', 'Linux', 'SNMP'].map(type => (
                  <TableRow key={type}>
                    <TableCell>{type}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Alertas por site
            </Typography>
            <Typography color="textSecondary">Sem dados</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status do servidor por categoria de alerta
            </Typography>
            <Bar data={ticketStatusData} />
          </Paper>
        </Grid>

        {/* New Charts Section */}
        {/* Activity Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Atividade de ingressos
            </Typography>
            <Bar data={activityData} options={{ responsive: true, indexAxis: undefined }} />
          </Paper>
        </Grid>

        {/* SLA Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Estatísticas médias de SLA de tickets
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{slaStats.firstResponse}</Typography>
                <Typography variant="caption" color="textSecondary">Tempo médio de primeira resposta</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{slaStats.resolution}</Typography>
                <Typography variant="caption" color="textSecondary">Tempo médio de fechamento</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{slaStats.averageTime}</Typography>
                <Typography variant="caption" color="textSecondary">Duração média de entrada de tempo</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Satisfaction */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Satisfação
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ my: 2 }}>{satisfactionData.overall}</Typography>
              <Typography variant="body2" color="textSecondary">Satisfação geral</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{ fontSize: '24px', color: '#ccc' }}>★</span>
                ))}
              </Box>
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Qualidade do suporte</Typography>
                  <Typography variant="body2">{satisfactionData.support}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Conhecimento do técnico</Typography>
                  <Typography variant="body2">{satisfactionData.technical}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Prestatividade geral</Typography>
                  <Typography variant="body2">{satisfactionData.general}</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Correction Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status de correção
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              {Math.round((assets.filter(a => a.status === 'active').length / (totalMachines || 1) * 100))}% - {assets.filter(a => a.status === 'active').length} de {totalMachines} dispositivos atualizados
            </Typography>
            <Box sx={{ background: '#ddd', height: 8, borderRadius: 1, mb: 3 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 3 }}>
              {osStats.map(os => (
                <Box key={os.name} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 180 }}>
                  <Box sx={{ position: 'relative', width: 150, height: 150, mb: 1 }}>
                    <Pie 
                      data={generateOSDonutData(os)} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return context.label + ': ' + context.parsed + '%';
                              }
                            }
                          }
                        }
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <OSIcon osName={os.name} size={48} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                        {os.percentage}%
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                    {os.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {os.count} máquina{os.count !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;