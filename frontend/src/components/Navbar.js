import React, { useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/authSlice';
import { installAgent } from '../api';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const tools = [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Chamados', path: '/tickets' },
      { label: 'Dispositivos', path: '/dispositivos' },
    ];
    return tools.filter(t => t.label.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && suggestions.length > 0) {
      navigate(suggestions[0].path);
      setSearchQuery('');
      setAnchorEl(null);
    }
  };

  const handleSuggestionClick = (path) => {
    navigate(path);
    setSearchQuery('');
    setAnchorEl(null);
  };

  const handleInstallAgent = () => {
    const url = installAgent();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'LuxAgent.msi');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img src="/logos/aether.png" alt="AETHER" style={{ height: 60, maxHeight: '60px' }} />
            <TextField
              size="small"
              placeholder="Buscar ferramenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={(event) => setAnchorEl(event.currentTarget)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 280, bgcolor: 'white', borderRadius: 1 }}
            />
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl) && suggestions.length > 0}
              onClose={() => setAnchorEl(null)}
              PaperProps={{ style: { width: 280 } }}
            >
              {suggestions.map((item) => (
                <MenuItem key={item.path} onClick={() => handleSuggestionClick(item.path)}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              color="inherit"
              startIcon={<DownloadIcon />}
              onClick={handleInstallAgent}
              sx={{ textTransform: 'none' }}
            >
              Instalar agente
            </Button>
            <Typography variant="body1" sx={{ alignSelf: 'center', mr: 2 }}>
              Bem-vindo, {user?.firstName}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Navbar;