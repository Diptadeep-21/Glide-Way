import React from 'react';
import Hero from './hero/Hero';
import Search from '../search/Search';
import Category from './category/Category';
import Offer from './offer/Offer';


const HomeContainer = () => {
  return (
    <>
   
      <Hero />
      <Search />
      <Category />
      <Offer />
    
    </>
  );
};

export default HomeContainer;
