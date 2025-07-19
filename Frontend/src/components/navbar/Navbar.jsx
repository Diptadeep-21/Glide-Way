import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Logo from "../../assets/logo4.png";
import { LiaTimesSolid } from 'react-icons/lia';
import { FaBars, FaPhone, FaUser, FaChevronDown, FaUserTie, FaUserShield } from 'react-icons/fa6';
import Theme from '../theme/Theme';

const Navbar = ({ user }) => {
  const [open, setOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/bus", label: "Bus" },
    { href: "/services", label: "Services" },
  ];

  const handleClick = () => setOpen(!open);
  const handleClose = () => setOpen(false);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-user')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="w-full bg-neutral-200 dark:bg-neutral-800/80 fixed top-0 z-50 shadow-md px-4 sm:px-7 md:px-16 lg:px-28">
      <div className="flex items-center justify-between w-full h-[80px]">

        {/* LEFT: Logo + Nav Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex-shrink-0">
            <img src={Logo} alt="logo" className="w-28 h-auto object-contain" />
          </Link>
          <ul className="hidden lg:flex list-none items-center gap-x-6 text-base text-neutral-600 dark:text-neutral-500 font-medium">
            {navLinks.map((link, index) => (
              <li key={index}>
                <Link
                  to={link.href}
                  className="hover:text-violet-600 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* CENTER: Need Help? and Theme */}
        <div className="hidden lg:flex items-center justify-center gap-6">
          <div className="relative bg-violet-600 rounded-md px-8 py-2 cursor-pointer">
            <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 w-9 h-9 rounded-full bg-violet-600 border-4 border-neutral-100 dark:border-neutral-900 flex items-center justify-center">
              <FaPhone className="text-white text-sm" />
            </div>
            <div className="space-y-0.5 pl-5">
              <p className="text-xs text-neutral-200 font-light">Need Help?</p>
              <p className="text-xs font-normal text-neutral-50 tracking-wide">+91 1234567890</p>
            </div>
          </div>
          <Theme />
        </div>

        {/* RIGHT: User */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <div className="relative dropdown-user">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-violet-600 min-w-[120px] justify-center"
              >
                {user.role === 'admin' && <FaUserShield className="text-lg text-violet-600" />}
                {user.role === 'driver' && <FaUserTie className="text-lg text-violet-600" />}
                {user.role === 'passenger' && <FaUser className="text-lg text-violet-600" />}
                <span>{user.name || user.email || "User"}</span>
                <FaChevronDown className="text-xs mt-[2px]" />
              </button>
              {dropdownOpen && (
                <div className="absolute  min-w-full  mt-2 w-40 bg-white dark:bg-neutral-800 shadow-md rounded-md py-2 z-50">

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(
                        user.role === 'admin'
                          ? '/dashboard-admin'
                          : user.role === 'driver'
                          ? '/dashboard-driver'
                          : '/dashboard-passenger'
                      );
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    Dashboard
                  </button>
                  {/* Admin-specific links */}
                  {user.role === 'admin' && (
                    <>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard-admin/manage-bus');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Manage Buses
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard-admin/manage-driver');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Manage Drivers
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard-admin/manage-route');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Manage Routes
                      </button>
                    </>
                  )}
                  {/* Driver-specific links */}
                  {user.role === 'driver' && (
                    <>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard-driver/assigned-trips');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Assigned Trips
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard-driver/track-booking');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Track Bookings
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/dashboard-driver/manage-schedule');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        Manage Schedule
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      setDropdownOpen(false);
                      navigate('/');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="text-sm font-medium hover:text-violet-600">Login</Link>
              <Link to="/signup" className="text-sm font-medium hover:text-violet-600">Signup</Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden">
          <button onClick={handleClick} className="text-neutral-600 dark:text-neutral-300">
            {open ? <LiaTimesSolid className="text-xl" /> : <FaBars className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="flex flex-col gap-4 pt-4 pb-6 border-t mt-2 lg:hidden">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              to={link.href}
              onClick={handleClose}
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-violet-600"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-4">
            <Theme />
            {user ? (
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{user.name || user.email}</span>
            ) : (
              <>
                <Link to="/login" onClick={handleClose} className="text-sm font-medium hover:text-violet-600">Login</Link>
                <Link to="/signup" onClick={handleClose} className="text-sm font-medium hover:text-violet-600">Signup</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;