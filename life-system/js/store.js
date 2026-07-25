(function () {
  const config = window.LIFE_CONFIG;
  const TABLE_KEYS = Object.keys(config.tables);
  const nowIso = () => new Date().toISOString();
  const uuid = () => crypto.randomUUID();
  const pad = value => String(value).padStart(2, "0");
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const addDays = (date, count) => {
    const next = new Date(date);
    next.setDate(next.getDate() + count);
    return next;
  };

  function makeInitialState() {
    const today = new Date();
    const areas = config.defaultAreas.map(area => ({
      ...area,
      id: uuid(),
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null
    }));
    const area = slug => areas.find(item => item.slug === slug).id;
    const goals = [
      {
        id: uuid(), life_area_id: area("career"), title: "建立 AI 数据工程能力体系",
        description: "完成核心技术学习，并产出可展示的实践项目。", status: "active",
        progress: 35, target_date: dateKey(addDays(today, 120)), created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      },
      {
        id: uuid(), life_area_id: area("health"), title: "提升 HYROX 综合体能",
        description: "稳定训练节奏，改善跑步与功能性力量表现。", status: "active",
        progress: 42, target_date: dateKey(addDays(today, 90)), created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      },
      {
        id: uuid(), life_area_id: area("explore"), title: "完成一次进阶潜水旅行",
        description: "规划目的地、训练与预算，保留完整旅行记录。", status: "planning",
        progress: 15, target_date: dateKey(addDays(today, 180)), created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      }
    ];
    const projects = [
      {
        id: uuid(), goal_id: goals[0].id, life_area_id: area("career"), title: "AI 工程实践项目",
        description: "完成一个可部署的 AI 数据应用。", status: "active", progress: 30,
        start_date: dateKey(addDays(today, -15)), due_date: dateKey(addDays(today, 45)),
        created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      },
      {
        id: uuid(), goal_id: goals[1].id, life_area_id: area("health"), title: "八周混合训练计划",
        description: "每周跑步、力量和专项训练。", status: "active", progress: 50,
        start_date: dateKey(addDays(today, -28)), due_date: dateKey(addDays(today, 28)),
        created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      }
    ];
    const habits = [
      {
        id: uuid(), life_area_id: area("health"), title: "每日活动 30 分钟", frequency: "daily",
        target_count: 1, unit: "次", active: true, color: "#4f8468",
        created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      },
      {
        id: uuid(), life_area_id: area("learning"), title: "AI 学习与实践", frequency: "daily",
        target_count: 1, unit: "次", active: true, color: "#8a69a0",
        created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      },
      {
        id: uuid(), life_area_id: area("inner"), title: "睡前十分钟复盘", frequency: "daily",
        target_count: 1, unit: "次", active: true, color: "#7d6d95",
        created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      }
    ];
    const habitLogs = [];
    for (let offset = -5; offset <= -1; offset += 1) {
      habits.slice(0, offset === -3 ? 2 : 3).forEach(habit => habitLogs.push({
        id: uuid(), habit_id: habit.id, log_date: dateKey(addDays(today, offset)), count: 1,
        note: "", created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      }));
    }
    const oldEvents = readLegacyEvents();
    const events = oldEvents.length ? oldEvents : [
      {
        id: uuid(), title: "晨间跑步", type: "sport", event_date: dateKey(today),
        start_time: "07:00", end_time: "08:00", location: "户外", note: "轻松跑",
        life_area_id: area("health"), goal_id: goals[1].id, project_id: projects[1].id,
        completed: false, created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      },
      {
        id: uuid(), title: "AI 项目学习", type: "study", event_date: dateKey(addDays(today, 1)),
        start_time: "19:30", end_time: "21:00", location: "家", note: "",
        life_area_id: area("learning"), goal_id: goals[0].id, project_id: projects[0].id,
        completed: false, created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      }
    ];
    return {
      meta: { version: 1, freshSample: true, lastSyncAt: null },
      areas, goals, projects, habits, habitLogs,
      reviews: [],
      sports: [
        {
          id: uuid(), life_area_id: area("health"), sport_type: "run", session_date: dateKey(addDays(today, -2)),
          duration_minutes: 45, distance_km: 7.2, intensity: 3, feeling: "状态稳定",
          note: "轻松跑，注意步频。", created_at: nowIso(), updated_at: nowIso(), deleted_at: null
        }
      ],
      readings: [
        {
          id: uuid(), life_area_id: area("learning"), book_title: "深度工作", author: "Cal Newport",
          log_date: dateKey(addDays(today, -1)), pages_read: 28, minutes: 40, status: "reading",
          note: "专注是一种可以训练的能力。", created_at: nowIso(), updated_at: nowIso(), deleted_at: null
        }
      ],
      trips: [],
      reflections: [],
      events
    };
  }

  function readLegacyEvents() {
    try {
      const legacy = JSON.parse(localStorage.getItem("my-schedule-events-v1"));
      if (!Array.isArray(legacy)) return [];
      return legacy.map(event => ({
        id: event.id || uuid(),
        title: event.title,
        type: event.type,
        event_date: event.date,
        start_time: event.start,
        end_time: event.end,
        location: event.location || "",
        note: event.note || "",
        life_area_id: null,
        goal_id: null,
        project_id: null,
        completed: false,
        created_at: nowIso(),
        updated_at: nowIso(),
        deleted_at: null
      }));
    } catch {
      return [];
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(config.storageKey));
      if (saved && saved.meta?.version === 1) return saved;
    } catch {
      // Fall back to a clean local state.
    }
    const initial = makeInitialState();
    localStorage.setItem(config.storageKey, JSON.stringify(initial));
    return initial;
  }

  class LifeStore {
    constructor() {
      this.state = loadState();
      this.user = null;
      this.listeners = new Set();
      this.cloud = window.supabase?.createClient(config.supabaseUrl, config.supabaseKey) || null;
      this.syncing = false;
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    emit(type = "change") {
      this.listeners.forEach(listener => listener(type, this.state));
    }

    persist() {
      localStorage.setItem(config.storageKey, JSON.stringify(this.state));
    }

    list(key, options = {}) {
      const rows = Array.isArray(this.state[key]) ? this.state[key] : [];
      const visible = options.includeDeleted ? rows : rows.filter(row => !row.deleted_at);
      return [...visible];
    }

    get(key, id) {
      return this.list(key).find(item => item.id === id) || null;
    }

    upsert(key, values, options = {}) {
      const timestamp = nowIso();
      const record = {
        ...values,
        id: values.id || uuid(),
        created_at: values.created_at || timestamp,
        updated_at: timestamp,
        deleted_at: null
      };
      const index = this.state[key].findIndex(item => item.id === record.id);
      if (index >= 0) this.state[key][index] = { ...this.state[key][index], ...record };
      else this.state[key].push(record);
      if (!options.keepFresh) this.state.meta.freshSample = false;
      this.persist();
      this.emit();
      if (this.user && !options.localOnly) this.pushRecord(key, record);
      return record;
    }

    remove(key, id) {
      const record = this.state[key].find(item => item.id === id);
      if (!record) return;
      record.deleted_at = nowIso();
      record.updated_at = record.deleted_at;
      this.state.meta.freshSample = false;
      this.persist();
      this.emit();
      if (this.user) this.pushRecord(key, record);
    }

    async pushRecord(key, record) {
      if (!this.cloud || !this.user) return { error: null };
      const table = config.tables[key];
      if (!table) return { error: new Error("Unknown table") };
      const payload = { ...record, user_id: this.user.id };
      const { error } = await this.cloud.from(table).upsert(payload);
      if (error) this.emit("sync-error");
      else this.emit("synced");
      return { error };
    }

    async initializeAuth() {
      if (!this.cloud) {
        this.emit("cloud-unavailable");
        return;
      }
      const { data } = await this.cloud.auth.getSession();
      this.user = data.session?.user || null;
      this.emit("auth");
      if (this.user) await this.sync();
      this.cloud.auth.onAuthStateChange(async (_event, session) => {
        const nextUser = session?.user || null;
        if (nextUser?.id === this.user?.id) return;
        this.user = nextUser;
        this.emit("auth");
        if (this.user) await this.sync();
      });
    }

    async signIn(email, password) {
      if (!this.cloud) return { error: new Error("云服务未加载") };
      const result = await this.cloud.auth.signInWithPassword({ email, password });
      if (!result.error) {
        this.user = result.data.user;
        this.emit("auth");
        await this.sync();
      }
      return result;
    }

    async signUp(email, password) {
      if (!this.cloud) return { error: new Error("云服务未加载") };
      return this.cloud.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href.split("#")[0].split("?")[0] }
      });
    }

    async signOut() {
      if (this.cloud) await this.cloud.auth.signOut();
      this.user = null;
      this.emit("auth");
    }

    async sync() {
      if (!this.cloud || !this.user || this.syncing) return;
      this.syncing = true;
      this.emit("syncing");
      const remoteByKey = {};
      const errors = [];

      for (const key of TABLE_KEYS) {
        const table = config.tables[key];
        const { data, error } = await this.cloud.from(table).select("*");
        if (error) errors.push({ key, error });
        else remoteByKey[key] = data || [];
      }

      const hasRemoteData = Object.values(remoteByKey).some(rows => rows.length > 0);
      if (errors.length && !hasRemoteData) {
        this.syncing = false;
        this.emit("schema-missing");
        return { errors };
      }

      if (this.state.meta.freshSample && hasRemoteData) {
        Object.entries(remoteByKey).forEach(([key, rows]) => {
          this.state[key] = rows.map(({ user_id, ...row }) => row);
        });
      } else {
        for (const key of TABLE_KEYS) {
          if (!remoteByKey[key]) continue;
          const merged = new Map();
          this.list(key, { includeDeleted: true }).forEach(row => merged.set(row.id, row));
          remoteByKey[key].forEach(remote => {
            const { user_id, ...row } = remote;
            const local = merged.get(row.id);
            if (!local || new Date(row.updated_at || 0) >= new Date(local.updated_at || 0)) merged.set(row.id, row);
          });
          this.state[key] = [...merged.values()];
        }
        for (const key of TABLE_KEYS) {
          if (!remoteByKey[key]) continue;
          const rows = this.list(key, { includeDeleted: true }).map(row => ({ ...row, user_id: this.user.id }));
          if (rows.length) {
            const { error } = await this.cloud.from(config.tables[key]).upsert(rows);
            if (error) errors.push({ key, error });
          }
        }
      }

      this.state.meta.freshSample = false;
      this.state.meta.lastSyncAt = nowIso();
      this.persist();
      this.syncing = false;
      this.emit(errors.length ? "sync-error" : "synced");
      return { errors };
    }
  }

  window.LifeStore = new LifeStore();
  window.LifeDate = { dateKey, addDays, pad };
})();
