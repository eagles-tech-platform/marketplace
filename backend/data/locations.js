// All 36 Nigerian states + FCT, plus an "international" bucket for
// diaspora/foreign users. Shared source of truth for signup/profile dropdowns.

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "Federal Capital Territory (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

// A practical shortlist of countries for international users — extend as needed.
const internationalCountries = [
  "United States", "United Kingdom", "Canada", "Germany", "France",
  "South Africa", "Ghana", "Kenya", "United Arab Emirates", "China",
  "India", "Ireland", "Netherlands", "Other",
];

module.exports = { nigerianStates, internationalCountries };
