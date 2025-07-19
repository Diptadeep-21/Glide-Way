import React from 'react';
import Navbar from '../../components/navbar/Navbar';
import Footer from '../../components/footer/Footer';
import { FaShieldAlt, FaQuestionCircle, FaBusAlt, FaConciergeBell } from 'react-icons/fa';

const Services = ({ user }) => {
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
              Our Services
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Explore the exceptional services offered by our Bus Ticket Booking System, designed to ensure a safe, comfortable, and seamless travel experience.
            </p>
          </section>

          {/* Services Section */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Safety Guarantee */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
              <div className="flex items-center gap-4 mb-4">
                <FaShieldAlt className="text-3xl text-violet-600 dark:text-violet-400" />
                <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">Safety Guarantee</h2>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Your safety is our priority. Our system integrates <span className="font-medium text-violet-600 dark:text-violet-400">live bus tracking</span> to monitor bus locations in real-time, ensuring transparency and security. All buses undergo rigorous safety checks, and drivers are trained to maintain the highest safety standards.
              </p>
            </div>

            {/* FAQ & Support */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
              <div className="flex items-center gap-4 mb-4">
                <FaQuestionCircle className="text-3xl text-violet-600 dark:text-violet-400" />
                <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">FAQ & Support</h2>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Get instant help with our comprehensive FAQ section and dedicated support team. Passengers can use the <span className="font-medium text-violet-600 dark:text-violet-400">real-time chat system</span> to communicate directly with drivers for trip-related queries, ensuring quick resolutions and a smooth experience.
              </p>
            </div>

            {/* Luxury Buses */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
              <div className="flex items-center gap-4 mb-4">
                <FaBusAlt className="text-3xl text-violet-600 dark:text-violet-400" />
                <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">Luxury Buses</h2>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Travel in style with our fleet of luxury buses, equipped with comfortable seating, air conditioning, and entertainment systems. Passengers can browse and book these premium options through our platform, with real-time seat availability for a hassle-free experience.
              </p>
            </div>

            {/* Enough Facilities */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform duration-300 animate-slide-up">
              <div className="flex items-center gap-4 mb-4">
                <FaConciergeBell className="text-3xl text-violet-600 dark:text-violet-400" />
                <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200">Enough Facilities</h2>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Our buses offer ample facilities, including Wi-Fi, charging ports, and clean restrooms, to ensure a comfortable journey. Passengers can manage bookings, check ticket history, and provide feedback via our intuitive platform, enhancing every aspect of the travel experience.
              </p>
            </div>
          </section>

          {/* Call-to-Action Section */}
          <section className="text-center animate-slide-up">
            <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
              Ready to Travel with Us?
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-xl mx-auto">
              Book your next trip with ease and experience our top-notch services. Contact us for any inquiries or start exploring now!
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/bus"
                className="inline-block bg-gradient-to-r from-violet-600 to-blue-500 text-white px-8 py-4 rounded-full hover:from-violet-700 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
              >
                Book Now
              </a>
              <a
                href="mailto:your-email@example.com"
                className="inline-block bg-transparent border-2 border-violet-600 text-violet-600 dark:text-violet-400 px-8 py-4 rounded-full hover:bg-violet-600 hover:text-white dark:hover:bg-violet-700 dark:hover:text-white transition-all duration-300 transform hover:scale-105"
              >
                Contact Us
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
    

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

export default Services;