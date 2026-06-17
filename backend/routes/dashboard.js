const express = require('express');
const router = express.Router();
const { query, isDbConnected } = require('../database/connection');
const store = require('../database/dataStore');

const normalizeInt = (value) => Number(value) || 0;

const formatLabel = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mapPriority = (priority) => {
  if (!priority) return 'low';
  const key = priority.toString().toLowerCase();
  if (['urgent', 'critical', 'critico', 'crítico'].includes(key)) return 'urgent';
  if (['high', 'alta'].includes(key)) return 'high';
  if (['medium', 'media', 'média'].includes(key)) return 'medium';
  return 'low';
};

const mapStatus = (status) => {
  if (!status) return 'open';
  const key = status.toString().toLowerCase();
  if (key === 'pending') return 'pending';
  if (['in_progress', 'in progress'].includes(key)) return 'in_progress';
  if (key === 'resolved') return 'resolved';
  if (key === 'closed') return 'closed';
  return 'open';
};

const buildStoreDashboard = (days) => {
  const tickets = store.getAllTickets();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ticketStatusSummary = {
    open: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    dueToday: 0,
    overdue: 0,
  };

  const ticketPrioritySummary = { urgent: 0, high: 0, medium: 0, low: 0 };
  const ticketCategoryCounts = {};
  const openedMap = new Map();
  const resolvedMap = new Map();
  const slaCounters = { firstResponse: 0, assigned: 0, resolution: 0 };
  const slaTotals = { firstResponse: 0, assigned: 0, resolution: 0 };

  tickets.forEach((ticket) => {
    const status = mapStatus(ticket.status);
    if (status === 'open') ticketStatusSummary.open += 1;
    if (status === 'pending') ticketStatusSummary.pending += 1;
    if (status === 'in_progress') ticketStatusSummary.inProgress += 1;
    if (status === 'resolved') ticketStatusSummary.resolved += 1;
    if (status === 'closed') ticketStatusSummary.closed += 1;

    const priority = mapPriority(ticket.priority);
    ticketPrioritySummary[priority] += 1;

    const category = ticket.category || 'Outros';
    ticketCategoryCounts[category] = (ticketCategoryCounts[category] || 0) + 1;

    const createdAt = parseDate(ticket.created_at);
    if (createdAt) {
      const label = formatLabel(createdAt);
      openedMap.set(label, (openedMap.get(label) || 0) + 1);
    }

    const resolvedAt = parseDate(ticket.resolved_at || ticket.updated_at);
    if (resolvedAt && ['resolved', 'closed'].includes(status)) {
      const label = formatLabel(resolvedAt);
      resolvedMap.set(label, (resolvedMap.get(label) || 0) + 1);
    }

    const dueDate = parseDate(ticket.due_date);
    if (dueDate) {
      const dueDay = new Date(dueDate);
      dueDay.setHours(0, 0, 0, 0);
      if (dueDay.getTime() === today.getTime() && !['resolved', 'closed'].includes(status)) {
        ticketStatusSummary.dueToday += 1;
      }
      if (dueDay < today && !['resolved', 'closed'].includes(status)) {
        ticketStatusSummary.overdue += 1;
      }
    }

    if (ticket.first_response_at) {
      const firstResponseAt = parseDate(ticket.first_response_at);
      if (firstResponseAt) {
        slaTotals.firstResponse += Math.round((firstResponseAt - createdAt) / 60000);
        slaCounters.firstResponse += 1;
      }
    }

    if (ticket.assigned_at) {
      const assignedAt = parseDate(ticket.assigned_at);
      if (assignedAt) {
        slaTotals.assigned += Math.round((assignedAt - createdAt) / 60000);
        slaCounters.assigned += 1;
      }
    }

    if (ticket.resolved_at) {
      const resolvedAtTime = parseDate(ticket.resolved_at);
      if (resolvedAtTime) {
        slaTotals.resolution += Math.round((resolvedAtTime - createdAt) / 60000);
        slaCounters.resolution += 1;
      }
    }
  });

  const activity = [];
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));

  for (let i = 0; i < days; i += 1) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const label = formatLabel(current);
    activity.push({
      label,
      opened: openedMap.get(label) || 0,
      resolved: resolvedMap.get(label) || 0,
    });
  }

  const ticketCategorySummary = Object.entries(ticketCategoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
    .map((ticket) => ({
      ...ticket,
      due_date: ticket.due_date ? parseDate(ticket.due_date).toISOString().split('T')[0] : null,
    }));

  return {
    totalTickets: tickets.length,
    ticketStatusSummary,
    ticketPrioritySummary,
    ticketCategorySummary,
    activity,
    recentTickets,
    slaStats: {
      firstResponseMinutes: slaCounters.firstResponse ? Math.round(slaTotals.firstResponse / slaCounters.firstResponse) : 0,
      assignedMinutes: slaCounters.assigned ? Math.round(slaTotals.assigned / slaCounters.assigned) : 0,
      resolutionMinutes: slaCounters.resolution ? Math.round(slaTotals.resolution / slaCounters.resolution) : 0,
    },
  };
};

