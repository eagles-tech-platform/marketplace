const { nigerianStates } = require("../data/locations");

/** Nigerian state on file → NGN pricing. Anything else (including no state
 * set yet) → USD, since the international list is open-ended by design. */
function currencyForState(state) {
  if (state && nigerianStates.includes(state)) return "NGN";
  return "USD";
}

module.exports = { currencyForState };
