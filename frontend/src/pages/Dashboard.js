import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import api, { BACKEND_ORIGIN } from '../api';
import axios from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const refreshIntervalMs = 30000;
    let intervalId;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/dashboard/overview', { params: { days: 7 } });
        setDashboardData(response.data);
      } catch (err) {
        console.error('Falha carregando dados do dashboard via proxy', err?.message);
        const fallbackBase = BACKEND_ORIGIN || 'http://localhost:5000';
        const fallbackUrl = `${fallbackBase.replace(/\/$/, '')}/api/dashboard/overview?days=7`;

        try {
          const direct = await axios.get(fallbackUrl, { timeout: 5000 });
          setDashboardData(direct.data);
        } catch (directErr) {
          console.error('Falha carregando dados do backend direto', directErr?.message);
          setError('Não foi possível carregar os dados do painel. Inicie o backend e verifique a conexão com o banco.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    intervalId = setInterval(fetchDashboard, refreshIntervalMs);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const ticketStatusDoughnutData = useMemo(() => {
    if (!dashboardData) return { labels: [], datasets: [] };
    return {
      labels: ['Abertos', 'Em progresso', 'Pendentes', 'Resolvidos', 'Fechados'],
      datasets: [
        {
          data: [
            dashboardData.ticketStatusSummary.open,
            dashboardData.ticketStatusSummary.inProgress,
            dashboardData.ticketStatusSummary.pending,
            dashboardData.ticketStatusSummary.resolved,
            dashboardData.ticketStatusSummary.closed,
          ],
          backgroundColor: ['#1976d2', '#0288d1', '#fbc02d', '#4caf50', '#616161'],
          hoverOffset: 8,
        },
      ],
    };
  }, [dashboardData]);

  const ticketPriorityChartData = useMemo(() => {
    if (!dashboardData) return { labels: [], datasets: [] };
    return {
      labels: ['Urgente', 'Alta', 'Média', 'Baixa'],
      datasets: [
        {
          label: 'Chamados',
          data: [
            dashboardData.ticketPrioritySummary.urgent,
            dashboardData.ticketPrioritySummary.high,
            dashboardData.ticketPrioritySummary.medium,
            dashboardData.ticketPrioritySummary.low,
          ],
          backgroundColor: ['#d32f2f', '#f57c00', '#1976d2', '#388e3c'],
        },
      ],
    };
  }, [dashboardData]);

  const ticketCategoryChartData = useMemo(() => {
    if (!dashboardData) return { labels: [], datasets: [] };
    return {
      labels: dashboardData.ticketCategorySummary.map((item) => item.category),
      datasets: [
        {
          label: 'Chamados por categoria',
          data: dashboardData.ticketCategorySummary.map((item) => item.count),
          backgroundColor: [
            '#1976d2',
            '#388e3c',
            '#fbc02d',
            '#7b1fa2',
            '#d32f2f',
            '#0288d1',
            '#ffa000',
            '#00796b',
            '#512da8',
            '#c2185b',
          ],
        },
      ],
    };
  }, [dashboardData]);

  const activityChartData = useMemo(() => {
    if (!dashboardData) return { labels: [], datasets: [] };
    return {
      labels: dashboardData.activity.map((item) => item.label),
      datasets: [
        {
          label: 'Abertos',
          data: dashboardData.activity.map((item) => item.opened),
          backgroundColor: '#1976d2',
        },
        {
          label: 'Resolvidos',
          data: dashboardData.activity.map((item) => item.resolved),
          backgroundColor: '#4caf50',
        },
      ],
    };
  }, [dashboardData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Erro ao carregar o dashboard
        </Typography>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard de Chamados
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Total de chamados
            </Typography>
            <Typography variant="h3">{dashboardData.totalTickets}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Chamados atrasados
            </Typography>
            <Typography variant="h3" color="error">
              {dashboardData.ticketStatusSummary.overdue}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Vencem hoje
            </Typography>
            <Typography variant="h3" color="info.main">
              {dashboardData.ticketStatusSummary.dueToday}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Média primeira resposta
            </Typography>
            <Typography variant="h3">{dashboardData.slaStats.firstResponseMinutes} min</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Média resolução
            </Typography>
            <Typography variant="h3">{dashboardData.slaStats.resolutionMinutes} min</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 160 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Tempo para atribuição
            </Typography>
            <Typography variant="h3">{dashboardData.slaStats.assignedMinutes} min</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, minHeight: 360 }}>
            <Typography variant="h6" gutterBottom>
              Distribuição por status
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie
                data={ticketStatusDoughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, minHeight: 360 }}>
            <Typography variant="h6" gutterBottom>
              Atividade dos chamados (últimos 7 dias)
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar
                data={activityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, minHeight: 360 }}>
            <Typography variant="h6" gutterBottom>
              Chamados por prioridade
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar
                data={ticketPriorityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, minHeight: 360 }}>
            <Typography variant="h6" gutterBottom>
              Chamados por categoria
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar
                data={ticketCategoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Últimos chamados
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Título</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prioridade</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Vencimento</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardData.recentTickets.map((ticket) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>{ticket.status}</TableCell>
                    <TableCell>{ticket.priority}</TableCell>
                    <TableCell>{ticket.category}</TableCell>
                    <TableCell>{ticket.due_date || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
