import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { ClubProvider } from './clubs/ClubProvider.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateClub from './pages/CreateClub.jsx';

import ClubLayout from './pages/club/ClubLayout.jsx';
import ClubHome from './pages/club/Home.jsx';
import Squad from './pages/club/Squad.jsx';
import Fixtures from './pages/club/Fixtures.jsx';
import Table from './pages/club/Table.jsx';
import Stats from './pages/club/Stats.jsx';
import HallOfFame from './pages/club/HallOfFame.jsx';
import Predictor from './pages/club/Predictor.jsx';
import Report from './pages/club/Report.jsx';
import Matchday from './pages/club/Matchday.jsx';
import Combine from './pages/club/Combine.jsx';
import Settings from './pages/club/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/new" element={<ProtectedRoute><CreateClub /></ProtectedRoute>} />

          <Route path="/c/:slug" element={<ClubProvider><ClubLayout /></ClubProvider>}>
            <Route index element={<ClubHome />} />
            <Route path="squad" element={<Squad />} />
            <Route path="fixtures" element={<Fixtures />} />
            <Route path="table" element={<Table />} />
            <Route path="stats" element={<Stats />} />
            <Route path="hall-of-fame" element={<HallOfFame />} />
            <Route path="predictor" element={<Predictor />} />
            <Route path="report" element={<Report />} />
            <Route path="matchday" element={<Matchday />} />
            <Route path="combine" element={<Combine />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
