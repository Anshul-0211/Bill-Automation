import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    contactPerson: '',
    contactNo: ''
  });
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        gstin: customer.gstin,
        address: customer.address,
        contactPerson: customer.contactPerson,
        contactNo: customer.contactNo
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        gstin: '',
        address: '',
        contactPerson: '',
        contactNo: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveCustomer = async () => {
    try {
      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, formData);
        setAlert({ show: true, message: 'Customer updated successfully!', severity: 'success' });
      } else {
        await axios.post('/api/customers', formData);
        setAlert({ show: true, message: 'Customer added successfully!', severity: 'success' });
      }
      fetchCustomers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving customer:', error);
      setAlert({ show: true, message: 'Error saving customer', severity: 'error' });
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`/api/customers/${id}`);
        setAlert({ show: true, message: 'Customer deleted successfully!', severity: 'success' });
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        setAlert({ show: true, message: 'Error deleting customer', severity: 'error' });
      }
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Manage Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Customer
        </Button>
      </Box>

      {alert.show && (
        <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, show: false })} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>GSTIN</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Contact No</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.gstin}</TableCell>
                <TableCell>{customer.address}</TableCell>
                <TableCell>{customer.contactPerson}</TableCell>
                <TableCell>{customer.contactNo}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(customer)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GSTIN"
                value={formData.gstin}
                onChange={(e) => handleFormChange('gstin', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
                multiline
                rows={3}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Number"
                value={formData.contactNo}
                onChange={(e) => handleFormChange('contactNo', e.target.value)}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCustomer} variant="contained">
            {editingCustomer ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CustomerManagement;
