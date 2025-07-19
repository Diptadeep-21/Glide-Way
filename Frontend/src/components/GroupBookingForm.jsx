// GroupBookingForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const GroupBookingForm = ({ busId, availableSeats }) => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [groupMembers, setGroupMembers] = useState([{ email: '' }]);
  const [contactDetails, setContactDetails] = useState({ email: '', phone: '', state: '' });
  const [passengers, setPassengers] = useState([{ name: '', gender: '', age: '' }]);
  const [travelDate, setTravelDate] = useState('');
  const [boardingPoint, setBoardingPoint] = useState('');
  const [allowSocialTravel, setAllowSocialTravel] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleSeatSelect = (seat) => {
    setSelectedSeats(prev =>
      prev.includes(seat) ? prev.filter(s => s !== seat) : [...prev, seat]
    );
  };

  const addGroupMember = () => {
    setGroupMembers([...groupMembers, { email: '' }]);
  };

  const updateGroupMember = (index, field, value) => {
    const updated = [...groupMembers];
    updated[index][field] = value;
    setGroupMembers(updated);
  };

  const addPassenger = () => {
    setPassengers([...passengers, { name: '', gender: '', age: '' }]);
  };

  const updatePassenger = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSeats.length < 2) {
      setError('Group bookings require at least 2 seats.');
      return;
    }
    if (groupMembers.length !== selectedSeats.length - 1) {
      setError('Number of group members must match seats minus the lead booker.');
      return;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/bookings`,
        {
          busId,
          selectedSeats,
          travelDate,
          contactDetails,
          passengers,
          boardingPoint,
          isGroupBooking: true,
          groupMembers,
          allowSocialTravel,
          totalFare: 0, // Backend will calculate
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Group booking created successfully!');
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group booking.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <label>Seats</label>
        <div className="grid grid-cols-5 gap-2">
          {availableSeats.map(seat => (
            <button
              key={seat}
              type="button"
              onClick={() => handleSeatSelect(seat)}
              className={`p-2 border ${
                selectedSeats.includes(seat) ? 'bg-violet-600 text-white' : 'bg-white'
              }`}
            >
              {seat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label>Contact Details</label>
        <input
          type="email"
          value={contactDetails.email}
          onChange={e => setContactDetails({ ...contactDetails, email: e.target.value })}
          placeholder="Email"
          required
          className="border p-2 w-full"
        />
        <input
          type="text"
          value={contactDetails.phone}
          onChange={e => setContactDetails({ ...contactDetails, phone: e.target.value })}
          placeholder="Phone"
          required
          className="border p-2 w-full mt-2"
        />
        <input
          type="text"
          value={contactDetails.state}
          onChange={e => setContactDetails({ ...contactDetails, state: e.target.value })}
          placeholder="State"
          required
          className="border p-2 w-full mt-2"
        />
      </div>
      <div>
        <label>Group Members</label>
        {groupMembers.map((member, index) => (
          <input
            key={index}
            type="email"
            value={member.email}
            onChange={e => updateGroupMember(index, 'email', e.target.value)}
            placeholder={`Member ${index + 1} Email`}
            className="border p-2 w-full mt-2"
          />
        ))}
        <button
          type="button"
          onClick={addGroupMember}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Member
        </button>
      </div>
      <div>
        <label>Passengers</label>
        {passengers.map((passenger, index) => (
          <div key={index} className="space-y-2">
            <input
              type="text"
              value={passenger.name}
              onChange={e => updatePassenger(index, 'name', e.target.value)}
              placeholder={`Passenger ${index + 1} Name`}
              required
              className="border p-2 w-full"
            />
            <select
              value={passenger.gender}
              onChange={e => updatePassenger(index, 'gender', e.target.value)}
              required
              className="border p-2 w-full"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              value={passenger.age}
              onChange={e => updatePassenger(index, 'age', e.target.value)}
              placeholder="Age"
              required
              className="border p-2 w-full"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addPassenger}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add Passenger
        </button>
      </div>
      <div>
        <label>Travel Date</label>
        <input
          type="date"
          value={travelDate}
          onChange={e => setTravelDate(e.target.value)}
          required
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label>Boarding Point</label>
        <input
          type="text"
          value={boardingPoint}
          onChange={e => setBoardingPoint(e.target.value)}
          placeholder="Boarding Point"
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={allowSocialTravel}
            onChange={e => setAllowSocialTravel(e.target.checked)}
            className="mr-2"
          />
          Allow Social Travel (connect with other passengers)
        </label>
      </div>
      <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded">
        Create Group Booking
      </button>
    </form>
  );
};

export default GroupBookingForm;