// Small dependency-free validators. Anything that isn't a string becomes "",
// which also blocks NoSQL-injection payloads like { "$ne": "" } in req.body / req.query.
const clean = (v) => (typeof v === "string" ? v.trim() : "");
const oneLine = (v) => clean(v).replace(/[\r\n]+/g, " ");
const isEmail = (v) => v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const isObjectId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { clean, oneLine, isEmail, isObjectId, escapeRegex };
