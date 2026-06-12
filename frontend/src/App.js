import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DevicesIcon from '@mui/icons-material/Devices';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Dispositivos from './pages/Dispositivos';
import Login from './pages/Login';
import { useSelector } from 'react-redux';

const drawerWidth = 240;

function App() {
  const { isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { text: 'Chamados', path: '/tickets', icon: <ConfirmationNumberIcon /> },
    { text: 'Dispositivos', path: '/dispositivos', icon: <DevicesIcon /> },
  ];

  const handleMenuClick = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {isAuthenticated && (
        <Drawer
          variant="permanent"
          sx={{
            width: open ? drawerWidth : 56,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: open ? drawerWidth : 56,
              boxSizing: 'border-box',
              transition: 'width 0.2s',
            },
          }}
          open={open}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', p: 1 }}>
            <IconButton onClick={open ? handleDrawerClose : handleDrawerOpen}>
              {open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
          <Box sx={{ overflowX: 'hidden', pt: 2 }}>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton onClick={() => handleMenuClick(item.path)}>
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, p: 3, ml: isAuthenticated ? (open ? `0px` : '0px') : 0 }}>
        {isAuthenticated && <Navbar />}
        <Box sx={{ mt: isAuthenticated ? 0 : 0 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {isAuthenticated ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tickets" element={<Tickets />} />
                <Route path="/dispositivos" element={<Dispositivos />} />
              </>
            ) : (
              <Route path="*" element={<Login />} />
            )}
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}

export default App;
