
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Navbar from './components/navbar/Navbar';
import Footer from './components/footer/Footer';
import RequireAuth from './components/auth/RequireAuth';
import BookingSummary from './components/BookingSummary';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import DashboardPassenger from './components/DashboardPassenger';
import DashboardDriver from './components/DashboardDriver';
import DashboardAdmin from './components/DashboardAdmin';
import AssignedTrips from './components/AssignedTrips';
import ManageSchedule from './components/ManageSchedule';
import EditSchedule from './components/EditSchedule';
import TrackBooking from './components/TrackBooking';
import ManageBus from './components/ManageBus';
import ManageDriver from './components/ManageDriver';
import ManageRoute from './components/ManageRoute';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import MyBookings from './components/MyBookings';

import HomeContainer from './pages/home_container/HomeContainer';
import About from './pages/about/About';
import Services from './pages/services/Services';
import Bus from './pages/bus/Bus';
import Detail from './pages/bus/Detail';
import Checkout from './pages/checkout/Checkout';
import TrackBus from './pages/TrackBus';
import DriverTrack from './pages/DriverTrack';
import ErrorBoundary from './pages/ErrorBoundary';
import ErrorBoundaryAdmin from './components/ErrorBoundaryAdmin';
import ConfirmGroupBooking from './components/ConfirmGroupBooking';
import GroupChatLink from './components/GroupChatLink';




import { useState, useEffect } from 'react';

function Layout() {
  const location = useLocation();
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Load user from localStorage on mount or path change
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setLoggedInUser(JSON.parse(userStr));
      } else {
        setLoggedInUser(null);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage");
    }
  }, [location.key]);

  return (
    <div className="w-full min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-300 flex flex-col overflow-hidden">
      {/* Always render Navbar */}
      <Navbar user={loggedInUser} />

      {/* Main content with padding to avoid overlap with fixed Navbar */}
      <main className="flex-1 pt-[8ch]">
        <Routes>
          <Route path="/" element={<HomeContainer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/about" element={<About />} />

          <Route path="/services" element={<Services user={loggedInUser} />} />
          <Route path="/services/safety-guarantee" element={<Services user={loggedInUser} />} />
          <Route path="/services/faq-support" element={<Services user={loggedInUser} />} />
          <Route path="/services/luxury-buses" element={<Services user={loggedInUser} />} />
          <Route path="/services/enough-facilities" element={<Services user={loggedInUser} />} />

          {/* Protected Routes */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-passenger"
            element={
              <RequireAuth allowedRoles={['passenger']}>
                <DashboardPassenger />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-driver"
            element={
              <RequireAuth allowedRoles={['driver']}>
                <DashboardDriver />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-admin"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ErrorBoundaryAdmin>
                  <DashboardAdmin />
                </ErrorBoundaryAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-driver/assigned-trips"
            element={
              <RequireAuth allowedRoles={['driver']}>
                <AssignedTrips />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-driver/manage-schedule"
            element={
              <RequireAuth allowedRoles={['driver']}>
                <ManageSchedule />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-driver/track-booking"
            element={
              <RequireAuth allowedRoles={['driver']}>
                <TrackBooking />
              </RequireAuth>
            }
          />
          <Route
            path="/edit-schedule/:id"
            element={
              <RequireAuth allowedRoles={['driver']}>
                <EditSchedule />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-admin/manage-bus"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageBus />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-admin/manage-driver"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageDriver />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-admin/manage-route"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <ManageRoute />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard-passenger/bookings"
            element={
              <RequireAuth allowedRoles={['passenger']}>
                <MyBookings />
              </RequireAuth>
            }
          />
          <Route path="/bus" element={<Bus />} />
          <Route path="/bus/bus-details/:id" element={<Detail />} />
          <Route path="/track-bus/:busId/:bookingId" element={<TrackBus />} />
          <Route path="/driver-track/:busId" element={<DriverTrack />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth allowedRoles={['passenger']}>
                <Checkout />
              </RequireAuth>
            }
          />

          <Route
            path="/driver-track/:busId"
            element={
              <ErrorBoundary>
                <RequireAuth allowedRoles={['driver']}>
                  <DriverTrack />
                </RequireAuth>
              </ErrorBoundary>
            }
          />
          <Route path="/booking-summary/:id" element={<BookingSummary />} />

          <Route path="/confirm-group-booking/:bookingId/:email" element={<ConfirmGroupBooking />} />

          <Route path="/group-chat/:bookingId/:email" element={<GroupChatLink />} />

        </Routes>
      </main>

      {/* Always render Footer */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
