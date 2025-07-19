import React from 'react';
import { FaMapPin } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo4.png';

const Footer = () => {
  return (
    <>
      <style>
        {`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          .group-hover\\:animate-bounce {
            animation: bounce 0.4s ease-in-out;
          }
        `}
      </style>
      <footer className="w-full lg:px-28 md:px-16 sm:px-7 px-4 py-6 bg-neutral-100 dark:bg-neutral-900/90 transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          {/* Logo + Brand Message */}
          <div className="col-span-1 md:col-span-2 flex flex-col justify-start">
            <div className="flex items-center gap-x-4 mb-2">
              <img
                src={Logo}
                alt="logo"
                className="w-20 h-auto object-contain transform hover:scale-105 transition-transform duration-300"
              />
              <div>
                <h1 className="text-xl font-bold text-neutral-800 dark:text-white leading-tight">GlideWay</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-300 font-medium">
                  Glide your way to comfort & convenience.
                </p>
              </div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 text-sm font-medium max-w-md">
              Embark on seamless bus adventures with our cutting-edge booking platform! Crafted by a KIIT University student, we bring you real-time tracking, instant chat support, and exclusive group discounts for an unforgettable journey.
            </p>
          </div>


          {/* About Us */}
          <div className="space-y-6">
            <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">About Us</h1>
            <ul className="space-y-3 text-neutral-600 dark:text-neutral-400 text-base font-normal">
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Our Story</Link></li>
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Contact Us</Link></li>
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Services</h1>
            <ul className="space-y-3 text-neutral-600 dark:text-neutral-400 text-base font-normal">
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Safety First</Link></li>
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Help & Support</Link></li>
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Luxury Travel</Link></li>
              <li><Link to="#" className="hover:text-violet-600 hover:underline transition-colors duration-300">Top Amenities</Link></li>
            </ul>
          </div>

          {/* Get In Touch */}
          <div className="space-y-6">
            <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Get In Touch</h1>
            <div className="space-y-4">
              {[
                { location: 'KIIT, Patia, Bhubaneswar, Odisha, India' },
                { location: 'Contai, West Bengal, India' },
                { location: 'Newtown, Kolkata, West Bengal, India' },
              ].map((item, index) => (
                <div key={index} className="flex gap-x-3 group">
                  <FaMapPin className="text-2xl text-violet-600 dark:text-violet-400 group-hover:animate-bounce" />
                  <div className="flex flex-col">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Support & Reservations</p>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-6 pt-4 border-t border-neutral-300 dark:border-neutral-700 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            © {new Date().getFullYear()} Bus Ticket Booking System. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
