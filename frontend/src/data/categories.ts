export interface JobNiche {
  name: string;
  slug: string;
}

export interface JobCategory {
  name: string;
  slug: string;
  icon: string;
  description: string;
  niches: JobNiche[];
}

export const jobCategories: JobCategory[] = [
  {
    name: "Construction & Building",
    slug: "construction-building",
    icon: "HardHat",
    description: "Building and construction professionals",
    niches: [
      { name: "Carpenter", slug: "carpenter" },
      { name: "Bricklayer", slug: "bricklayer" },
      { name: "Mason", slug: "mason" },
      { name: "Tiler", slug: "tiler" },
      { name: "POP ceiling installer", slug: "pop-ceiling-installer" },
      { name: "Roofer", slug: "roofer" },
      { name: "Scaffolding installer", slug: "scaffolding-installer" },
      { name: "Painter", slug: "painter" },
      { name: "Wallpaper installer", slug: "wallpaper-installer" },
      { name: "Screeding specialist", slug: "screeding-specialist" },
      { name: "Interlocking paving installer", slug: "interlocking-paving-installer" },
      { name: "Concrete finisher", slug: "concrete-finisher" },
      { name: "Steel fixer", slug: "steel-fixer" },
      { name: "Aluminum fabricator", slug: "aluminum-fabricator" },
      { name: "Welder", slug: "welder" },
      { name: "Iron bender", slug: "iron-bender" },
      { name: "Gate fabricator", slug: "gate-fabricator" },
      { name: "Window fabricator", slug: "window-fabricator" },
      { name: "Borehole driller", slug: "borehole-driller" },
      { name: "Borehole maintenance technician", slug: "borehole-maintenance-technician" },
      { name: "Water tank installer", slug: "water-tank-installer" },
      { name: "Fence installer", slug: "fence-installer" },
      { name: "Swimming pool builder", slug: "swimming-pool-builder" },
      { name: "Estate maintenance technician", slug: "estate-maintenance-technician" },
      { name: "Site supervisor", slug: "site-supervisor" },
    ]
  },
  {
    name: "Electrical Services",
    slug: "electrical-services",
    icon: "Zap",
    description: "Electrical installation and repair experts",
    niches: [
      { name: "Residential electrician", slug: "residential-electrician" },
      { name: "Industrial electrician", slug: "industrial-electrician" },
      { name: "Solar panel installer", slug: "solar-panel-installer" },
      { name: "Solar inverter technician", slug: "solar-inverter-technician" },
      { name: "CCTV installer", slug: "cctv-installer" },
      { name: "Electric fence installer", slug: "electric-fence-installer" },
      { name: "Generator technician", slug: "generator-technician" },
      { name: "Generator rewinding specialist", slug: "generator-rewinding-specialist" },
      { name: "Streetlight installer", slug: "streetlight-installer" },
      { name: "UPS technician", slug: "ups-technician" },
      { name: "Smart home installer", slug: "smart-home-installer" },
      { name: "Access control installer", slug: "access-control-installer" },
    ]
  },
  {
    name: "Plumbing & Water",
    slug: "plumbing-water",
    icon: "Droplets",
    description: "Plumbing and water system specialists",
    niches: [
      { name: "Plumber", slug: "plumber" },
      { name: "Drainage specialist", slug: "drainage-specialist" },
      { name: "Water treatment technician", slug: "water-treatment-technician" },
      { name: "Septic tank evacuator", slug: "septic-tank-evacuator" },
      { name: "Sewage system installer", slug: "sewage-system-installer" },
      { name: "Bathroom installer", slug: "bathroom-installer" },
      { name: "Water heater installer", slug: "water-heater-installer" },
      { name: "Pump technician", slug: "pump-technician" },
      { name: "Leak detection specialist", slug: "leak-detection-specialist" },
      { name: "Rainwater harvesting installer", slug: "rainwater-harvesting-installer" },
    ]
  },
  {
    name: "Air Conditioning & Refrigeration",
    slug: "ac-refrigeration",
    icon: "Wind",
    description: "Cooling and refrigeration technicians",
    niches: [
      { name: "AC installer", slug: "ac-installer" },
      { name: "AC repair technician", slug: "ac-repair-technician" },
      { name: "Refrigerator repairer", slug: "refrigerate-repairer" },
      { name: "Cold room technician", slug: "cold-room-technician" },
      { name: "Freezer repair technician", slug: "freezer-repair-technician" },
      { name: "Ventilation technician", slug: "ventilation-technician" },
    ]
  },
  {
    name: "Automotive",
    slug: "automotive",
    icon: "Car",
    description: "Vehicle repair and maintenance experts",
    niches: [
      { name: "Auto mechanic", slug: "auto-mechanic" },
      { name: "Auto electrician", slug: "auto-electrician" },
      { name: "Car AC technician", slug: "car-ac-technician" },
      { name: "Panel beater", slug: "panel-beater" },
      { name: "Spray painter", slug: "spray-painter" },
      { name: "Car detailer", slug: "car-detailer" },
      { name: "Car upholstery specialist", slug: "car-upholstery-specialist" },
      { name: "Vulcanizer", slug: "vulcanizer" },
      { name: "Tire alignment specialist", slug: "tire-alignment-specialist" },
      { name: "Windshield replacement technician", slug: "windshield-replacement-technician" },
      { name: "Vehicle diagnostic technician", slug: "vehicle-diagnostic-technician" },
      { name: "Gearbox specialist", slug: "gearbox-specialist" },
      { name: "Engine rebuilder", slug: "engine-rebuilder" },
      { name: "Fuel injector technician", slug: "fuel-injector-technician" },
      { name: "Car battery technician", slug: "car-battery-technician" },
      { name: "Motorcycle mechanic", slug: "motorcycle-mechanic" },
      { name: "Tricycle mechanic (keke mechanic)", slug: "tricycle-mechanic" },
    ]
  },
  {
    name: "Furniture & Interior",
    slug: "furniture-interior",
    icon: "Sofa",
    description: "Furniture makers and interior decorators",
    niches: [
      { name: "Furniture maker", slug: "furniture-maker" },
      { name: "Kitchen cabinet maker", slug: "kitchen-cabinet-maker" },
      { name: "Wardrobe installer", slug: "wardrobe-installer" },
      { name: "Upholsterer", slug: "upholsterer" },
      { name: "Curtain installer", slug: "curtain-installer" },
      { name: "Blinds installer", slug: "blinds-installer" },
      { name: "Interior decorator", slug: "interior-decorator" },
      { name: "Wood polisher", slug: "wood-polisher" },
      { name: "Glass installer", slug: "glass-installer" },
      { name: "Mirror installer", slug: "mirror-installer" },
    ]
  },
  {
    name: "Home Repairs",
    slug: "home-repairs",
    icon: "Wrench",
    description: "Home appliance and fixture repair experts",
    niches: [
      { name: "Locksmith", slug: "locksmith" },
      { name: "Key programmer", slug: "key-programmer" },
      { name: "Door repair technician", slug: "door-repair-technician" },
      { name: "Window repair technician", slug: "window-repair-technician" },
      { name: "Mosquito net installer", slug: "mosquito-net-installer" },
      { name: "Furniture repair technician", slug: "furniture-repair-technician" },
      { name: "Appliance repair technician", slug: "appliance-repair-technician" },
      { name: "Television repair technician", slug: "television-repair-technician" },
      { name: "Washing machine repairer", slug: "washing-machine-repairer" },
      { name: "Microwave repairer", slug: "microwave-repairer" },
      { name: "Gas cooker repair technician", slug: "gas-cooker-repair-technician" },
      { name: "Water dispenser repair technician", slug: "water-dispenser-repair-technician" },
    ]
  },
  {
    name: "Cleaning & Sanitation",
    slug: "cleaning-sanitation",
    icon: "Sparkles",
    description: "Professional cleaning and sanitation services",
    niches: [
      { name: "Deep cleaner", slug: "deep-cleaner" },
      { name: "Office cleaner", slug: "office-cleaner" },
      { name: "Post-construction cleaner", slug: "post-construction-cleaner" },
      { name: "Carpet cleaner", slug: "carpet-cleaner" },
      { name: "Sofa cleaner", slug: "sofa-cleaner" },
      { name: "Mattress cleaner", slug: "mattress-cleaner" },
      { name: "Fumigation expert", slug: "fumigation-expert" },
      { name: "Pest control technician", slug: "pest-control-technician" },
      { name: "Waste collector", slug: "waste-collector" },
      { name: "Septic tank cleaner", slug: "septic-tank-cleaner" },
      { name: "Water tank cleaner", slug: "water-tank-cleaner" },
    ]
  },
  {
    name: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    icon: "Scissors",
    description: "Beauty and personal grooming professionals",
    niches: [
      { name: "Barber", slug: "barber" },
      { name: "Hair stylist", slug: "hair-stylist" },
      { name: "Makeup artist", slug: "makeup-artist" },
      { name: "Nail technician", slug: "nail-technician" },
      { name: "Lash technician", slug: "lash-technician" },
      { name: "Massage therapist", slug: "massage-therapist" },
      { name: "Spa therapist", slug: "spa-therapist" },
      { name: "Tattoo artist", slug: "tattoo-artist" },
      { name: "Henna artist", slug: "henna-artist" },
      { name: "Wig maker", slug: "wig-maker" },
      { name: "Braider", slug: "braider" },
      { name: "Facial therapist", slug: "facial-therapist" },
    ]
  },
  {
    name: "Fashion",
    slug: "fashion",
    icon: "Shirt",
    description: "Fashion designers and tailoring services",
    niches: [
      { name: "Tailor", slug: "tailor" },
      { name: "Fashion designer", slug: "fashion-designer" },
      { name: "Shoe maker", slug: "shoe-maker" },
      { name: "Cobbler", slug: "cobbler" },
      { name: "Leather bag maker", slug: "leather-bag-maker" },
      { name: "Embroidery specialist", slug: "embroidery-specialist" },
      { name: "Bead maker", slug: "bead-maker" },
      { name: "Ankara designer", slug: "ankara-designer" },
    ]
  },
  {
    name: "Events",
    slug: "events",
    icon: "PartyPopper",
    description: "Event planning and entertainment services",
    niches: [
      { name: "Event decorator", slug: "event-decorator" },
      { name: "Event planner", slug: "event-planner" },
      { name: "MC", slug: "mc" },
      { name: "DJ", slug: "dj" },
      { name: "Live band", slug: "live-band" },
      { name: "Photographer", slug: "photographer" },
      { name: "Videographer", slug: "videographer" },
      { name: "Caterer", slug: "caterer" },
      { name: "Small chops vendor", slug: "small-chops-vendor" },
      { name: "Cake baker", slug: "cake-baker" },
      { name: "Chair rental service", slug: "chair-rental-service" },
      { name: "Canopy rental service", slug: "canopy-rental-service" },
      { name: "Sound system operator", slug: "sound-system-operator" },
      { name: "Lighting technician", slug: "lighting-technician" },
    ]
  },
  {
    name: "Agriculture",
    slug: "agriculture",
    icon: "Sprout",
    description: "Agricultural and farming services",
    niches: [
      { name: "Farm laborer", slug: "farm-laborer" },
      { name: "Tractor operator", slug: "tractor-operator" },
      { name: "Poultry consultant", slug: "poultry-consultant" },
      { name: "Fish pond technician", slug: "fish-pond-technician" },
      { name: "Irrigation installer", slug: "irrigation-installer" },
      { name: "Greenhouse installer", slug: "greenhouse-installer" },
      { name: "Palm tree climber", slug: "palm-tree-climber" },
      { name: "Animal vaccination technician", slug: "animal-vaccination-technician" },
    ]
  },
  {
    name: "Logistics",
    slug: "logistics",
    icon: "Truck",
    description: "Moving and logistics professionals",
    niches: [
      { name: "Moving service", slug: "moving-service" },
      { name: "Furniture mover", slug: "furniture-mover" },
      { name: "Truck loader", slug: "truck-loader" },
      { name: "Dispatch rider", slug: "dispatch-rider" },
      { name: "Courier agent", slug: "courier-agent" },
      { name: "Crane operator", slug: "crane-operator" },
      { name: "Forklift operator", slug: "forklift-operator" },
    ]
  },
  {
    name: "Security",
    slug: "security",
    icon: "Shield",
    description: "Security and safety services",
    niches: [
      { name: "Security guard", slug: "security-guard" },
      { name: "Private investigator", slug: "private-investigator" },
      { name: "Dog handler", slug: "dog-handler" },
      { name: "Security systems installer", slug: "security-systems-installer" },
    ]
  },
  {
    name: "Metal & Industrial",
    slug: "metal-industrial",
    icon: "Factory",
    description: "Industrial and metalwork specialists",
    niches: [
      { name: "Machinist", slug: "machinist" },
      { name: "Lathe operator", slug: "lathe-operator" },
      { name: "CNC operator", slug: "cnc-operator" },
      { name: "Pipe fitter", slug: "pipe-fitter" },
      { name: "Industrial welder", slug: "industrial-welder" },
      { name: "Boiler technician", slug: "boiler-technician" },
    ]
  },
  {
    name: "Miscellaneous",
    slug: "miscellaneous",
    icon: "MoreHorizontal",
    description: "Specialized and miscellaneous services",
    niches: [
      { name: "Signboard fabricator", slug: "signboard-fabricator" },
      { name: "Printing press operator", slug: "printing-press-operator" },
      { name: "Signage installer", slug: "signage-installer" },
      { name: "Satellite TV installer", slug: "satellite-tv-installer" },
      { name: "Internet cable installer", slug: "internet-cable-installer" },
      { name: "Fiber optic technician", slug: "fiber-optic-technician" },
      { name: "Computer hardware repair technician", slug: "computer-hardware-repair-technician" },
      { name: "Phone repair technician", slug: "phone-repair-technician" },
      { name: "Watch repair technician", slug: "watch-repair-technician" },
      { name: "Generator rental operator", slug: "generator-rental-operator" },
      { name: "Ice block supplier", slug: "ice-block-supplier" },
      { name: "Fire extinguisher technician", slug: "fire-extinguisher-technician" },
      { name: "Fire alarm installer", slug: "fire-alarm-installer" },
    ]
  },
];

export const totalNiches = jobCategories.reduce((sum, cat) => sum + cat.niches.length, 0);
