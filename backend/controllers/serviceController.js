const Service = require("../models/Service");

// POST /api/services  (provider)
async function createService(req, res) {
  try {
    if (!req.user.canBeProvider) {
      return res.status(403).json({ message: "Only providers can list services." });
    }
    const { title, category, niche, description, price, priceType, images } = req.body;
    if (!title || !category || !niche || price === undefined) {
      return res.status(400).json({ message: "Title, category, niche and price are required." });
    }
    const service = await Service.create({
      provider: req.user._id,
      title,
      category,
      niche,
      description: description || "",
      price,
      priceType: priceType || "fixed",
      images: Array.isArray(images) ? images : [],
    });
    return res.status(201).json({ message: "Service created.", service });
  } catch (err) {
    console.error("[services] createService error:", err);
    return res.status(500).json({ message: "Could not create service." });
  }
}

// GET /api/services/mine  (provider)
async function getMyServices(req, res) {
  try {
    const services = await Service.find({ provider: req.user._id }).sort({ createdAt: -1 });
    return res.json({ services });
  } catch (err) {
    console.error("[services] getMyServices error:", err);
    return res.status(500).json({ message: "Could not fetch your services." });
  }
}

// PATCH /api/services/:id  (provider — must own it)
async function updateService(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });
    if (String(service.provider) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own services." });
    }
    const allowed = ["title", "category", "niche", "description", "price", "priceType", "images", "isActive"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) service[key] = req.body[key];
    }
    await service.save();
    return res.json({ message: "Service updated.", service });
  } catch (err) {
    console.error("[services] updateService error:", err);
    return res.status(500).json({ message: "Could not update service." });
  }
}

// DELETE /api/services/:id  (provider — must own it)
async function deleteService(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });
    if (String(service.provider) !== String(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ message: "You can only delete your own services." });
    }
    await service.deleteOne();
    return res.json({ message: "Service deleted." });
  } catch (err) {
    console.error("[services] deleteService error:", err);
    return res.status(500).json({ message: "Could not delete service." });
  }
}

// GET /api/services  (public) — ?search=&category=&niche=
async function listServices(req, res) {
  try {
    const { search, category, niche } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (niche) filter.niche = niche;
    if (search) filter.title = { $regex: search, $options: "i" };

    const services = await Service.find(filter)
      .populate("provider", "name avatar state city isVerifiedBadge providerApprovalStatus rating")
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json({ services });
  } catch (err) {
    console.error("[services] listServices error:", err);
    return res.status(500).json({ message: "Could not fetch services." });
  }
}

// GET /api/services/:id  (public)
async function getService(req, res) {
  try {
    const service = await Service.findById(req.params.id).populate(
      "provider",
      "name avatar state city isVerifiedBadge providerApprovalStatus"
    );
    if (!service) return res.status(404).json({ message: "Service not found." });
    return res.json({ service });
  } catch (err) {
    console.error("[services] getService error:", err);
    return res.status(500).json({ message: "Could not fetch service." });
  }
}

module.exports = {
  createService,
  getMyServices,
  updateService,
  deleteService,
  listServices,
  getService,
};
