import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import maplibregl from 'maplibre-gl';
import geolocationService from '../services/geolocationService';

const socket = io(import.meta.env.VITE_API_BASE_URL);

const DriverTrack = () => {
  const { busId } = useParams();
  const [bus, setBus] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Please log in to track the bus');

        const busResponse = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/bus/${busId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('DriverTrack.jsx: Fetched bus data on mount:', busResponse.data);
        const fetchedBus = busResponse.data.bus;
        setBus(fetchedBus);
        setIsTrackingActive(fetchedBus.isTrackingEnabled);
        setLocation(fetchedBus.isTrackingEnabled ? fetchedBus.currentLocation : null);

        if (fetchedBus.isTrackingEnabled && !geolocationService.isTrackingActive()) {
          console.log('DriverTrack.jsx: Tracking enabled on backend but service not active, starting...');
          geolocationService.startTracking(busId, socket);
        } else if (fetchedBus.isTrackingEnabled) {
          console.log('DriverTrack.jsx: Tracking already active in geolocationService');
        } else {
          console.log('DriverTrack.jsx: Tracking disabled on backend, no action needed');
        }

      } catch (err) {
        setError(`Error loading data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [busId]);

  useEffect(() => {
    const initMap = () => {
      if (!mapContainerRef.current) {
        console.log('DriverTrack.jsx: Map container not ready, retrying...');
        return false;
      }

      if (mapInstanceRef.current) {
        console.log('DriverTrack.jsx: Map already initialized, skipping');
        return true;
      }

      console.log('DriverTrack.jsx: Initializing map');
      const mapTilerKey = import.meta.env.VITE_MAPTILER_KEY;
      if (!mapTilerKey) {
        console.error('DriverTrack.jsx: MapTiler API key is missing');
        setError('MapTiler API key is missing. Please check your environment configuration.');
        setMapLoading(false);
        return true;
      }

      let loadTimeout;

      const initializeMap = async (attempt = 1) => {
        const maxAttempts = 3;
        try {
          const mapInstance = new maplibregl.Map({
            container: mapContainerRef.current,
            style: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerKey}`,
            center: location && location.latitude && location.longitude ? [location.longitude, location.latitude] : [78.4867, 17.3850],
            zoom: 12,
          });

          loadTimeout = setTimeout(() => {
            console.error('DriverTrack.jsx: Map load timed out');
            mapInstance.remove();
            if (attempt < maxAttempts) {
              console.log(`DriverTrack.jsx: Retrying map initialization, attempt ${attempt + 1}`);
              initializeMap(attempt + 1);
            } else {
              setError('Failed to load map after multiple attempts. Please check your network, MapTiler API key, or try again later.');
              setMapLoading(false);
            }
          }, 15000);

          mapInstance.on('load', () => {
            console.log('DriverTrack.jsx: Map loaded successfully');
            clearTimeout(loadTimeout);
            setMapLoading(false);
            mapInstanceRef.current = mapInstance;
            setMap(mapInstance);
          });

          mapInstance.on('error', (e) => {
            console.error('DriverTrack.jsx: Map error:', e.error?.message || 'Unknown map error', e);
            clearTimeout(loadTimeout);
            if (attempt < maxAttempts) {
              console.log(`DriverTrack.jsx: Retrying map initialization, attempt ${attempt + 1}`);
              mapInstance.remove();
              initializeMap(attempt + 1);
            } else {
              setError(`Map error: ${e.error?.message || 'Unknown map error'}. Please check your network or MapTiler API key.`);
              setMapLoading(false);
            }
          });
        } catch (err) {
          console.error('DriverTrack.jsx: Map initialization error:', err.message, err);
          clearTimeout(loadTimeout);
          if (attempt < maxAttempts) {
            console.log(`DriverTrack.jsx: Retrying map initialization, attempt ${attempt + 1}`);
            setTimeout(() => initializeMap(attempt + 1), 2000);
          } else {
            setError('Failed to initialize map: ' + err.message);
            setMapLoading(false);
          }
        }
      };

      initializeMap();
      return true;
    };

    let intervalId;
    const attemptInit = () => {
      const success = initMap();
      if (success) {
        clearInterval(intervalId);
      }
    };

    intervalId = setInterval(attemptInit, 100);
    attemptInit();

    return () => {
      clearInterval(intervalId);
      if (mapInstanceRef.current) {
        console.log('DriverTrack.jsx: Cleaning up map on unmount');
        try {
          mapInstanceRef.current.remove();
        } catch (err) {
          console.error('DriverTrack.jsx: Error cleaning up map:', err);
        }
        mapInstanceRef.current = null;
        setMap(null);
      }
    };
  }, []);

  const markerRef = useRef(null);
  useEffect(() => {
    if (!map || !map.loaded()) {
      return;
    }

    console.log('DriverTrack.jsx: Map ready, processing update');
    const isValidCoordinate = (coord) => typeof coord === 'number' && !isNaN(coord) && coord >= -180 && coord <= 180;

    if (location && isValidCoordinate(location.latitude) && isValidCoordinate(location.longitude)) {
      console.log('DriverTrack.jsx: Updating map with location:', location);
      map.setCenter([location.longitude, location.latitude]);
      if (markerRef.current) {
        markerRef.current.setLngLat([location.longitude, location.latitude]);
        console.log('DriverTrack.jsx: Marker updated at:', [location.longitude, location.latitude]);
      } else {
        console.log('DriverTrack.jsx: Creating new marker at:', [location.longitude, location.latitude]);
        try {
          markerRef.current = new maplibregl.Marker()
            .setLngLat([location.longitude, location.latitude])
            .addTo(map);
          console.log('DriverTrack.jsx: Marker successfully added to map');
        } catch (err) {
          console.error('DriverTrack.jsx: Failed to create marker:', err);
        }
      }
    } else {
      console.log('DriverTrack.jsx: Invalid location, removing marker:', location);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [map, location]);

  useEffect(() => {
    socket.emit('joinBusRoom', busId);
    socket.emit('joinDriverRoom', 'driverRoom');
    console.log(`DriverTrack.jsx: Joined rooms for bus ${busId} and driverRoom`);

    socket.on('locationUpdate', (data) => {
      console.log('DriverTrack.jsx: Received location update via socket:', data);
      setLocation(data);
    });

    socket.on('trackingStatusUpdate', ({ busId: updatedBusId, isTrackingEnabled }) => {
      if (updatedBusId === busId) {
        console.log('DriverTrack.jsx: Received trackingStatusUpdate:', { busId, isTrackingEnabled });
        setIsTrackingActive(isTrackingEnabled);
        if (!isTrackingEnabled) {
          setLocation(null);
          geolocationService.stopTracking();
        }
      }
    });

    socket.on('connect_error', (err) => {
      console.error('DriverTrack.jsx: Socket connection error:', err);
      setError('Failed to connect to live tracking server. Please try again later.');
    });

    return () => {
      socket.emit('leaveBusRoom', busId);
      socket.emit('leaveDriverRoom', 'driverRoom');
      socket.off('locationUpdate');
      socket.off('trackingStatusUpdate');
      socket.off('connect_error');
    };
  }, [busId]);

  useEffect(() => {
    if (
      bus &&
      bus.isTrackingEnabled &&
      socket &&
      socket.connected &&
      !geolocationService.isTrackingActive()
    ) {
      console.log("DriverTrack.jsx: Auto-starting tracking after reload (useEffect)");
      geolocationService.startTracking(busId, socket);
      setIsTrackingActive(true);
    }
  }, [bus, socket]);


  const startTracking = async () => {
    try {
      console.log('DriverTrack.jsx: Start Tracking clicked for bus:', busId);
      console.log('DriverTrack.jsx: Current isTrackingActive state:', isTrackingActive);

      if (isTrackingActive) {
        console.log('DriverTrack.jsx: Tracking is already active, aborting startTracking');
        return;
      }

      const token = localStorage.getItem('token');
      console.log('DriverTrack.jsx: Sending PUT request to enable tracking');
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/bus/${busId}`,
        { isTrackingEnabled: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('DriverTrack.jsx: Tracking enabled on backend:', response.data);

      setBus((prevBus) => ({ ...prevBus, isTrackingEnabled: true }));
      setIsTrackingActive(true);
      console.log('DriverTrack.jsx: Updated isTrackingActive to true');

      geolocationService.startTracking(busId, socket);

      socket.emit('trackingStatusUpdate', { busId, isTrackingEnabled: true });
      console.log('DriverTrack.jsx: Emitted trackingStatusUpdate on start:', { busId, isTrackingEnabled: true });
    } catch (err) {
      console.error('DriverTrack.jsx: Failed to start tracking:', err);
      setError('Failed to start tracking: ' + err.message);
      setIsTrackingActive(false);
      setBus((prevBus) => ({ ...prevBus, isTrackingEnabled: false }));
      socket.emit('trackingStatusUpdate', { busId, isTrackingEnabled: false });
      console.log('DriverTrack.jsx: Emitted trackingStatusUpdate on start failure:', { busId, isTrackingEnabled: false });
    }
  };

  const stopTracking = async () => {
    try {
      console.log('DriverTrack.jsx: Stopping tracking for bus:', busId);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/bus/${busId}`,
        { isTrackingEnabled: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('DriverTrack.jsx: Tracking disabled on backend:', response.data);

      setBus((prevBus) => ({ ...prevBus, isTrackingEnabled: false }));
      setIsTrackingActive(false);
      setLocation(null);
      console.log('DriverTrack.jsx: Updated isTrackingActive to false, cleared location');

      socket.emit('trackingStatusUpdate', { busId, isTrackingEnabled: false });
      console.log('DriverTrack.jsx: Emitted trackingStatusUpdate on stop:', { busId, isTrackingEnabled: false });

      geolocationService.stopTracking();
    } catch (err) {
      console.error('DriverTrack.jsx: Failed to stop tracking:', err);
      setError('Failed to stop tracking: ' + err.message);
      setIsTrackingActive(false);
      setLocation(null);
      socket.emit('trackingStatusUpdate', { busId, isTrackingEnabled: false });
      console.log('DriverTrack.jsx: Emitted trackingStatusUpdate on stop (error fallback):', { busId, isTrackingEnabled: false });
      geolocationService.stopTracking();
    }
  };

  const renderContent = () => (
    <div className="w-full lg:px-28 md:px-16 sm:px-7 px-4 mt-12 my-8">
      <h2 className="text-2xl font-semibold">Driver Tracking</h2>
      <div className="mt-4 border p-4 rounded-md">
        {loading ? (
          <p className="text-center py-6">Loading...</p>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-600">{error}</p>
            {error.includes('Permission denied') && (
              <p className="text-sm text-gray-600 mt-2">
                Please enable location permissions in your browser settings and try again.
              </p>
            )}
            {error.includes('Timeout expired') && (
              <p className="text-sm text-gray-600 mt-2">
                Ensure you are in an area with a clear GPS signal, or try again after a moment.
              </p>
            )}
            {error.includes('No location updates received') && (
              <p className="text-sm text-gray-600 mt-2">
                Please ensure your device’s location services are enabled and try again.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-lg font-semibold">{bus?.source} to {bus?.destination}</p>
            <p className="text-sm text-gray-600">
              Status: {isTrackingActive ? 'Tracking Enabled' : 'Tracking Disabled'}
            </p>
            {location && location.latitude != null && location.longitude != null ? (
              <p className="text-sm text-gray-600">
                Current Location: Lat {location.latitude.toFixed(4)}, Lng {location.longitude.toFixed(4)}
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                {isTrackingActive ? 'Waiting for location...' : 'Location not available'}
              </p>
            )}
            {mapLoading && !error && (
              <div className="text-center py-4 bg-blue-50 rounded-md">
                Loading map...
              </div>
            )}
            <div
              ref={mapContainerRef}
              className="w-full h-[400px] mt-4 rounded-md bg-gray-200 border-2 border-gray-300"
              style={{ minHeight: '400px' }}
            />
            <div className="mt-4">
              <button
                type="button"
                onClick={startTracking}
                className="mr-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                disabled={isTrackingActive}
              >
                Start Tracking
              </button>
              <button
                type="button"
                onClick={stopTracking}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                disabled={!isTrackingActive}
              >
                Stop Tracking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return renderContent();
};

export default DriverTrack;