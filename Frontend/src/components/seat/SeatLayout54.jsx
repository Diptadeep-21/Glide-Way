import React, { useState, useEffect } from 'react';
import { GiSteeringWheel } from 'react-icons/gi';
import { MdOutlineChair } from 'react-icons/md';

const Seat = ({ seatNumber, isSelected, onClick, fare, isBooked }) => {
  const seatClass = `text-2xl -rotate-90 transition ${
    isBooked
      ? "text-neutral-400 cursor-not-allowed"
      : `cursor-pointer ${isSelected ? "text-violet-600" : "text-neutral-600"}`
  }`;

  return (
    <div
      className="relative group flex flex-col items-center space-y-0.5"
      onClick={!isBooked ? onClick : undefined}
      role="button"
      tabIndex={!isBooked ? 0 : -1}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isBooked) {
          onClick();
        }
      }}
    >
      <MdOutlineChair
        className={seatClass}
        aria-label={`Seat ${seatNumber} ${isSelected ? 'selected' : isBooked ? 'booked' : 'available'}`}
      />
      {/* Tooltip */}
      {!isBooked && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition">
          Seat {seatNumber} - ₹{fare}
        </div>
      )}
    </div>
  );
};

const SeatLayout54 = ({
  totalSeats = 54,
  farePerSeat = 750,
  selectedSeats,
  setSelectedSeats,
  setTotalFare,
  bookedSeats = [],
  setBookingError
}) => {
  useEffect(() => {
    setTotalFare(selectedSeats.length * farePerSeat);
  }, [selectedSeats, farePerSeat, setTotalFare]);

  const getSeatLayout = () => {
    const layout = [];
    let seat = 1;

    if (totalSeats === 54) {
      for (let row = 0; row < 6; row++) {
        const currentRow = [];

        if (row < 3) {
          for (let col = 0; col < 11; col++) {
            currentRow.push(seat++);
          }
        } else if (row === 3) {
          currentRow.push(...Array(10).fill(null));
          currentRow.push(seat++);
        } else {
          for (let col = 0; col < 11; col++) {
            currentRow.push(col === 3 ? null : seat++);
          }
        }

        layout.push(currentRow);
      }
    }

    return layout;
  };

  const seatLayout = getSeatLayout();

  const toggleSeat = (seatNumber) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(prev => prev.filter(seat => seat !== seatNumber));
      setBookingError(''); // Clear error if previously set
    } else {
      if (selectedSeats.length >= 10) {
        setBookingError('Maximum 10 seats per booking');
        return;
      }
      setSelectedSeats(prev => [...prev, seatNumber]);
      setBookingError(''); // Clear error if newly added seat is valid
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-neutral-800 dark:text-white">Choose a Seat</h2>

      <div className="flex flex-col md:flex-row gap-6 items-start shadow-md border rounded-xl p-4">
        {/* Driver Section */}
        <div className="hidden md:flex flex-col items-center mr-2">
          <GiSteeringWheel className="text-2xl text-violet-600 rotate-90 mb-1" />
          <div className="border-r-2 border-dashed h-full border-neutral-300 dark:border-neutral-700"></div>
        </div>

        {/* Seat Grid */}
        <div className="flex flex-col gap-2">
          {seatLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-2 justify-center">
              {row.map((seatNum, index) => {
                if (seatNum === null) {
                  return <div key={index} className="w-6 h-6" />;
                }

                const isBooked = bookedSeats.includes(seatNum);
                return (
                  <Seat
                    key={seatNum}
                    seatNumber={seatNum}
                    isSelected={selectedSeats.includes(seatNum)}
                    isBooked={isBooked}
                    fare={farePerSeat}
                    onClick={() => toggleSeat(seatNum)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend Section */}
        <div className="pl-4 border-l border-neutral-300 dark:border-neutral-700 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MdOutlineChair className="-rotate-90 text-neutral-600 text-xl" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <MdOutlineChair className="-rotate-90 text-violet-600 text-xl" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <MdOutlineChair className="-rotate-90 text-neutral-400 text-xl" />
            <span>Booked</span>
          </div>
          <div className="pt-4">
            <p className="text-sm font-medium">Rs. {farePerSeat}</p>
            <p className="text-xs text-neutral-400">per seat</p>
          </div>
        </div>
      </div>

      {/* Selected Seats Summary */}
      {selectedSeats.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-md font-semibold">Selected Seats</h3>
          <div className="flex flex-wrap gap-2">
            {[...selectedSeats].sort((a, b) => a - b).map(seat => (
              <div
                key={seat}
                className="w-8 h-8 bg-violet-600/30 rounded text-xs flex items-center justify-center"
              >
                {seat}
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-md font-semibold">Total Fare</h3>
            <p className="font-medium">Rs. {selectedSeats.length * farePerSeat}</p>
            <p className="text-xs text-neutral-400">Including all taxes</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatLayout54;
