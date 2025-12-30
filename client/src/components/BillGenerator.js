import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Alert,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Download as DownloadIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const BillGenerator = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [gstType, setGstType] = useState('instate'); // 'nogst', 'instate', 'outofstate'
  const [billData, setBillData] = useState({
    billNo: '',
    billDate: format(new Date(), 'dd/MM/yyyy'),
    placeOfSupply: '',
    remarks: '',
    customer: {
      name: '',
      gstin: '',
      address: '',
      contactPerson: '',
      contactNo: ''
    },
    items: [
      {
        lrDate: '',
        lrNo: '',
        vehicleNo: '',
        fromLocation: '',
        toLocation: '',
        freightCharge: '',
        documentCharges: '0',
        loadingCharges: '0',
        doorDeliveryCharges: '0',
        haltingCharges: '0',
        otherCharges: '0',
        amount: '0'
      }
    ]
  });
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [lastBillInfo, setLastBillInfo] = useState([]);

  // Format date input helper
  const formatDateInput = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    } else {
      return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchLastBillInfo();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLastBillInfo = async () => {
    try {
      const response = await axios.get('/api/bills/last');
      setLastBillInfo(response.data);
    } catch (error) {
      console.error('Error fetching last bill info:', error);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customerId);
      setBillData(prev => ({
        ...prev,
        customer: {
          name: customer.name,
          gstin: customer.gstin,
          address: customer.address,
          contactPerson: customer.contactPerson,
          contactNo: customer.contactNo
        }
      }));
    }
  };

  const handleBillDataChange = (field, value) => {
    setBillData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...billData.items];
    newItems[index][field] = value;
    
    // Calculate amount for this row
    if (['freightCharge', 'documentCharges', 'loadingCharges', 'doorDeliveryCharges', 'haltingCharges', 'otherCharges'].includes(field)) {
      const item = newItems[index];
      const amount = 
        parseFloat(item.freightCharge || 0) +
        parseFloat(item.documentCharges || 0) +
        parseFloat(item.loadingCharges || 0) +
        parseFloat(item.doorDeliveryCharges || 0) +
        parseFloat(item.haltingCharges || 0) +
        parseFloat(item.otherCharges || 0);
      newItems[index].amount = amount.toString();
    }
    
    setBillData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    // Copy vehicle number from first row if exists
    const vehicleNo = billData.items.length > 0 ? billData.items[0].vehicleNo : '';
    
    setBillData(prev => ({
      ...prev,
      items: [...prev.items, {
        lrDate: '',
        lrNo: '',
        vehicleNo: vehicleNo, // Copy from first row
        fromLocation: '',
        toLocation: '',
        freightCharge: '',
        documentCharges: '0',
        loadingCharges: '0',
        doorDeliveryCharges: '0',
        haltingCharges: '0',
        otherCharges: '0',
        amount: '0'
      }]
    }));
  };

  const removeItem = (index) => {
    setBillData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const taxableValue = billData.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    let sgst = 0;
    let cgst = 0;
    let igst = 0;
    
    if (gstType === 'instate') {
      sgst = taxableValue * 0.09;
      cgst = taxableValue * 0.09;
    } else if (gstType === 'outofstate') {
      igst = taxableValue * 0.18;
    }
    // For 'nogst', all taxes remain 0
    
    const grandTotal = taxableValue + sgst + cgst + igst;
    
    return {
      taxableValue: taxableValue.toFixed(2),
      sgst: sgst.toFixed(2),
      cgst: cgst.toFixed(2),
      igst: igst.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    
    if (num === 0) return 'Zero Rupees Only';
    
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;
    
    let result = '';
    if (crore) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (remainder) result += convertLessThanThousand(remainder);
    
    return result.trim() + ' Rupees Only';
  };

  const generatePDF = async () => {
    if (!billData.billNo || !billData.customer.name) {
      setAlert({ show: true, message: 'Please fill in bill number and select a customer', severity: 'error' });
      return;
    }

    try {
      const totals = calculateTotals();
      const amountInWords = numberToWords(Math.floor(parseFloat(totals.grandTotal)));
      
      const response = await axios.post('/api/generate-bill', {
        ...billData,
        totals,
        amountInWords,
        gstType
      }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bill-${billData.billNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setAlert({ show: true, message: 'Bill generated successfully!', severity: 'success' });
      
      // Refresh last bill info after generating
      fetchLastBillInfo();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setAlert({ show: true, message: 'Error generating PDF', severity: 'error' });
    }
  };

  const totals = calculateTotals();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Generate Bill
      </Typography>

      {alert.show && (
        <Alert severity={alert.severity} onClose={() => setAlert({ ...alert, show: false })} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Last Bill Info Notification */}
      {lastBillInfo && lastBillInfo.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {lastBillInfo.map((bill) => (
            <Alert key={bill.company_id} severity="info" sx={{ mb: 1 }}>
              Last bill for <strong>{bill.company_name}</strong>: <strong>#{bill.bill_number}</strong> by{' '}
              <strong>{bill.generated_by}</strong>
            </Alert>
          ))}
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Bill Details */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Bill Number"
            value={billData.billNo}
            onChange={(e) => handleBillDataChange('billNo', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Bill Date"
            value={billData.billDate}
            onChange={(e) => handleBillDataChange('billDate', formatDateInput(e.target.value))}
            placeholder="DD/MM/YYYY"
            inputProps={{ maxLength: 10 }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Place of Supply"
            value={billData.placeOfSupply}
            onChange={(e) => handleBillDataChange('placeOfSupply', e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Remarks (Optional)"
            value={billData.remarks}
            onChange={(e) => handleBillDataChange('remarks', e.target.value)}
            multiline
            rows={2}
          />
        </Grid>

        {/* Customer Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Select Customer</InputLabel>
            <Select
              value={selectedCustomer}
              onChange={(e) => handleCustomerSelect(e.target.value)}
              label="Select Customer"
            >
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Customer Details (Auto-filled) */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Customer Name"
            value={billData.customer.name}
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Customer GSTIN"
            value={billData.customer.gstin}
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address"
            value={billData.customer.address}
            InputProps={{ readOnly: true }}
            multiline
            rows={2}
          />
        </Grid>

        {/* Line Items Table */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Line Items</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>GST Type</InputLabel>
                <Select
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value)}
                  label="GST Type"
                >
                  <MenuItem value="instate">In State (CGST + SGST)</MenuItem>
                  <MenuItem value="outofstate">Out of State (IGST)</MenuItem>
                  <MenuItem value="nogst">No GST</MenuItem>
                </Select>
              </FormControl>
              <Button startIcon={<AddIcon />} variant="contained" onClick={addItem}>
                Add Row
              </Button>
            </Box>
          </Box>

          {/* Desktop View - Table */}
          {!isMobile && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>LR Date</TableCell>
                    <TableCell>LR No.</TableCell>
                    <TableCell>Vehicle No.</TableCell>
                    <TableCell>From</TableCell>
                    <TableCell>To</TableCell>
                    <TableCell>Freight</TableCell>
                    {/* <TableCell>Document</TableCell> */}
                    <TableCell>Loading</TableCell>
                    {/* <TableCell>Door Delivery</TableCell> */}
                    <TableCell>Halting</TableCell>
                    <TableCell>Other</TableCell>
                    <TableCell>Amount</TableCell>
                    {/* <TableCell>Action</TableCell> */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.lrDate}
                          onChange={(e) => handleItemChange(index, 'lrDate', formatDateInput(e.target.value))}
                          placeholder="DD/MM/YYYY"
                          inputProps={{ maxLength: 10 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.lrNo}
                          onChange={(e) => handleItemChange(index, 'lrNo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.vehicleNo}
                          onChange={(e) => handleItemChange(index, 'vehicleNo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.fromLocation}
                          onChange={(e) => handleItemChange(index, 'fromLocation', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={item.toLocation}
                          onChange={(e) => handleItemChange(index, 'toLocation', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.freightCharge}
                          onChange={(e) => handleItemChange(index, 'freightCharge', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.loadingCharges}
                          onChange={(e) => handleItemChange(index, 'loadingCharges', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.haltingCharges}
                          onChange={(e) => handleItemChange(index, 'haltingCharges', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={item.otherCharges}
                          onChange={(e) => handleItemChange(index, 'otherCharges', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>{item.amount}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeItem(index)}
                          disabled={billData.items.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Mobile View - Cards */}
          {isMobile && (
            <Box>
              {billData.items.map((item, index) => (
                <Card key={index} sx={{ mb: 2, position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Item #{index + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeItem(index)}
                        disabled={billData.items.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="LR Date"
                          value={item.lrDate}
                          onChange={(e) => handleItemChange(index, 'lrDate', formatDateInput(e.target.value))}
                          placeholder="DD/MM/YYYY"
                          inputProps={{ maxLength: 10 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="LR No."
                          value={item.lrNo}
                          onChange={(e) => handleItemChange(index, 'lrNo', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Vehicle No."
                          value={item.vehicleNo}
                          onChange={(e) => handleItemChange(index, 'vehicleNo', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="From Location"
                          value={item.fromLocation}
                          onChange={(e) => handleItemChange(index, 'fromLocation', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="To Location"
                          value={item.toLocation}
                          onChange={(e) => handleItemChange(index, 'toLocation', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>Charges</Divider>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Freight Charge"
                          type="number"
                          value={item.freightCharge}
                          onChange={(e) => handleItemChange(index, 'freightCharge', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Loading Charges"
                          type="number"
                          value={item.loadingCharges}
                          onChange={(e) => handleItemChange(index, 'loadingCharges', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Halting Charges"
                          type="number"
                          value={item.haltingCharges}
                          onChange={(e) => handleItemChange(index, 'haltingCharges', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Other Charges"
                          type="number"
                          value={item.otherCharges}
                          onChange={(e) => handleItemChange(index, 'otherCharges', e.target.value)}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ bgcolor: 'primary.light', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="body2" color="primary.contrastText" fontWeight="bold">
                            Total Amount: ₹{item.amount}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Grid>

        {/* Totals */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box sx={{ width: '300px' }}>
              <Grid container spacing={1}>
                <Grid item xs={8}><Typography>Taxable Value:</Typography></Grid>
                <Grid item xs={4}><Typography align="right">₹{totals.taxableValue}</Typography></Grid>
                
                <Grid item xs={8}><Typography>SGST @ 9%:</Typography></Grid>
                <Grid item xs={4}><Typography align="right">₹{totals.sgst}</Typography></Grid>
                
                <Grid item xs={8}><Typography>CGST @ 9%:</Typography></Grid>
                <Grid item xs={4}><Typography align="right">₹{totals.cgst}</Typography></Grid>
                
                <Grid item xs={8}><Typography variant="h6">Grand Total:</Typography></Grid>
                <Grid item xs={4}><Typography variant="h6" align="right">₹{totals.grandTotal}</Typography></Grid>
              </Grid>
            </Box>
          </Box>
        </Grid>

        {/* Generate Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<DownloadIcon />}
              onClick={generatePDF}
            >
              Generate PDF Bill
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BillGenerator;
