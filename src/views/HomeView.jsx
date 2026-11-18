import { useEffect, useState } from 'react';
import { fetchFaqs } from '../services/api';
import HeroSection from '../features/home/HeroSection';
import HomeBanners from '../features/home/HomeBanners';
import HomeCategories from '../features/home/HomeCategories';
import HomeVehicles from '../features/home/HomeVehicles';
import HomeOpenJobs from '../features/home/HomeOpenJobs';
import ValueProps from '../features/home/ValueProps';
import HowItWorks from '../features/home/HowItWorks';
import FaqAccordion from '../features/home/FaqAccordion';

export default function HomeView() {
  const [faqs, setFaqs] = useState(null);

  useEffect(() => {
    fetchFaqs().then(setFaqs);
  }, []);

  return (
    <div className="home-view">
      <HeroSection />
      <HomeBanners />
      <HomeCategories />
      <HomeVehicles />
      <HomeOpenJobs />
      <ValueProps />
      <HowItWorks />
      <FaqAccordion faqs={faqs} />
    </div>
  );
}