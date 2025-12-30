import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Save as SaveIcon, CloudUpload as UploadIcon } from '@mui/icons-material';
import axios from 'axios';

const CompanySettings = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyInfo, setCompanyInfo] = useState({
    id: '',
    name: '',
    ward: '',
    district: '',
    state: '',
    pinCode: '',
    gstin: '',
    pan: '',
    email: '',
    contactPerson: '',
    contactNo: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    branch: ''
  });
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCompanies();
    fetchCompanyInfo();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await axios.get('/api/company');
      setCompanyInfo(response.data);
      setSelectedCompanyId(response.data.id);
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const handleCompanySelect = async (companyId) => {
    try {
      const response = await axios.post('/api/company/select', { companyId });
      setCompanyInfo(response.data);
      setSelectedCompanyId(companyId);
      setAlert({ show: true, message: 'Company switched successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error selecting company:', error);
      setAlert({ show: true, message: 'Error switching company', severity: 'error' });
    }
  };

  const handleChange = (field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveCompanyInfo = async () => {
    try {
      await axios.put('/api/company', companyInfo);
      setAlert({ show: true, message: 'Company information updated successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error updating company info:', error);
      setAlert({ show: true, message: 'Error updating company information', severity: 'error' });
    }
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSignature = async () => {
    if (!signatureFile) {
      setAlert({ show: true, message: 'Please select a signature file', severity: 'warning' });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('signature', signatureFile);
      
      await axios.post('/api/upload-signature', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setAlert({ show: true, message: 'Signature uploaded successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error uploading signature:', error);
      setAlert({ show: true, message: 'Error uploading signature', severity: 'error' });
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Company Settings
      </Typography>

      {alert.show && (
        <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, show: false })} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Company Selection */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Select Company</InputLabel>
            <Select
              value={selectedCompanyId}
              onChange={(e) => handleCompanySelect(e.target.value)}
              label="Select Company"
            >
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Company Information */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Company Information
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Company Name"
            value={companyInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email"
            value={companyInfo.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Ward"
            value={companyInfo.ward}
            onChange={(e) => handleChange('ward', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="District"
            value={companyInfo.district}
            onChange={(e) => handleChange('district', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="State"
            value={companyInfo.state}
            onChange={(e) => handleChange('state', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Pin Code"
            value={companyInfo.pinCode}
            onChange={(e) => handleChange('pinCode', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="GSTIN"
            value={companyInfo.gstin}
            onChange={(e) => handleChange('gstin', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="PAN Number"
            value={companyInfo.pan}
            onChange={(e) => handleChange('pan', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact Person"
            value={companyInfo.contactPerson}
            onChange={(e) => handleChange('contactPerson', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact Number"
            value={companyInfo.contactNo}
            onChange={(e) => handleChange('contactNo', e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Bank Details
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Bank Name"
            value={companyInfo.bankName}
            onChange={(e) => handleChange('bankName', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Account Number"
            value={companyInfo.accountNo}
            onChange={(e) => handleChange('accountNo', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="IFSC Code"
            value={companyInfo.ifsc}
            onChange={(e) => handleChange('ifsc', e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Branch Name"
            value={companyInfo.branch}
            onChange={(e) => handleChange('branch', e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveCompanyInfo}
            >
              Save Company Information
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Signature Upload
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Choose Signature Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleSignatureChange}
              />
            </Button>

            {signaturePreview && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>Preview:</Typography>
                <img
                  src={signaturePreview}
                  alt="Signature preview"
                  style={{ maxWidth: '300px', maxHeight: '150px', border: '1px solid #ccc' }}
                />
              </Box>
            )}

            {signatureFile && (
              <Button
                variant="contained"
                onClick={handleUploadSignature}
              >
                Upload Signature
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default CompanySettings;
