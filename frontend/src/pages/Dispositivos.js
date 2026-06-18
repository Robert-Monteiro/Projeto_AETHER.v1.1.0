import React, { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import api from '../api';
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
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Menu,
} from '@mui/material';
import {
  Download,
  Add,
  Settings,
  Edit,
  Delete,
  MoreVert,
  GetApp,
  Star,
  Search,
  FilterList as Filter,
} from '@mui/icons-material';

const Dispositivos = () => {
  const [dispositivos, setDispositivos] = useState([
    {
      id: 1,
      nome: 'DESKTOP-VFJ2IO',
      ia: 'Robert.De Luca',
      ultimoLogin: 'mar 10, 2026 7:32:32',
      disponibilidade: 'Online',
      tipo: 'PC',
      site: 'Unassigne',
      pasta: 0,
      alertas: 0,
      patches: 2,
      reinicioPendente: false,
      acessoRemoto: [],
    },
  ]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/devices');
        setDispositivos(res.data);
      } catch (err) {
        console.error('Failed to load devices', err);
      }
    };

    loadDevices();

    // SignalR connection
    const token = localStorage.getItem('token');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/agenthub', { accessTokenFactory: () => token || '' })
      .withAutomaticReconnect()
      .build();

    connection.start().then(() => console.log('SignalR connected')).catch(() => {});

    connection.on('AgentRegistered', (device) => {
      setDispositivos(prev => {
        // avoid duplicates
        if (prev.some(d => d.id === device.Id)) return prev;
        return [device, ...prev];
      });
    });

    return () => {
      connection.stop().catch(() => {});
    };
  }, []);

  const [viewMode, setViewMode] = useState('tabela');
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [dialogAcessoRemoto, setDialogAcessoRemoto] = useState(false);
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDispositivo, setMenuDispositivo] = useState(null);

  const ferramentasAcesso = [
    { nome: 'RealVNC Viewer', ícone: '🖥️', cor: '#FF6B6B' },
    { nome: 'Splashtop', ícone: '💧', cor: '#4ECDC4' },
    { nome: 'AnyDesk', ícone: '🔴', cor: '#FF1744' },
    { nome: 'TeamViewer', ícone: '👥', cor: '#0084FF' },
    { nome: 'ScreenConnect', ícone: '🖱️', cor: '#9C27B0' },
  ];

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRows(dispositivos.map(d => d.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleNovoDispositivo = () => {
    alert('Modal para criar novo dispositivo');
  };

  const handleBaixarExcel = () => {
    alert('Baixar relatório em Excel');
  };

  const handlePerguntarIA = () => {
    alert('Abrir chat IA para análise');
  };

  const handleAcessoRemoto = (dispositivo) => {
    setDispositivoSelecionado(dispositivo);
    setDialogAcessoRemoto(true);
  };

  const handleFerramentaAcesso = (ferramenta) => {
    alert(`Conectando via ${ferramenta}...`);
    setDialogAcessoRemoto(false);
  };

  const handleMenuAbrir = (event, dispositivo) => {
    setMenuDispositivo(dispositivo);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuFechar = () => {
    setMenuAnchor(null);
  };

  const dispositivosFiltrados = dispositivos.filter(d =>
    d.nome.toLowerCase().includes(searchText.toLowerCase()) ||
    d.site.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Dispositivos
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNovoDispositivo}
            sx={{ bgcolor: '#2196F3' }}
          >
            Novo dispositivo
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
            startAdornment={<Search sx={{ mr: 1, color: 'action.active' }} />}
          />

          <Button
            size="small"
            variant="outlined"
            startIcon={<Settings />}
            onClick={handlePerguntarIA}
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
            onClick={handleBaixarExcel}
          >
            Excel
          </Button>
        </Box>

        {/* Ações em lote */}
        {selectedRows.length > 0 && (
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" startIcon={<Edit />}>Executar script</Button>
            <Button size="small" startIcon={<Settings />}>Atribuir perfil de automação</Button>
            <Button size="small" startIcon={<Download />}>Instalação de software</Button>
            <Button size="small" startIcon={<Settings />}>Atribuir perfil de limite</Button>
            <Typography variant="caption" sx={{ alignSelf: 'center', ml: 'auto' }}>
              {selectedRows.length} selecionado(s)
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Informações */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          Exibindo {dispositivosFiltrados.length} de {dispositivos.length} dispositivos
        </Typography>
      </Box>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRows.length > 0 && selectedRows.length < dispositivos.length}
                  checked={selectedRows.length === dispositivos.length && dispositivos.length > 0}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Dispositivo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Usuário</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Último login</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Disponibilidade</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Dispositivo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Site</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Pasta</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Alertas</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Patches Disponíveis</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Reinício pendente</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Acesso remoto</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dispositivosFiltrados.map((dispositivo) => (
              <TableRow key={dispositivo.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRows.includes(dispositivo.id)}
                    onChange={() => handleSelectRow(dispositivo.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>🖥️</span>
                    <strong>{dispositivo.nome}</strong>
                  </Box>
                </TableCell>
                <TableCell>{dispositivo.ia}</TableCell>
                <TableCell>{dispositivo.ultimoLogin}</TableCell>
                <TableCell>
                  <Chip
                    label={dispositivo.disponibilidade}
                    color={dispositivo.disponibilidade === 'Online' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{dispositivo.tipo}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    color="primary"
                    sx={{ textTransform: 'none' }}
                  >
                    {dispositivo.site}
                  </Button>
                </TableCell>
                <TableCell>{dispositivo.pasta}</TableCell>
                <TableCell>{dispositivo.alertas}</TableCell>
                <TableCell>
                  <Chip
                    label={dispositivo.patches}
                    size="small"
                    sx={{ bgcolor: '#2196F3', color: '#fff' }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={dispositivo.reinicioPendente}
                    disabled
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleAcessoRemoto(dispositivo)}
                  >
                    Conectar
                  </Button>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuAbrir(e, dispositivo)}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Acesso Remoto */}
      <Dialog
        open={dialogAcessoRemoto}
        onClose={() => setDialogAcessoRemoto(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#2196F3', color: '#fff', fontWeight: 'bold' }}>
          Acesso Remoto - {dispositivoSelecionado?.nome}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'textSecondary' }}>
            Selecione a ferramenta de acesso remoto:
          </Typography>

          <List>
            {ferramentasAcesso.map((ferramenta, idx) => (
              <React.Fragment key={idx}>
                <ListItem
                  button
                  onClick={() => handleFerramentaAcesso(ferramenta.nome)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    border: '1px solid #eee',
                    '&:hover': { bgcolor: '#f5f5f5' },
                  }}
                >
                  <ListItemIcon sx={{ color: ferramenta.cor, fontSize: '24px' }}>
                    {ferramenta.ícone}
                  </ListItemIcon>
                  <ListItemText
                    primary={ferramenta.nome}
                    secondary={`Conectar usando ${ferramenta.nome}`}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Button
            fullWidth
            variant="outlined"
            startIcon={<Settings />}
            sx={{ mt: 2 }}
          >
            Configurações de acesso remoto
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAcessoRemoto(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Menu Contexto */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuFechar}
      >
        <MenuItem onClick={handleMenuFechar}>
          <Edit sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem onClick={handleMenuFechar}>
          <Settings sx={{ mr: 1 }} /> Configurar
        </MenuItem>
        <MenuItem onClick={handleMenuFechar}>
          <Star sx={{ mr: 1 }} /> Favorito
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuFechar} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} /> Remover
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Dispositivos;