router.get('/overview', async (req, res) => {
  try {
    const daysQuery = parseInt(req.query.days, 10);
    const days = [7, 15, 30].includes(daysQuery) ? daysQuery : 7;

    if (isDbConnected()) {
      try {
        const ticketStatusQuery = `
          SELECT
            COUNT(*) FILTER (WHERE LOWER(status) = 'open') AS open,
            COUNT(*) FILTER (WHERE LOWER(status) = 'pending') AS pending,
            COUNT(*) FILTER (WHERE LOWER(status) IN ('in_progress', 'in progress')) AS in_progress,
            COUNT(*) FILTER (WHERE LOWER(status) = 'resolved') AS resolved,
            COUNT(*) FILTER (WHERE LOWER(status) = 'closed') AS closed,
            COUNT(*) FILTER (WHERE due_date = CURRENT_DATE AND LOWER(status) NOT IN ('resolved', 'closed')) AS due_today,
            COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND LOWER(status) NOT IN ('resolved', 'closed')) AS overdue
          FROM tickets;
        `;

        const ticketPriorityQuery = `
          SELECT
            COUNT(*) FILTER (WHERE LOWER(priority) IN ('urgent', 'critical', 'critico', 'crítico')) AS urgent,
            COUNT(*) FILTER (WHERE LOWER(priority) IN ('high', 'alta')) AS high,
            COUNT(*) FILTER (WHERE LOWER(priority) IN ('medium', 'média', 'media')) AS medium,
            COUNT(*) FILTER (WHERE LOWER(priority) IN ('low', 'baixa')) AS low
          FROM tickets;
        `;

        const ticketCategoryQuery = `
          SELECT COALESCE(category, 'Outros') AS category, COUNT(*) AS count
          FROM tickets
          GROUP BY COALESCE(category, 'Outros')
          ORDER BY count DESC
          LIMIT 10;
        `;

        const ticketActivityQuery = `
          WITH days AS (
            SELECT generate_series(CURRENT_DATE - ($1 - 1), CURRENT_DATE, interval '1 day')::date AS day
          ),
          opened AS (
            SELECT created_at::date AS day, COUNT(*) AS opened
            FROM tickets
            GROUP BY created_at::date
          ),
          resolved AS (
            SELECT COALESCE(resolved_at::date, updated_at::date) AS day, COUNT(*) AS resolved
            FROM tickets
            WHERE LOWER(status) IN ('resolved', 'closed')
            GROUP BY COALESCE(resolved_at::date, updated_at::date)
          )
          SELECT
            to_char(d.day, 'DD/MM') AS label,
            COALESCE(o.opened, 0) AS opened,
            COALESCE(r.resolved, 0) AS resolved
          FROM days d
          LEFT JOIN opened o ON o.day = d.day
          LEFT JOIN resolved r ON r.day = d.day
          ORDER BY d.day;
        `;

        const recentTicketsQuery = `
          SELECT id, title, category, priority, status, due_date, created_at
          FROM tickets
          ORDER BY created_at DESC
          LIMIT 10;
        `;

        const slaQuery = `
          SELECT
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) / 60), 0) AS first_response_minutes,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) / 60), 0) AS resolution_minutes,
            COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))) / 60), 0) AS assigned_minutes
          FROM tickets
          WHERE first_response_at IS NOT NULL
             OR resolved_at IS NOT NULL
             OR assigned_at IS NOT NULL;
        `;

        const [ticketStatusResult, ticketPriorityResult, ticketCategoryResult, ticketActivityResult, recentTicketsResult, slaResult] = await Promise.all([
          query(ticketStatusQuery),
          query(ticketPriorityQuery),
          query(ticketCategoryQuery),
          query(ticketActivityQuery, [days]),
          query(recentTicketsQuery),
          query(slaQuery),
        ]);

        const ticketStatus = ticketStatusResult.rows[0] || {};
        const ticketPriority = ticketPriorityResult.rows[0] || {};
        const ticketCategoryRows = ticketCategoryResult.rows || [];
        const activityRows = ticketActivityResult.rows || [];
        const slaStats = slaResult.rows[0] || { first_response_minutes: 0, resolution_minutes: 0, assigned_minutes: 0 };

        return res.json({
          totalTickets: normalizeInt(ticketStatus.open)
            + normalizeInt(ticketStatus.pending)
            + normalizeInt(ticketStatus.in_progress)
            + normalizeInt(ticketStatus.resolved)
            + normalizeInt(ticketStatus.closed),
          ticketStatusSummary: {
            open: normalizeInt(ticketStatus.open),
            pending: normalizeInt(ticketStatus.pending),
            inProgress: normalizeInt(ticketStatus.in_progress),
            resolved: normalizeInt(ticketStatus.resolved),
            closed: normalizeInt(ticketStatus.closed),
            dueToday: normalizeInt(ticketStatus.due_today),
            overdue: normalizeInt(ticketStatus.overdue),
          },
          ticketPrioritySummary: {
            urgent: normalizeInt(ticketPriority.urgent),
            high: normalizeInt(ticketPriority.high),
            medium: normalizeInt(ticketPriority.medium),
            low: normalizeInt(ticketPriority.low),
          },
          ticketCategorySummary: ticketCategoryRows.map((row) => ({ category: row.category, count: normalizeInt(row.count) })),
          activity: activityRows.map((row) => ({ label: row.label, opened: normalizeInt(row.opened), resolved: normalizeInt(row.resolved) })),
          recentTickets: recentTicketsResult.rows.map((ticket) => ({
            ...ticket,
            due_date: ticket.due_date instanceof Date ? ticket.due_date.toISOString().split('T')[0] : ticket.due_date,
          })),
          slaStats: {
            firstResponseMinutes: normalizeInt(slaStats.first_response_minutes),
            resolutionMinutes: normalizeInt(slaStats.resolution_minutes),
            assignedMinutes: normalizeInt(slaStats.assigned_minutes),
          },
        });
      } catch (dbError) {
        console.warn('Database dashboard query failed, falling back to in-memory store:', dbError.message);
      }
    }

    return res.json(buildStoreDashboard(days));
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to load dashboard overview' });
  }
});

module.exports = router;
