import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  TextField, MenuItem, Grid, Chip
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAssets, createAsset, updateAsset, deleteAsset } from '../features/assetsSlice';
import { fetchUsers } from '../features/usersSlice';

const Assets = () => {
  const dispatch = useDispatch();
  const { assets, loading } = useSelector(state => state.assets);
  const { users } = useSelector(state => state.users);
  const [open, setOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'hardware',
    category: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'active',
    cost: '',
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchAssets());
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleOpen = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name || '',
        type: asset.type || 'hardware',
        category: asset.category || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serialNumber: asset.serial_number || '',
        location: asset.location || '',
        status: asset.status || 'active',
        cost: asset.cost || '',
        notes: asset.notes || '',
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: '',
        type: 'hardware',
        category: '',
        manufacturer: '',
        model: '',
        serialNumber: '',
        location: '',
        status: 'active',
        cost: '',
        notes: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingAsset(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingAsset) {
      await dispatch(updateAsset({ id: editingAsset.id, data: formData }));
    } else {
      await dispatch(createAsset(formData));
    }
    dispatch(fetchAssets());
    handleClose();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      await dispatch(deleteAsset(id));
      dispatch(fetchAssets());
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'maintenance': return 'warning';
      case 'retired': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Assets</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>
          Add Asset
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.type}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell>
                  <Chip label={asset.status} color={getStatusColor(asset.status)} />
                </TableCell>
                <TableCell>{asset.location}</TableCell>
                <TableCell>
                  <Button onClick={() => handleOpen(asset)}>Edit</Button>
                  <Button onClick={() => handleDelete(asset.id)} color="error">Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Asset Form Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="hardware">Hardware</MenuItem>
                  <MenuItem value="software">Software</MenuItem>
                  <MenuItem value="license">License</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Serial Number"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cost"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingAsset ? 'Update' : 'Create'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Assets;