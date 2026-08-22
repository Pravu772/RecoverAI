import { swiggyProfile } from './swiggy.js';
import { zomatoProfile } from './zomato.js';
import { flipkartProfile } from './flipkart.js';
import { netflixProfile } from './netflix.js';
import { freshworksProfile } from './freshworks.js';

export const ALL_COMPANY_PROFILES = {
  MER_SWIGGY: swiggyProfile,
  MER_ZOMATO: zomatoProfile,
  MER_FLIPKART: flipkartProfile,
  MER_NETFLIX: netflixProfile,
  MER_FRESHWORKS: freshworksProfile,
};

export const getCompanyProfile = (tenantId = 'MER_SWIGGY') => {
  return ALL_COMPANY_PROFILES[tenantId] || swiggyProfile;
};

export {
  swiggyProfile,
  zomatoProfile,
  flipkartProfile,
  netflixProfile,
  freshworksProfile,
};
