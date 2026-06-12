import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { BACKEND_ORIGIN } from '../api';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  IconButton,
  Menu,
  Grid,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add,
  Delete,
  MoreVert,
  Download,
  Settings,
  Search,
  FilterList as Filter,
  Save as SaveIcon,
  Flag,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTickets, createTicket, updateTicket } from '../features/ticketsSlice';
import { fetchUsers } from '../features/usersSlice';

const Chamados = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tickets, loading } = useSelector(state => state.tickets);
  const { users } = useSelector(state => state.users);
  const { user: currentUser } = useSelector(state => state.auth);

  const [viewMode, setViewMode] = useState('tabela');
  const [submitError, setSubmitError] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const getAssignedUserName = (assignedToId) => {
    const assignedUser = users.find((u) => u.id === assignedToId);
    return assignedUser ? `${assignedUser.first_name || assignedUser.firstName} ${assignedUser.last_name || assignedUser.lastName}` : '-';
  };
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [dialogNovo, setDialogNovo] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Estados para os novos diálogos
  const [atenderOpen, setAtenderOpen] = useState(false);
  const [atribuirOpen, setAtribuirOpen] = useState(false);
  const [resolverOpen, setResolverOpen] = useState(false);

  // Estados para os formulários
  const [atribuiDados, setAtribuiDados] = useState({ equipe: '', tecnico: '' });
  const [resolverDados, setResolverDados] = useState({
    diagnostico: '',
    solucao: '',
    pendencias: '',
    satisfacao: 5
  });

  // Dados de exemplo para equipes
  const equipesExemplo = [
    { 
      id: 1, 
      nome: 'Suporte N1', 
      tecnicos: [{ id: 101, nome: 'João Silva' }, { id: 102, nome: 'Maria Souza' }] 
    },
    { 
      id: 2, 
      nome: 'Infraestrutura', 
      tecnicos: [{ id: 201, nome: 'Carlos Oliveira' }, { id: 202, nome: 'Ana Costa' }] 
    }
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'Geral',
    assignedTo: '',
    userName: '',
    summary: '',
    ip: '',
    anydeskCode: '',
  });

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    if (dialogNovo) {
      // Buscar IP público
      fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => setFormData(prev => ({ ...prev, ip: data.ip })))
        .catch(err => console.error('Erro ao obter IP:', err));

      // Buscar AnyDesk do agent local
      fetch('http://localhost:5001/get-info')
        .then(response => response.json())
        .then(data => setFormData(prev => ({ ...prev, anydeskCode: data.anydesk || '' })))
        .catch(err => console.error('Erro ao obter AnyDesk:', err));
    }
  }, [dialogNovo]);

  useEffect(() => {
    const socketUrl = BACKEND_ORIGIN || undefined;
    const socket = socketUrl ? io(socketUrl) : io();
    socket.on('ticketCreated', () => {
      dispatch(fetchTickets());
    });

    const intervalId = setInterval(() => {
      dispatch(fetchTickets());
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(intervalId);
    };
  }, [dispatch]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRows(tickets.map(t => t.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleNovoChamado = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'Geral',
      assignedTo: '',
      userName: '',
      summary: '',
      ip: '',
      anydeskCode: '',
    });
    setDialogNovo(true);
  };

  const handleClose = () => {
    setDialogNovo(false);
    setSubmitError(null);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.title || !formData.description) {
      setSubmitError('Título e detalhes da ocorrência são obrigatórios.');
      return;
    }

    const payload = {
      ...formData,
      assignedTo: formData.assignedTo || undefined,
    };

    const result = await dispatch(createTicket(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'Geral',
        assignedTo: '',
        userName: '',
        summary: '',
        ip: '',
        anydeskCode: '',
      });
      dispatch(fetchTickets());
      setSuccessOpen(true);
      handleClose();
    } else {
      setSubmitError(result.payload || 'Erro ao salvar o chamado. Tente novamente.');
    }
  };

  const handleConfirmarAtendimento = async () => {
    if (!chamadoSelecionado) return;
    
    const result = await dispatch(updateTicket({
      id: chamadoSelecionado.id,
      data: { 
        status: 'in_progress', 
        assignedTo: currentUser?.id 
      }
    }));
    
    if (result.meta.requestStatus === 'fulfilled') {
      setAtenderOpen(false);
      setDetailsOpen(false);
      setSuccessOpen(true);
      dispatch(fetchTickets());
    } else {
      setSubmitError(result.payload || 'Erro ao atender chamado.');
    }
  };

  const handleConfirmarAtribuicao = async () => {
    if (!chamadoSelecionado || !atribuiDados.tecnico) return;
    
    const result = await dispatch(updateTicket({
      id: chamadoSelecionado.id,
      data: { assignedTo: atribuiDados.tecnico }
    }));
    
    if (result.meta.requestStatus === 'fulfilled') {
      setAtribuirOpen(false);
      setDetailsOpen(false);
      setSuccessOpen(true);
      dispatch(fetchTickets());
    } else {
      setSubmitError(result.payload || 'Erro ao atribuir chamado.');
    }
  };

  const handleConfirmarResolucao = async () => {
    if (!chamadoSelecionado) return;

    const result = await dispatch(updateTicket({
      id: chamadoSelecionado.id,
      data: { 
        status: 'resolved',
        resolution_details: resolverDados // Assumindo que o backend suporte esses campos
      }
    }));

    if (result.meta.requestStatus === 'fulfilled') {
      // Placeholder para envio de pesquisa de satisfação futuro
      console.log("Enviando pesquisa de satisfação para o solicitante...");
      setResolverOpen(false);
      setDetailsOpen(false);
      setSuccessOpen(true);
      dispatch(fetchTickets());
    } else {
      setSubmitError(result.payload || 'Erro ao resolver chamado.');
    }
  };

  const handleMenuAbrir = (event, chamado) => {
    setChamadoSelecionado(chamado);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuFechar = () => {
    setMenuAnchor(null);
  };

  const handleAbrirDetalhes = (chamado) => {
    setChamadoSelecionado(chamado);
    setDetailsOpen(true);
    setMenuAnchor(null);
  };

  const handleFecharDetalhes = () => {
    setDetailsOpen(false);
  };

  const chamadosFiltrados = tickets.filter(t =>
    (t.title && t.title.toLowerCase().includes(searchText.toLowerCase())) ||
    (t.description && t.description.toLowerCase().includes(searchText.toLowerCase()))
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': 'Aberto',
      'in_progress': 'Em Andamento',
      'resolved': 'Resolvido',
      'closed': 'Fechado',
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Chamados
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNovoChamado}
            sx={{ bgcolor: '#2196F3' }}
          >
            + Novo Chamado
          </Button>
        </Box>

        {/* Toolbar */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
          <Select
            size="small"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="tabela">Visualização padrão</MenuItem>
            <MenuItem value="grid">Grade</MenuItem>
            <MenuItem value="lista">Lista</MenuItem>
          </Select>

          <TextField
            size="small"
            placeholder="Descreva o que você deseja filtrar"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ flex: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />

          <Button
            size="small"
            variant="outlined"
            startIcon={<Settings />}
          >
            Perguntar
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Filter />}
          >
            Filtros
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
          >
            Excel
          </Button>
        </Box>

        {/* Ações em lote */}
        {selectedRows.length > 0 && (
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" startIcon={<Edit />}>Editar em Lote</Button>
            <Button size="small" startIcon={<Settings />}>Mudar Prioridade</Button>
            <Button size="small" startIcon={<Flag />}>Atribuir a</Button>
            <Button size="small" startIcon={<SaveIcon />}>Mudar Status</Button>
            <Typography variant="caption" sx={{ alignSelf: 'center', ml: 'auto' }}>
              {selectedRows.length} selecionado(s)
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Informações */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Exibindo {chamadosFiltrados.length} de {tickets.length} chamados
        </Typography>
      </Box>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRows.length > 0 && selectedRows.length < tickets.length}
                  checked={selectedRows.length === tickets.length && tickets.length > 0}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Título</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Prioridade</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Categoria</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Atribuído a</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Criado em</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chamadosFiltrados.map((chamado) => (
              <TableRow
                key={chamado.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={(e) => {
                  const targetName = e.target.nodeName;
                  if (targetName === 'INPUT' || targetName === 'BUTTON' || targetName === 'svg' || targetName === 'path') {
                    return;
                  }
                  handleAbrirDetalhes(chamado);
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRows.includes(chamado.id)}
                    onChange={() => handleSelectRow(chamado.id)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>#{chamado.id}</TableCell>
                <TableCell>{chamado.title || chamado.description}</TableCell>
                <TableCell>
                  <Chip
                    label={chamado.priority || 'média'}
                    color={getPriorityColor(chamado.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(chamado.status)}
                    color={getStatusColor(chamado.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{chamado.category || 'Geral'}</TableCell>
                <TableCell>
                  {getAssignedUserName(chamado.assignedTo)}
                </TableCell>
                <TableCell>
                  {chamado.created_at ? new Date(chamado.created_at).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
                <TableCell>
                  {chamado.dueDate ? new Date(chamado.dueDate).toLocaleDateString('pt-BR') : '-'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuAbrir(e, chamado)}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Novo Chamado */}
      <Dialog open={dialogNovo} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2196F3', color: '#fff', fontWeight: 'bold' }}>
          Novo Chamado
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" onSubmit={handleSubmit}>
            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nome do Usuário"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Resumo da Ocorrência"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título do Chamado*"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Detalhes da Ocorrência*"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="IP da Máquina"
                  value={formData.ip}
                  onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código AnyDesk"
                  value={formData.anydeskCode}
                  onChange={(e) => setFormData({ ...formData, anydeskCode: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Prioridade"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="medium">Média</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Categoria"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="Geral">Geral</MenuItem>
                  <MenuItem value="Hardware">Hardware</MenuItem>
                  <MenuItem value="Software">Software</MenuItem>
                  <MenuItem value="Rede">Rede</MenuItem>
                  <MenuItem value="Suporte">Suporte</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Atribuir a"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({
                    ...formData,
                    assignedTo: e.target.value ? Number(e.target.value) : '',
                  })}
                >
                  <MenuItem value="">Não atribuído (será enviado para TI)</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Se não atribuir um responsável, o chamado será encaminhado automaticamente para a equipe de TI.
              </Typography>
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                Salvar Chamado
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSuccessClose} severity="success" sx={{ width: '100%' }}>
          Chamado salvo com sucesso!
        </Alert>
      </Snackbar>

      <Dialog open={detailsOpen} onClose={handleFecharDetalhes} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2196F3', color: '#fff', fontWeight: 'bold', position: 'relative' }}>
          Detalhes do Chamado
          <IconButton
            aria-label="close"
            onClick={handleFecharDetalhes}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#fff',
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {chamadoSelecionado ? (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Título</Typography>
                  <Typography>{chamadoSelecionado.title || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Typography>{getStatusLabel(chamadoSelecionado.status)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Usuário</Typography>
                  <Typography>{chamadoSelecionado.userName || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Prioridade</Typography>
                  <Typography>{chamadoSelecionado.priority || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Categoria</Typography>
                  <Typography>{chamadoSelecionado.category || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Atribuído a</Typography>
                  <Typography>{getAssignedUserName(chamadoSelecionado.assignedTo)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Detalhes da Ocorrência</Typography>
                  <Typography>{chamadoSelecionado.description || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">IP da Máquina</Typography>
                  <Typography>{chamadoSelecionado.ip || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Código AnyDesk</Typography>
                  <Typography>{chamadoSelecionado.anydeskCode || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Criado em</Typography>
                  <Typography>{chamadoSelecionado.created_at ? new Date(chamadoSelecionado.created_at).toLocaleString('pt-BR') : '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Vencimento</Typography>
                  <Typography>{chamadoSelecionado.dueDate ? new Date(chamadoSelecionado.dueDate).toLocaleString('pt-BR') : '-'}</Typography>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Typography>Nenhum chamado selecionado.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'flex-start', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="inherit" 
            size="small" 
            onClick={() => setAtenderOpen(true)}
            sx={{ color: 'text.secondary', borderColor: 'divider', textTransform: 'none' }}
          >
            Atender
          </Button>
          <Button 
            variant="outlined" 
            color="inherit" 
            size="small" 
            onClick={() => setAtribuirOpen(true)}
            sx={{ color: 'text.secondary', borderColor: 'divider', textTransform: 'none' }}
          >
            Atribuir
          </Button>
          <Button 
            variant="outlined" 
            color="inherit" 
            size="small" 
            onClick={() => setResolverOpen(true)}
            sx={{ color: 'text.secondary', borderColor: 'divider', textTransform: 'none' }}
          >
            Resolver
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Atender */}
      <Dialog open={atenderOpen} onClose={() => setAtenderOpen(false)}>
        <DialogTitle>Confirmar Atendimento</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{submitError}</Alert>
          )}
          <Typography variant="body1" sx={{ mt: 2 }}>
            O chamado <strong>#{chamadoSelecionado?.id}</strong> do usuário <strong>{chamadoSelecionado?.userName}</strong> será atribuído a você (<strong>{currentUser?.first_name || 'Técnico'}</strong>).
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Data/Hora da Atribuição: {new Date().toLocaleString('pt-BR')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAtenderOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmarAtendimento}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Atribuir */}
      <Dialog open={atribuirOpen} onClose={() => setAtribuirOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Atribuir Chamado</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{submitError}</Alert>
          )}
          <Typography variant="body2" sx={{ mb: 3, mt: 2 }}>
            Este chamado será atribuído a outro técnico ou transferido para a fila de outra equipe. Por favor, selecione o destino abaixo:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Equipe"
                value={atribuiDados.equipe}
                onChange={(e) => setAtribuiDados({ equipe: e.target.value, tecnico: '' })}
              >
                {equipesExemplo.map(e => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Técnico"
                disabled={!atribuiDados.equipe}
                value={atribuiDados.tecnico}
                onChange={(e) => setAtribuiDados({ ...atribuiDados, tecnico: e.target.value })}
              >
                {equipesExemplo.find(e => e.id === atribuiDados.equipe)?.tecnicos?.map(t => (
                  <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>
                )) || []}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAtribuirOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmarAtribuicao} disabled={!atribuiDados.tecnico}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Resolver */}
      <Dialog open={resolverOpen} onClose={() => setResolverOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>Finalizar Chamado #{chamadoSelecionado?.id}</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{submitError}</Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Número do Chamado: #{chamadoSelecionado?.id}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Diagnóstico"
                  multiline
                  rows={2}
                  value={resolverDados.diagnostico}
                  onChange={(e) => setResolverDados({...resolverDados, diagnostico: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Solução Aplicada"
                  multiline
                  rows={2}
                  value={resolverDados.solucao}
                  onChange={(e) => setResolverDados({...resolverDados, solucao: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Pendências"
                  placeholder="Se houver..."
                  value={resolverDados.pendencias}
                  onChange={(e) => setResolverDados({...resolverDados, pendencias: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>Pesquisa de Satisfação</Typography>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
                  O nível de satisfação será registrado e enviado ao solicitante.
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={resolverDados.satisfacao}
                  onChange={(e) => setResolverDados({...resolverDados, satisfacao: e.target.value})}
                >
                  <MenuItem value={5}>⭐⭐⭐⭐⭐ (Excelente)</MenuItem>
                  <MenuItem value={4}>⭐⭐⭐⭐ (Muito Bom)</MenuItem>
                  <MenuItem value={3}>⭐⭐⭐ (Bom)</MenuItem>
                  <MenuItem value={2}>⭐⭐ (Regular)</MenuItem>
                  <MenuItem value={1}>⭐ (Ruim)</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResolverOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleConfirmarResolucao}
            disabled={!resolverDados.diagnostico || !resolverDados.solucao}
          >
            Concluir Atendimento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu Contexto */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuFechar}
      >
        <MenuItem onClick={() => { setAtenderOpen(true); handleMenuFechar(); }}>
          <CheckCircle sx={{ mr: 1 }} /> Atender
        </MenuItem>
        <MenuItem onClick={() => { setAtribuirOpen(true); handleMenuFechar(); }}>
          <Flag sx={{ mr: 1 }} /> Atribuir
        </MenuItem>
        <MenuItem onClick={() => chamadoSelecionado && handleAbrirDetalhes(chamadoSelecionado)}>
          <Settings sx={{ mr: 1 }} /> Visualizar Detalhes
        </MenuItem>
        <MenuItem onClick={handleMenuFechar}>
          <Flag sx={{ mr: 1 }} /> Marcar como Favorito
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuFechar} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} /> Remover
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Chamados;