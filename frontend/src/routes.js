import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CreateBazaar from './pages/CreateBazaar';
import CreateTrip from './pages/CreateTrip';
import EditBazaar from './pages/EditBazaar';
import EditTrip from './pages/EditTrip';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Only YOUR routes - your teammates will add theirs separately */}
      <Route path="/create-bazaar" element={<CreateBazaar />} />
      <Route path="/create-trip" element={<CreateTrip />} />
      <Route path="/edit-bazaar/:id" element={<EditBazaar />} />
      <Route path="/edit-trip/:id" element={<EditTrip />} />
    </Routes>
  );
};

export default AppRoutes;