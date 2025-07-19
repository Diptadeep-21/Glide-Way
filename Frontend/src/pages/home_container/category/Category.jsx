import React from 'react';
import { Link } from 'react-router-dom';
import Bus1 from '../../../assets/volvobus1.png';
import Bus2 from '../../../assets/nonacbus.png';
import Bus3 from '../../../assets/sleeperbus.png';
import Bus4 from '../../../assets/acbus.png';
import Bus5 from '../../../assets/primobus.png';
import Bus6 from '../../../assets/govtbus.png';

const Category = () => {
  const categories = [
    { type: 'AC', image: Bus4, alt: 'AC bus img', label: 'AC Bus' },
    { type: 'Volvo', image: Bus1, alt: 'Volvo bus img', label: 'Volvo Bus' },
    { type: 'Non-AC Seater', image: Bus2, alt: 'Non-AC bus img', label: 'Non-AC Bus' },
    { type: 'Sleeper', image: Bus3, alt: 'Sleeper bus img', label: 'Sleeper Bus' },
    { type: 'Primo', image: Bus5, alt: 'Primo bus img', label: 'Primo Bus' },
    { type: 'Govt', image: Bus6, alt: 'Govt bus img', label: 'Govt Bus' },
  ];

  return (
    <div className='w-full lg:px-28 md:px-16 sm:px-7 px-4 my-12'>
      <div className="w-full flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-neutral-800 dark:text-neutral-100">
          Explore Bus Categories
        </h1>
        <Link to="/bus" state={{ busType: null }} className='text-violet-600 font-medium hover:text-violet-700 transition'>
          View All
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 responsive-grid">
        {categories.map((category) => (
          <Link
            key={category.type}
            to="/bus"
            state={{ busType: category.type }}
            className='bg-white dark:bg-neutral-900/80 block rounded-xl p-5 relative group overflow-hidden card-shadow'
          >
            <img src={category.image} alt={category.alt} className="w-full aspect-video object-contain" />
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950/60 to-neutral-400/40 group-hover:flex hidden items-center justify-center transition-all duration-300">
              <h2 className="text-xl font-bold text-neutral-50">
                {category.label}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Category;