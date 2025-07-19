import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Save from '../../../assets/save.png';
import { FaCopy } from 'react-icons/fa';

const Offer = () => {
  const [copiedFirst, setCopiedFirst] = useState(false);
  const [copiedSecond, setCopiedSecond] = useState(false);

  const handleCopyFirst = () => {
    navigator.clipboard.writeText("GTECH08")
      .then(() => {
        setCopiedFirst(true);
        setTimeout(() => setCopiedFirst(false), 2000);
      })
      .catch((err) => {
        console.log("Failed to copy: ", err);
      });
  };

  const handleCopySecond = () => {
    navigator.clipboard.writeText("TRAVEL25")
      .then(() => {
        setCopiedSecond(true);
        setTimeout(() => setCopiedSecond(false), 2000);
      })
      .catch((err) => {
        console.log("Failed to copy: ", err);
      });
  };

  return (
    <div className='w-full lg:px-28 md:px-16 sm:px-7 px-4 my-12'>
      <div className="w-full flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-neutral-800 dark:text-neutral-100">
          Exclusive Offers
        </h1>
        <Link to="/offer" className='text-violet-600 font-medium hover:text-violet-700 transition'>
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 responsive-grid">
        <div className="w-full h-auto rounded-xl bg-white dark:bg-neutral-900/80 p-6 flex items-center gap-x-4 card-shadow">
          <img src={Save} alt="save img" className="w-32 aspect-[2/1] object-contain" />
          <div className="flex flex-1 flex-col space-y-4">
            <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-50">
              Get 40% Off Your First Booking
            </h1>
            <div className="flex items-center gap-x-3">
              <div className="border border-dashed border-neutral-300 dark:border-neutral-700 bg-violet-500/10 dark:bg-violet-800/10 rounded-md px-4 py-2">
                {copiedFirst ? (
                  <span className="text-green-500 font-medium">Copied!</span>
                ) : (
                  <span className="text-violet-600 font-medium">DIPTA08</span>
                )}
              </div>
              <button onClick={handleCopyFirst} className="text-lg text-violet-600 hover:text-violet-700 transition">
                <FaCopy />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Valid till: <span className="font-medium">26th August 2025</span>
            </p>
          </div>
        </div>
        <div className="w-full h-auto rounded-xl bg-white dark:bg-neutral-900/80 p-6 flex items-center gap-x-4 card-shadow">
          <img src={Save} alt="save img" className="w-32 aspect-[2/1] object-contain" />
          <div className="flex flex-1 flex-col space-y-4">
            <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-50">
              Save 25% on Weekend Travel
            </h1>
            <div className="flex items-center gap-x-3">
              <div className="border border-dashed border-neutral-300 dark:border-neutral-700 bg-violet-500/10 dark:bg-violet-800/10 rounded-md px-4 py-2">
                {copiedSecond ? (
                  <span className="text-green-500 font-medium">Copied!</span>
                ) : (
                  <span className="text-violet-600 font-medium">TRAVEL25</span>
                )}
              </div>
              <button onClick={handleCopySecond} className="text-lg text-violet-600 hover:text-violet-700 transition">
                <FaCopy />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Valid till: <span className="font-medium">30th September 2025</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Offer;