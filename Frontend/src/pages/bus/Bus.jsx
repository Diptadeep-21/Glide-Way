import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Navbar from '../../components/navbar/Navbar';
import Footer from '../../components/footer/Footer';
import { FaSearch } from 'react-icons/fa';
import axios from 'axios';

// Helper function to get window seats based on totalSeats
const getWindowSeats = (totalSeats) => {
  if (totalSeats === 54) {
    return [
      ...Array.from({ length: 11 }, (_, i) => i + 1), // Seats 1–11
      ...Array.from({ length: 10 }, (_, i) => i + 45), // Seats 45–54
    ];
  } else if (totalSeats === 45) {
    return [
      ...Array.from({ length: 11 }, (_, i) => i + 1), // Seats 1–9
      ...Array.from({ length: 11 }, (_, i) => i + 37), // Seats 37–45
    ];
  }
  return [];
};

const Bus = () => {
  const { state } = useLocation();
  const [buses, setBuses] = useState([]);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [busTypeFilter, setBusTypeFilter] = useState(state?.busType || 'all'); // Initialize with busType from state
  const [sortOption, setSortOption] = useState('fare-asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const busTypeStyles = {
    'AC': 'bg-blue-100 text-blue-700',
    'Non-AC Seater': 'bg-yellow-100 text-yellow-700',
    'Sleeper': 'bg-green-100 text-green-700',
    'Volvo': 'bg-purple-100 text-purple-700',
    'Primo': 'bg-pink-100 text-pink-700',
    'Govt': 'bg-gray-100 text-gray-700',
    'default': 'bg-gray-100 text-gray-700',
  };

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        if (state?.buses && state.buses.length > 0) {
          setBuses(state.buses);
          setFilteredBuses(state.buses);
        } else {
          const response = await axios.get('http://glide-way-backend.onrender.com/api/bus/all');
          setBuses(response.data.buses);
          setFilteredBuses(response.data.buses);
        }
      } catch (error) {
        console.error('Error fetching buses:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBuses();
  }, [state]);

useEffect(() => {
  let filtered = [...buses];

  // Filter by destination time (less than current time)
  const now = new Date(); // Current time in client's local timezone (e.g., IST)
  filtered = filtered.filter((bus) => {
    if (!bus.destinationTime) {
      console.warn(`Bus ${bus._id} has no destinationTime, skipping.`);
      return false;
    }
    try {
      const destinationTime = new Date(bus.destinationTime); // Parse ISO string
      if (isNaN(destinationTime.getTime())) {
        console.warn(`Bus ${bus._id} has invalid destinationTime: ${bus.destinationTime}`);
        return false;
      }
      return destinationTime > now; // Compare directly (both in local timezone)
    } catch (error) {
      console.error(`Error parsing destinationTime for bus ${bus._id}:`, error);
      return false;
    }
  });

  // Filter by bus type
  if (busTypeFilter !== 'all') {
    filtered = filtered.filter((bus) => bus.busType === busTypeFilter);
  }

  // Filter by search term
  filtered = filtered.filter((bus) =>
    bus.busName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort buses
  const sorted = filtered.sort((a, b) => {
    if (sortOption === 'fare-asc') return a.fare - b.fare;
    if (sortOption === 'fare-desc') return b.fare - a.fare;
    if (sortOption === 'departure-asc')
      return new Date(a.departureTime) - new Date(b.departureTime);
    if (sortOption === 'departure-desc')
      return new Date(b.departureTime) - new Date(a.departureTime);
    if (sortOption === 'seats-asc')
      return (
        (a.totalSeats - (a.bookedSeats?.length || 0)) -
        (b.totalSeats - (b.bookedSeats?.length || 0))
      );
    if (sortOption === 'seats-desc')
      return (
        (b.totalSeats - (b.bookedSeats?.length || 0)) -
        (a.totalSeats - (a.bookedSeats?.length || 0))
      );
    return 0;
  });

  setFilteredBuses(sorted);
}, [searchTerm, buses, busTypeFilter, sortOption]);

  if (loading) return <div className="text-center py-10">Loading buses...</div>;
  if (error) return <div className="text-center py-10 text-red-600">Failed to load buses</div>;

  return (
    <>
      <div className="w-full lg:px-28 md:px-16 sm:px-7 px-4 mt-[13ch] my-[8ch] space-y-14">
        <div className="w-full grid grid-cols-6 gap-14 bg-neutral-200/60 dark:bg-neutral-900/40 rounded-md px-6 py-5 items-center justify-between">
          <div className="flex items-center gap-x-2 col-span-2">
            <input
              type="text"
              placeholder="Search buses"
              className="w-full appearance-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 inline-block bg-neutral-200/60 dark:bg-neutral-900/60 px-3 h-12 border border-neutral-200 dark:border-neutral-900 rounded-md focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="bg-violet-600 h-11 px-4 rounded-md text-base text-neutral-50 font-normal">
              <FaSearch />
            </button>
          </div>
          <div className="col-span-4 flex justify-end gap-4">
            <select
              value={busTypeFilter}
              onChange={(e) => setBusTypeFilter(e.target.value)}
              className="p-2 rounded-md border border-neutral-200 dark:border-neutral-900 bg-neutral-200/60 dark:bg-neutral-900/60 text-neutral-800 dark:text-neutral-100 focus:outline-none"
            >
              <option value="all">All Bus Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC Seater">Non-AC</option>
              <option value="Sleeper">Sleeper</option>
              <option value="Volvo">Volvo</option>
              <option value="Primo">Primo</option>
              <option value="Govt">Govt</option>
            </select>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="p-2 rounded-md border border-neutral-200 dark:border-neutral-900 bg-neutral-200/60 dark:bg-neutral-900/60 text-neutral-800 dark:text-neutral-100 focus:outline-none"
            >
              <option value="fare-asc">Sort by Fare (Low to High)</option>
              <option value="fare-desc">Sort by Fare (High to Low)</option>
              <option value="departure-asc">Sort by Departure Time (Earliest)</option>
              <option value="departure-desc">Sort by Departure Time (Latest)</option>
              <option value="seats-asc">Sort by Available Seats (Low to High)</option>
              <option value="seats-desc">Sort by Available Seats (High to Low)</option>
            </select>
          </div>
        </div>

        {filteredBuses.length === 0 ? (
          <div className="text-center py-10 text-neutral-600 dark:text-neutral-400">
            No buses found for the selected criteria.
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {filteredBuses.map((bus) => {
              const windowSeats = getWindowSeats(bus.totalSeats);
              const availableWindowSeats = windowSeats.filter(
                (seat) => !(bus.bookedSeats || []).includes(seat)
              ).length;

              return (
                <Link
                  key={bus._id}
                  to={{
                    pathname: `/bus/bus-details/${bus._id}`,
                    state: { selections: { selectedSeats: [], travelDate: bus.date } },
                  }}
                  className="w-full bg-transparent rounded-xl p-4 shadow-md hover:shadow-lg transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-50">
                        {bus.busName} - {bus.busNumber}
                      </h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {bus.source} → {bus.destination}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {bus.departureTime
                          ? new Date(bus.departureTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}{' '}
                        -{' '}
                        {bus.destinationTime
                          ? new Date(bus.destinationTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </p>
                      <p
                        className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${
                          busTypeStyles[bus.busType] || busTypeStyles.default
                        }`}
                      >
                        {bus.busType || 'AC'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-violet-700 dark:text-violet-400">
                        ₹{bus.fare}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {bus.availableSeats ??
                          bus.totalSeats - (bus.bookedSeats?.length || 0)}{' '}
                        Seats
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {availableWindowSeats} Window Seats
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Bus;
