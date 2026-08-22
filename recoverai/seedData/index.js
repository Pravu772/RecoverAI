/**
 * RecoverAI Root Seed Data Directory
 * Contains profile generators for Swiggy, Zomato, Flipkart, Netflix, Freshworks.
 */
const { swiggyProfile } = require('../frontend/src/seedData/swiggy.js');
const { zomatoProfile } = require('../frontend/src/seedData/zomato.js');
const { flipkartProfile } = require('../frontend/src/seedData/flipkart.js');
const { netflixProfile } = require('../frontend/src/seedData/netflix.js');
const { freshworksProfile } = require('../frontend/src/seedData/freshworks.js');

module.exports = {
  swiggyProfile,
  zomatoProfile,
  flipkartProfile,
  netflixProfile,
  freshworksProfile,
};
