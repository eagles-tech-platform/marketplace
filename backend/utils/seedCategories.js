require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");
const { jobCategories } = require("../data/jobCategories");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("[seed] Connected to MongoDB");

  for (const cat of jobCategories) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { name: cat.name, slug: cat.slug, icon: cat.icon, description: cat.description, niches: cat.niches },
      { upsert: true, new: true }
    );
  }

  console.log(`[seed] Upserted ${jobCategories.length} categories.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
