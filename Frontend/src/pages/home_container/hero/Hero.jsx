import React from 'react';
import Bus2 from "../../../assets/bus11.png";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  const handleReserveSeat = () => {
    navigate('/bus');
  };

  const imageVariants = {
    initial: { x: "100%" },
    animate: {
      x: "0%",
      transition: { duration: 1.5, ease: 'easeInOut' }
    }
  };

  return (
    <div className='w-full h-[calc(100vh-8ch)] lg:ps-28 md:ps-16 sm:ps-7 ps-4 mt-[8ch] flex items-center justify-start flex-col hero relative overflow-hidden'>
      <div className="flex-1 w-full flex items-center justify-start gap-12 pb-10">
        <motion.div
          className="w-full max-w-2xl h-auto rounded-md flex justify-start flex-col space-y-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-neutral-50 leading-tight">
              Book Your
            </h1>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-neutral-50">
              <span className="text-violet-400">Epic</span> Bus Adventure
            </h1>
          </motion.div>
          <motion.p
            className="text-neutral-200 text-sm sm:text-base md:text-lg max-w-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          >
            Embark on your journey with ease—grab your bus tickets in seconds and explore endless routes!
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={handleReserveSeat}
              className="px-8 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-all duration-300 shadow-md"
            >
              Start Your Journey
            </button>
          </motion.div>
        </motion.div>
        <div className="w-full sm:w-[60%] h-full rounded-md flex items-end justify-end absolute top-0 right-0">
          <motion.img 
            className="w-full aspect-[5/2] object-contain"
            src={Bus2}
            alt='bus img'
            initial="initial"
            animate="animate"
            variants={imageVariants}
          />
        </div>
      </div>
    </div>
  );
};

export default Hero;