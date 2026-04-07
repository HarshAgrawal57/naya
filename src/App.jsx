import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Bell, BarChart3, Map, Settings, Zap, ChevronRight, X } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Records from './pages/Records.jsx';
import Analytics from './pages/Analytics.jsx';
import LiveMap from './pages/LiveMap.jsx';
import CheckInModal from './components/CheckInModal.jsx';
import { api, WS_URL } from './utils/api.js';

function App() {
    // Your app logic here
}

export default App;