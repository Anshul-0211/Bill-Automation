import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Tabs, Tab, AppBar, Toolbar, Typography, Button, IconButton } from '@mui/material';
import { ExitToApp as LogoutIcon } from '@mui/icons-material';
import BillGenerator from './components/BillGenerator';
import CustomerManagement from './components/CustomerManagement';
import CompanySettings from './components/CompanySettings';
import Login from './components/Login';
import axios from 'axios';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/status', {
        withCredentials: true
      });
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, {
        withCredentials: true
      });
      setUser(null);
      setCurrentTab(0);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bill Automation System
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.username} ({user.role})
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl">
        <Box sx={{ my: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Generate Bill" />
              <Tab label="Manage Customers" />
              <Tab label="Company Settings" />
            </Tabs>
          </Box>

          {currentTab === 0 && <BillGenerator />}
          {currentTab === 1 && <CustomerManagement />}
          {currentTab === 2 && <CompanySettings />}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
