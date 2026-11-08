import { PrismaClient } from "@prisma/client";
import { EMISSION_FACTORS } from "../lib/carbon/factors";
import { ACTIONS_LIBRARY } from "../lib/recommendation/actionsLibrary";
import { DEMO_BASELINE_PROFILE } from "../lib/carbon/scenarios";
import { calculateFootprint } from "../lib/carbon/engine";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CarbonQuest Database...");

  // 1. Clean existing tables in order
  await prisma.actionCheckin.deleteMany();
  await prisma.userAction.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.hotspot.deleteMany();
  await prisma.footprintSnapshot.deleteMany();
  await prisma.activityInput.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.streak.deleteMany();
  await prisma.ecoScoreHistory.deleteMany();
  await prisma.leaderboardEntry.deleteMany();
  await prisma.redemption.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.preferenceProfile.deleteMany();
  await prisma.integrationAccount.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emissionFactor.deleteMany();
  await prisma.actionTemplate.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.rewardItem.deleteMany();

  // 2. Seed Emission Factors
  console.log("-> Seeding verified Emission Factors...");
  for (const factor of Object.values(EMISSION_FACTORS)) {
    await prisma.emissionFactor.create({
      data: {
        id: factor.id,
        category: factor.category,
        subcategory: factor.subcategory,
        unit: factor.unit,
        value: factor.value,
        source: factor.source,
        year: factor.year,
        region: factor.region,
        notes: factor.notes || null,
        active: factor.active,
      },
    });
  }

  // 3. Seed Action Templates (40+ actions)
  console.log(`-> Seeding ${ACTIONS_LIBRARY.length} Action Templates...`);
  for (const act of ACTIONS_LIBRARY) {
    await prisma.actionTemplate.create({
      data: {
        id: act.id,
        slug: act.slug,
        title: act.title,
        category: act.category,
        description: act.description,
        impactFormulaKey: act.changeType,
        difficulty: act.difficulty,
        costImpact: act.costImpact,
        defaultMagnitude: act.defaultMagnitude,
        unit: act.unit,
        tags: JSON.stringify(act.tags),
        active: true,
      },
    });
  }

  // 4. Seed Badges
  console.log("-> Seeding Badges...");
  const BADGES = [
    {
      id: "badge_first_step",
      slug: "first_step",
      name: "Climate Initiator",
      category: "general",
      description: "Completed carbon onboarding and audited personal baseline emissions.",
      icon: "Sparkles",
      criteria: "Complete onboarding audit",
      xpReward: 50,
    },
    {
      id: "badge_transit_hero",
      slug: "transit_hero",
      name: "Transit Champion",
      category: "transport",
      description: "Logged 10+ verified public transit or active mobility trips.",
      icon: "Bus",
      criteria: "Complete 10 verified transit/active trips",
      xpReward: 150,
    },
    {
      id: "badge_watt_whisperer",
      slug: "watt_whisperer",
      name: "Watt Whisperer",
      category: "electricity",
      description: "Reduced AC usage by 1+ hr/day and maintained BEE 24°C thermostat habit.",
      icon: "Zap",
      criteria: "Complete AC reduction habit for 7 consecutive days",
      xpReward: 200,
    },
    {
      id: "badge_plant_power",
      slug: "plant_power",
      name: "Plant-Powered",
      category: "food",
      description: "Logged 5 consecutive plant-based meals reducing dietary methane.",
      icon: "Salad",
      criteria: "Log 5 plant-based meal days",
      xpReward: 120,
    },
    {
      id: "badge_circular_champion",
      slug: "circular_champion",
      name: "Circular Champion",
      category: "waste",
      description: "Diverted kitchen waste to aerobic composting and kabadiwala recycling.",
      icon: "Recycle",
      criteria: "Segregate and compost for 14 days",
      xpReward: 180,
    },
    {
      id: "badge_streak_14",
      slug: "streak_14",
      name: "Consistency Master",
      category: "streak",
      description: "Maintained a 14-day daily carbon tracking streak.",
      icon: "Flame",
      criteria: "14-day active streak",
      xpReward: 250,
    },
    {
      id: "badge_whatif_visionary",
      slug: "whatif_visionary",
      name: "Scenario Architect",
      category: "simulation",
      description: "Simulated 3 climate behavior change scenarios and converted one into action.",
      icon: "Cpu",
      criteria: "Simulate and convert scenario to plan",
      xpReward: 100,
    },
    {
      id: "badge_century_club",
      slug: "century_club",
      name: "100kg CO₂e Avoided",
      category: "impact",
      description: "Cumulatively avoided over 100 kg of CO₂e greenhouse gas emissions.",
      icon: "Award",
      criteria: "Achieve 100 kg avoided CO2e",
      xpReward: 500,
    },
  ];

  for (const b of BADGES) {
    await prisma.badge.create({ data: b });
  }

  // 5. Seed Reward Catalog
  console.log("-> Seeding Reward Items...");
  const REWARD_ITEMS = [
    {
      id: "reward_cert_pccoe",
      title: "Certified Carbon Neutral Citizen Certificate",
      description: "Official digital verifiable certificate endorsed by PCCOE Grand Challenge 2026.",
      category: "certificate",
      pointsCost: 500,
      imageUrl: "/rewards/cert.svg",
      isDemoItem: true,
      active: true,
    },
    {
      id: "reward_theme_forest",
      title: "Deep Emerald Forest Dark Theme",
      description: "Exclusive high-contrast climate fintech UI theme for dashboard and analytics.",
      category: "theme",
      pointsCost: 200,
      imageUrl: "/rewards/theme.svg",
      isDemoItem: true,
      active: true,
    },
    {
      id: "reward_tree_sahyadri",
      title: "Dedicate a Native Tree in Western Ghats",
      description: "Geo-tagged native sapling planted in Sahyadri watershed corridor via partner NGO.",
      category: "eco_partner",
      pointsCost: 750,
      imageUrl: "/rewards/tree.svg",
      isDemoItem: true,
      active: true,
    },
    {
      id: "reward_campus_canteen",
      title: "VIT/PCCOE Canteen Eco-Meal Voucher",
      description: "₹50 discount voucher for wholesome plant-based lunch at campus cafeteria.",
      category: "eco_partner",
      pointsCost: 300,
      imageUrl: "/rewards/food.svg",
      isDemoItem: true,
      active: true,
    },
  ];

  for (const item of REWARD_ITEMS) {
    await prisma.rewardItem.create({ data: item });
  }

  // 6. Seed Demo Users
  console.log("-> Seeding 3 Demo Users...");

  // USER 1: Primary Demo User (Aarav Sharma - PCCOE / Pune Context)
  const user1 = await prisma.user.create({
    data: {
      id: "user_demo_primary",
      email: "demo@carbonquest.in",
      name: "Aarav Sharma",
      ageBand: "18-24",
      location: "Pune, Maharashtra, India",
      householdSize: 2,
      homeType: "Apartment",
      role: "user",
      units: "metric",
      theme: "system",
      onboardingStatus: "completed",
    },
  });

  // Consents for user1
  await prisma.consent.createMany({
    data: [
      { userId: user1.id, type: "analytics", granted: true, version: "1.0" },
      { userId: user1.id, type: "ai_processing", granted: true, version: "1.0" },
      { userId: user1.id, type: "telemetry_tracking", granted: true, version: "1.0" },
    ],
  });

  // Learned affinities for User 1: Pre-seeded so the closed-loop demonstrates immediately!
  // In User 1 history: skipped "commute_cycle_2days" because "not_practical", so adaptive engine boosts bus/metro!
  const learnedAffinitiesUser1 = {
    categoryWeights: {
      transport: 1.05,
      electricity: 1.10,
      food: 1.0,
      shopping: 0.95,
      waste: 1.05,
    },
    difficultyWeights: {
      easy: 1.2,
      medium: 0.95,
      hard: 0.7,
    },
    skipReasonCounts: {
      not_practical: 1,
      too_costly: 0,
      not_interested: 0,
      already_doing: 0,
      other: 0,
    },
    completedActionSlugs: ["reduce_ac_1hr", "segregate_dry_wet"],
    skippedActionSlugs: ["commute_cycle_2days"],
    rejectedActionSlugs: [],
    lastSkippedActionSlug: "commute_cycle_2days",
    lastSkippedReason: "not_practical",
    totalAccepted: 9,
    totalSkipped: 1,
    totalCompleted: 7,
  };

  await prisma.preferenceProfile.create({
    data: {
      userId: user1.id,
      willingCategories: JSON.stringify(["transport", "electricity", "food", "shopping", "waste"]),
      budgetSensitivity: "medium",
      preferredDifficulty: "medium",
      learnedAffinities: JSON.stringify(learnedAffinitiesUser1),
    },
  });

  // Calculate baseline footprint for demo user
  const footprint = calculateFootprint(DEMO_BASELINE_PROFILE);

  // 90-day historical snapshots for User 1
  const now = new Date();
  const snapshotMonths = [
    { offsetMonths: 2, totalKg: 148.5, confidence: 78 },
    { offsetMonths: 1, totalKg: 139.0, confidence: 82 },
    { offsetMonths: 0, totalKg: footprint.totalCo2eKg, confidence: footprint.overallConfidenceScore },
  ];

  let currentSnapshotId = "";
  for (const snap of snapshotMonths) {
    const periodDate = new Date(now.getFullYear(), now.getMonth() - snap.offsetMonths, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - snap.offsetMonths + 1, 0);

    const createdSnap = await prisma.footprintSnapshot.create({
      data: {
        userId: user1.id,
        periodStart: periodDate,
        periodEnd: endDate,
        totalKg: snap.totalKg,
        byCategory: JSON.stringify(footprint.byCategory),
        lineItems: JSON.stringify(
          Object.values(footprint.byCategory).flatMap((c) => c.lineItems)
        ),
        confidence: snap.confidence,
        version: 1,
      },
    });

    if (snap.offsetMonths === 0) {
      currentSnapshotId = createdSnap.id;
    }
  }

  // Hotspots for current snapshot
  const hotspotsData = [
    { rank: 1, category: "transport", lineItem: "Two-Wheeler Commute (Petrol)", kg: 39.7, percent: 31.1, severity: "high" },
    { rank: 2, category: "electricity", lineItem: "Air Conditioning (Split AC)", kg: 32.1, percent: 25.1, severity: "high" },
    { rank: 3, category: "food", lineItem: "Dietary Baseline (Vegetarian)", kg: 28.0, percent: 21.9, severity: "medium" },
    { rank: 4, category: "shopping", lineItem: "Clothing & Fast Fashion", kg: 17.7, percent: 13.9, severity: "low" },
    { rank: 5, category: "waste", lineItem: "Unsegregated Landfill Waste", kg: 10.1, percent: 7.9, severity: "low" },
  ];

  for (const h of hotspotsData) {
    await prisma.hotspot.create({
      data: {
        snapshotId: currentSnapshotId,
        category: h.category,
        lineItem: h.lineItem,
        rank: h.rank,
        kg: h.kg,
        percent: h.percent,
        severity: h.severity,
      },
    });
  }

  // User Actions (Past completed + active plan)
  const act1 = await prisma.userAction.create({
    data: {
      userId: user1.id,
      actionSlug: "reduce_ac_1hr",
      title: "Reduce AC Usage by 1 Hour per Day",
      category: "electricity",
      status: "completed",
      estimatedMonthlyKg: 12.3,
      acceptedAt: new Date(Date.now() - 25 * 86400000),
      completedAt: new Date(Date.now() - 5 * 86400000),
    },
  });

  // Action Checkins for act1
  for (let i = 1; i <= 7; i++) {
    await prisma.actionCheckin.create({
      data: {
        userActionId: act1.id,
        date: new Date(Date.now() - i * 86400000),
        done: true,
        notes: "Maintained 25°C setting with ceiling fan assistance.",
        estimatedKgAvoided: 0.41,
      },
    });
  }

  // Skipped action for demo: cycling skipped due to practicality
  await prisma.userAction.create({
    data: {
      userId: user1.id,
      actionSlug: "commute_cycle_2days",
      title: "Cycle for Commute 2 Days/Week",
      category: "transport",
      status: "skipped",
      skipReason: "not_practical",
      estimatedMonthlyKg: 7.8,
      acceptedAt: new Date(Date.now() - 10 * 86400000),
    },
  });

  // Active in-progress action
  const act3 = await prisma.userAction.create({
    data: {
      userId: user1.id,
      actionSlug: "commute_bus_2days",
      title: "Switch to PMPML City Bus 2 Days/Week",
      category: "transport",
      status: "accepted",
      estimatedMonthlyKg: 6.2,
      acceptedAt: new Date(Date.now() - 3 * 86400000),
    },
  });

  await prisma.actionCheckin.create({
    data: {
      userActionId: act3.id,
      date: new Date(Date.now() - 1 * 86400000),
      done: true,
      notes: "Took bus route 24 to campus.",
      estimatedKgAvoided: 0.72,
    },
  });

  // Verified Trips for user1 (with haversine & validation rules applied)
  await prisma.trip.createMany({
    data: [
      {
        userId: user1.id,
        mode: "bus_city",
        distanceKm: 9.2,
        durationSec: 1800, // 30 min -> 18.4 km/h
        avgSpeedKmh: 18.4,
        validationStatus: "valid",
        validationReason: "Trip telemetry within urban bus speed window.",
        co2AvoidedKg: 1.28,
        source: "gps_live",
        startLocation: "Kothrud, Pune",
        endLocation: "VIT Pune, Bibwewadi",
        startedAt: new Date(Date.now() - 1 * 86400000),
        endedAt: new Date(Date.now() - 1 * 86400000 + 1800000),
      },
      {
        userId: user1.id,
        mode: "walk",
        distanceKm: 2.1,
        durationSec: 1620, // 27 min -> 4.67 km/h
        avgSpeedKmh: 4.7,
        steps: 2650,
        validationStatus: "valid",
        validationReason: "Pedometer cadence and walking velocity verified.",
        co2AvoidedKg: 0.36,
        source: "gps_live",
        startLocation: "Camp Market, Pune",
        endLocation: "Home",
        startedAt: new Date(Date.now() - 2 * 86400000),
        endedAt: new Date(Date.now() - 2 * 86400000 + 1620000),
      },
      {
        userId: user1.id,
        mode: "bicycle",
        distanceKm: 4.5,
        durationSec: 1080, // 18 min -> 15.0 km/h
        avgSpeedKmh: 15.0,
        validationStatus: "valid",
        validationReason: "Consistent cycling pace verified.",
        co2AvoidedKg: 0.78,
        source: "strava",
        startLocation: "University Road, Pune",
        endLocation: "FC Road, Pune",
        startedAt: new Date(Date.now() - 4 * 86400000),
        endedAt: new Date(Date.now() - 4 * 86400000 + 1080000),
      },
    ],
  });

  // User 1 Badges
  await prisma.userBadge.createMany({
    data: [
      { userId: user1.id, badgeId: "badge_first_step", earnedAt: new Date(Date.now() - 60 * 86400000) },
      { userId: user1.id, badgeId: "badge_watt_whisperer", earnedAt: new Date(Date.now() - 15 * 86400000) },
      { userId: user1.id, badgeId: "badge_streak_14", earnedAt: new Date(Date.now() - 1 * 86400000) },
    ],
  });

  // User 1 Streak & Gamification
  await prisma.streak.create({
    data: {
      userId: user1.id,
      currentStreak: 14,
      longestStreak: 21,
      lastActiveDate: new Date(),
    },
  });

  await prisma.ecoScoreHistory.createMany({
    data: [
      { userId: user1.id, score: 62, formula: "Baseline Onboarding Audit", date: new Date(Date.now() - 60 * 86400000) },
      { userId: user1.id, score: 68, formula: "AC Reduction + Transit Adoption", date: new Date(Date.now() - 30 * 86400000) },
      { userId: user1.id, score: 76, formula: "Active Streak + 14-day Habit Consistency", date: new Date() },
    ],
  });

  await prisma.pointsLedger.createMany({
    data: [
      { userId: user1.id, points: 50, actionType: "onboarding", description: "Completed initial carbon footprint audit" },
      { userId: user1.id, points: 200, actionType: "badge_earned", description: "Earned Watt Whisperer Badge" },
      { userId: user1.id, points: 250, actionType: "badge_earned", description: "Earned Consistency Master 14-day Streak" },
      { userId: user1.id, points: 350, actionType: "trips_verified", description: "Verified green transit and active trips" },
    ],
  });

  // User 1 Active Goal
  await prisma.goal.create({
    data: {
      userId: user1.id,
      targetPercent: 20.0,
      baselineKg: 148.5,
      currentKg: 127.6,
      deadline: new Date(Date.now() + 60 * 86400000),
      status: "active",
    },
  });

  // Saved Scenario for User 1
  await prisma.scenario.create({
    data: {
      userId: user1.id,
      name: "Cooler Summer & Transit Combo",
      changes: JSON.stringify([
        { category: "electricity", type: "reduce_ac_hours", magnitude: 1 },
        { category: "transport", type: "switch_commute_public_transit", magnitude: 2 },
      ]),
      resultJson: JSON.stringify({
        baselineTotalKg: 127.6,
        projectedTotalKg: 109.1,
        absoluteMonthlySavingKg: 18.5,
        percentageSaving: 14.5,
        annualizedSavingKg: 222.0,
        estimatedCostSavingInrMonthly: 460,
      }),
    },
  });

  // USER 2: Priya Patil (Pune, Top ranker on Leaderboard)
  const user2 = await prisma.user.create({
    data: {
      id: "user_demo_priya",
      email: "priya.patil@pune.ac.in",
      name: "Priya Patil",
      location: "Pune, Maharashtra, India",
      role: "user",
      onboardingStatus: "completed",
    },
  });

  // USER 3: Rohit Deshmukh (VIT Pune)
  const user3 = await prisma.user.create({
    data: {
      id: "user_demo_rohit",
      email: "rohit.deshmukh@vit.edu",
      name: "Rohit Deshmukh",
      location: "Pune, Maharashtra, India",
      role: "user",
      onboardingStatus: "completed",
    },
  });

  // Leaderboard entries for all 3 users
  await prisma.leaderboardEntry.createMany({
    data: [
      {
        userId: user2.id,
        displayName: "Priya P. (PCCOE Green Club)",
        city: "Pune",
        group: "PCCOE Pune",
        ecoScore: 84,
        co2AvoidedKg: 48.2,
        points: 1240,
        rank: 1,
        optOut: false,
      },
      {
        userId: user1.id,
        displayName: "Aarav Sharma (You)",
        city: "Pune",
        group: "VIT Pune",
        ecoScore: 76,
        co2AvoidedKg: 28.5,
        points: 850,
        rank: 2,
        optOut: false,
      },
      {
        userId: user3.id,
        displayName: "Rohit D. (Climate Action)",
        city: "Pune",
        group: "VIT Pune",
        ecoScore: 68,
        co2AvoidedKg: 16.4,
        points: 620,
        rank: 3,
        optOut: false,
      },
    ],
  });

  // Initial Chat Session for User 1
  const conv = await prisma.chatConversation.create({
    data: {
      userId: user1.id,
      title: "Pune Hotspots & AC Strategy",
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conv.id,
        role: "user",
        content: "What should I change first to lower my footprint in Pune?",
      },
      {
        conversationId: conv.id,
        role: "assistant",
        content:
          "Based on your calculated monthly footprint of **127.6 kg CO₂e**, your two primary carbon hotspots are **Transport (39.7 kg, 31.1%)** and **Air Conditioning (32.1 kg, 25.1%)**.\n\nBecause you recently noted cycling is not practical for your daily 18 km route, your highest-impact, lowest-friction move is **switching to Pune's PMPML City Bus 2 days/week** (saving ~6.2 kg CO₂e/mo) combined with **raising your AC thermostat to 24°C or cutting 1 hr/day** (saving ~12.3 kg CO₂e/mo and ₹350 on electricity bills).",
        groundingRefs: JSON.stringify({
          totalKg: 127.6,
          transportKg: 39.7,
          electricityKg: 32.1,
          hotspots: ["transport", "electricity"],
        }),
      },
    ],
  });

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
