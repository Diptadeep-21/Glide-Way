import React from 'react';
import Navbar from '../../components/navbar/Navbar';
import { FaBus, FaUser, FaUserTie, FaUserShield, FaComments, FaMapMarkerAlt } from 'react-icons/fa';

const About = ({ user }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-violet-100 to-gray-100 dark:from-neutral-900 dark:to-neutral-800 transition-colors duration-300">
      {/* Navbar */}
      <Navbar user={user} />

      {/* Main Content */}
      <main className="flex-grow pt-[9ch] py-16 px-4 sm:px-6 lg:px-28">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <section className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-blue-500 dark:from-violet-400 dark:to-blue-300 mb-6">
              About the GlideWay
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Discover a seamless travel experience with our innovative platform, designed to make bus travel effortless and engaging.
            </p>
          </section>

          {/* Overview Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <FaBus className="text-3xl text-violet-600 dark:text-violet-400" />
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200">Overview</h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Welcome to the Bus Ticket Booking System, a cutting-edge web application crafted to revolutionize bus travel management. Developed by a passionate Computer Science student at KIIT University, this solo project showcases expertise in full-stack development and a commitment to user-centric solutions.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mt-4">
              Supporting <span className="font-medium text-violet-600 dark:text-violet-400">Passenger</span>, <span className="font-medium text-violet-600 dark:text-violet-400">Driver</span>, and <span className="font-medium text-violet-600 dark:text-violet-400">Admin</span> roles, the platform offers tailored functionalities. Standout features like real-time driver-passenger chat and live bus tracking ensure an interactive and efficient experience.
            </p>
          </section>

          {/* Key Features Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <FaComments className="text-3xl text-violet-600 dark:text-violet-400" />
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200">Key Features</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-gray-50 dark:from-neutral-700 dark:to-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <FaUser className="text-xl text-violet-600 dark:text-violet-400" />
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Passenger Role</h3>
                </div>
                <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-400">
                  <li>Browse buses, routes, and schedules with real-time seat availability.</li>
                  <li>Book seats and manage bookings, including cancellations and ticket history.</li>
                  <li>Rate buses to provide feedback on travel experiences.</li>
                  <li>Engage with drivers via a real-time chat system for trip updates.</li>
                  <li>Provide amenity and journey ratings to enhance service quality feedback.</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-gray-50 dark:from-neutral-700 dark:to-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <FaUserTie className="text-xl text-violet-600 dark:text-violet-400" />
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Driver Role</h3>
                </div>
                <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-400">
                  <li>View and manage assigned trips and schedules.</li>
                  <li>Track passenger bookings for assigned trips.</li>
                  <li>Access a performance dashboard to monitor metrics and feedback.</li>
                  <li>Communicate with passengers through real-time chat.</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-gray-50 dark:from-neutral-700 dark:to-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <FaUserShield className="text-xl text-violet-600 dark:text-violet-400" />
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Admin Role</h3>
                </div>
                <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-400">
                  <li>Manage buses, routes, and driver assignments.</li>
                  <li>Oversee user accounts and resolve system issues.</li>
                  <li>Access an analytics dashboard for insights on bookings and performance.</li>
                  <li>Monitor live bus tracking to ensure operational efficiency.</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-gray-50 dark:from-neutral-700 dark:to-neutral-800">
                <div className="flex items-center gap-2 mb-2">
                  <FaMapMarkerAlt className="text-xl text-violet-600 dark:text-violet-400" />
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">Unique Features</h3>
                </div>
                <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-400">
                  <li>Real-time chat system for direct driver-passenger communication.</li>
                  <li>Live bus tracking for real-time location updates.</li>
                  <li>Secure, scalable architecture with responsive design for all devices.</li>
                  <li>Group booking discount for collaborative travel plans.</li>
                  <li>Social travel with real-time group chat for passengers to connect during journeys.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Developer Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <FaUser className="text-3xl text-violet-600 dark:text-violet-400" />
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200">About the Developer</h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              I’m a Computer Science student at KIIT University, Bhubaneswar, driven by a passion for software engineering. My coding journey started with a desire to solve real-world problems, and this project embodies that vision. As an aspiring software engineer, I strive to build innovative applications using my expertise in programming and system design.
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mt-4">
              The Bus Ticket Booking System is a solo endeavor, demonstrating my capabilities in full-stack development, database management, and user-focused design with modern web technologies.
            </p>
          </section>

          {/* Vision Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <FaComments className="text-3xl text-violet-600 dark:text-violet-400" />
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200">My Vision</h2>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              This project is a milestone in my journey to become a software engineer who creates impactful solutions. I aim to work on cutting-edge technologies and contribute to projects that enhance lives. The Bus Ticket Booking System, with its real-time chat and live tracking, reflects my commitment to innovation and excellence.
            </p>
          </section>

          {/* Future Enhancements Section */}
          <section className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 mb-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
            <div className="flex items-center gap-4 mb-4">
              <FaBus className="text-3xl text-violet-600 dark:text-violet-400" />
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200">Future Enhancements</h2>
            </div>
            <ul className="list-disc pl-5 text-neutral-600 dark:text-neutral-400">
              <li>Integrate a payment gateway for secure transactions.</li>
              <li>Implement AI-based route optimization for drivers.</li>
              <li>Add multi-language support for enhanced accessibility.</li>
              <li>Enhance analytics dashboard with predictive insights for admins.</li>
            </ul>
          </section>

          {/* Contact Section */}
          <section className="text-center animate-slide-up">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Get in Touch</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-xl mx-auto">
              Have feedback, ideas, or questions about the project? Reach out to collaborate or learn more!
            </p>
            <a
              href="mailto:your-email@example.com"
              className="inline-block bg-gradient-to-r from-violet-600 to-blue-500 text-white px-8 py-4 rounded-full hover:from-violet-700 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
            >
              Contact Me
            </a>
          </section>
        </div>
      </main>

      

      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};

export default About;