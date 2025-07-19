const geolocationService = (() => {
  let watchId = null;
  let busId = null;
  let socket = null;
  let isTracking = false;

  const startTracking = (currentBusId, socketInstance) => {
    if (isTracking) {
      console.log('Geolocation tracking already active');
      return;
    }

    busId = currentBusId;
    socket = socketInstance;
    isTracking = true;

    if (navigator.geolocation) {
      console.log('Starting Geolocation tracking in service');
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const timestamp = new Date().toISOString();
          console.log('Geolocation update from service:', { latitude, longitude, timestamp });
          const newLocation = { latitude, longitude, timestamp };

          // Validate and emit location update
          if (typeof latitude === 'number' && typeof longitude === 'number') {
            socket.emit('locationUpdate', { busId, latitude, longitude, timestamp });
            console.log('Emitted location update from service:', { busId, latitude, longitude, timestamp });
          } else {
            console.warn('Invalid location data from service, not emitting:', { latitude, longitude, timestamp });
          }
        },
        (err) => {
          console.error('Geolocation error in service:', err);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 }
      );
      console.log('Geolocation watch started in service, watchId:', watchId);
    } else {
      console.error('Geolocation not supported by this browser');
    }
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      console.log('Geolocation tracking stopped in service');
    }
    busId = null;
    socket = null;
    isTracking = false;
  };

  const isTrackingActive = () => isTracking;

  return {
    startTracking,
    stopTracking,
    isTrackingActive,
  };
})();

export default geolocationService;