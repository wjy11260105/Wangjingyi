(function () {
  window.LIFE_CONFIG = {
    supabaseUrl: "https://ioovufcayedkuntyfija.supabase.co",
    supabaseKey: "sb_publishable_gExNFObPWnyM0rk9-kyA0w_4UXgnjl0",
    storageKey: "personal-life-os-v1",
    routes: {
      dashboard: "人生总览",
      schedule: "日程安排",
      goals: "目标与项目",
      habits: "习惯追踪",
      reviews: "周期复盘",
      tracking: "成长记录",
      reflections: "内在感悟"
    },
    tables: {
      areas: "life_areas",
      goals: "goals",
      projects: "projects",
      habits: "habits",
      habitLogs: "habit_logs",
      reviews: "reviews",
      sports: "sport_sessions",
      readings: "reading_logs",
      trips: "trips",
      reflections: "reflections",
      events: "schedule_events"
    },
    defaultAreas: [
      { id: "00000000-0000-4000-8000-000000000001", name: "健康与运动", slug: "health", color: "#4f8468", icon: "△", sort_order: 1 },
      { id: "00000000-0000-4000-8000-000000000002", name: "事业与创造", slug: "career", color: "#617bb3", icon: "◇", sort_order: 2 },
      { id: "00000000-0000-4000-8000-000000000003", name: "学习与成长", slug: "learning", color: "#8a69a0", icon: "▤", sort_order: 3 },
      { id: "00000000-0000-4000-8000-000000000004", name: "生活与关系", slug: "life", color: "#c09648", icon: "○", sort_order: 4 },
      { id: "00000000-0000-4000-8000-000000000005", name: "探索与体验", slug: "explore", color: "#d46f48", icon: "✦", sort_order: 5 },
      { id: "00000000-0000-4000-8000-000000000006", name: "内在与精神", slug: "inner", color: "#7d6d95", icon: "☾", sort_order: 6 }
    ]
  };
})();
