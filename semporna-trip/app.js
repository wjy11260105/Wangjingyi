(function () {
  const SUPABASE_URL = "https://ioovufcayedkuntyfija.supabase.co";
  const SUPABASE_KEY = "sb_publishable_gExNFObPWnyM0rk9-kyA0w_4UXgnjl0";
  const STORAGE_KEY = "semporna-trip-2026-v1";
  const TABLE = "semporna_trip_items";
  const START_DATE = new Date(2026, 7, 14);
  const END_DATE = new Date(2026, 7, 22);
  const BUDGET = 12000;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const pad = value => String(value).padStart(2, "0");
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = value => {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const addDays = (date, count) => {
    const next = new Date(date);
    next.setDate(next.getDate() + count);
    return next;
  };
  const uuid = () => crypto.randomUUID();
  const nowIso = () => new Date().toISOString();
  const today = () => dateKey(new Date());
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
  const formatDate = value => {
    if (!value) return "日期待定";
    const date = parseDate(value);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const routeTitles = {
    overview: "旅行总览", itinerary: "每日行程", wishlist: "旅行打卡",
    journal: "学习与感悟", budget: "预算支出", checklist: "行前清单"
  };
  const categoryNames = {
    transport: "交通", stay: "住宿", diving: "潜水", island: "跳岛", food: "美食", free: "自由活动",
    experience: "体验", photo: "拍照", learning: "学习", shopping: "购物",
    flight: "机票", hotel: "酒店", activity: "活动", meal: "餐饮", equipment: "装备", other: "其他",
    document: "证件", clothing: "衣物", digital: "数码", health: "健康", divegear: "潜水装备"
  };
  const moodNames = { 1: "疲惫", 2: "平静", 3: "不错", 4: "开心", 5: "惊喜" };
  const tripDays = Array.from({ length: 9 }, (_, index) => addDays(START_DATE, index));
  let selectedDate = dateKey(START_DATE);
  let journalTab = "learning";
  let wishTab = "all";
  let currentRoute = "overview";
  let cnyToMyrRate = Number(localStorage.getItem("semporna-cny-myr-rate")) || 0.60417;
  let toastTimer;

  function sampleItems() {
    const base = item => ({
      id: uuid(), status: "pending", amount: null, currency: "CNY", start_time: null,
      trip_date: null, details: "", category: "other", sort_order: 0, metadata: {},
      created_at: nowIso(), updated_at: nowIso(), deleted_at: null, ...item
    });
    return [
      base({ item_type: "itinerary", trip_date: "2026-08-14", start_time: "13:00", title: "抵达斗湖，前往仙本那", category: "transport", details: "确认航班与接机时间，车程约 1.5–2 小时。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-14", start_time: "18:30", title: "入住与海鲜晚餐", category: "stay", details: "办理入住，附近换汇、购买电话卡和饮用水。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-15", start_time: "08:00", title: "马步岛 · 卡帕莱跳岛", category: "island", details: "行程待确认；携带防晒、水母衣和干毛巾。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-16", start_time: "07:30", title: "敦沙卡兰海洋公园", category: "island", details: "可选珍珠岛登山与浮潜，提前确认鞋履要求。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-17", start_time: "08:00", title: "马达京潜水 / 浮潜", category: "diving", details: "根据证书和当天海况确认潜点。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-18", start_time: "10:00", title: "自由探索与休息", category: "free", details: "整理照片、补充学习记录，给身体恢复时间。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-21", start_time: "09:00", title: "无潜水日 · 镇上散步", category: "free", details: "返程前预留至少 18–24 小时禁飞间隔。" }),
      base({ item_type: "itinerary", trip_date: "2026-08-22", start_time: "09:00", title: "退房并前往斗湖机场", category: "transport", details: "预留路程和机场值机时间。" }),
      base({ item_type: "wish", title: "看一场完整的海上日落", category: "experience", details: "不赶行程，安静感受光线变化。", status: "pending", sort_order: 1 }),
      base({ item_type: "wish", title: "拍摄一组水下照片", category: "photo", details: "提前检查设备、防水壳和电池。", status: "pending", sort_order: 2 }),
      base({ item_type: "wish", title: "认识五种当地海洋生物", category: "learning", details: "每天记下一种鱼类或珊瑚。", status: "pending", sort_order: 3 }),
      base({ item_type: "learning", trip_date: "2026-08-14", title: "仙本那与巴瑶族背景", category: "learning", details: "了解当地历史、社区和负责任旅行方式。", metadata: { takeaway: "带着尊重而不是猎奇去观察。" } }),
      base({ item_type: "expense", trip_date: "2026-08-14", title: "往返机票预算", category: "flight", amount: 2500, status: "planned" }),
      base({ item_type: "expense", trip_date: "2026-08-14", title: "住宿预算", category: "hotel", amount: 2800, status: "planned" }),
      base({ item_type: "expense", trip_date: "2026-08-15", title: "跳岛与潜水预算", category: "activity", amount: 3000, status: "planned" }),
      base({ item_type: "packing", title: "护照与签证材料", category: "document", status: "pending", sort_order: 1 }),
      base({ item_type: "packing", title: "潜水证与电子保险单", category: "document", status: "pending", sort_order: 2 }),
      base({ item_type: "packing", title: "水母衣、泳衣与速干毛巾", category: "divegear", status: "pending", sort_order: 3 }),
      base({ item_type: "packing", title: "防晒霜、驱蚊和常用药", category: "health", status: "pending", sort_order: 4 }),
      base({ item_type: "packing", title: "相机、防水壳与充电设备", category: "digital", status: "pending", sort_order: 5 }),
      base({ item_type: "packing", title: "马来西亚电话卡 / 漫游", category: "digital", status: "pending", sort_order: 6 })
    ];
  }

  class SupabaseRestClient {
    constructor(url, key) {
      this.url = url;
      this.key = key;
      this.sessionKey = "semporna-supabase-session-v1";
      this.session = this.loadSessionFromUrl() || this.loadSession();
      this.auth = {
        getSession: async () => {
          await this.ensureSession();
          return { data: { session: this.session }, error: null };
        },
        signInWithPassword: credentials => this.signInWithPassword(credentials),
        signUp: credentials => this.signUp(credentials),
        signOut: () => this.signOut(),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
      };
    }
    loadSession() {
      try { return JSON.parse(localStorage.getItem(this.sessionKey)); }
      catch { return null; }
    }
    loadSessionFromUrl() {
      const params = new URLSearchParams(location.hash.slice(1));
      const accessToken = params.get("access_token");
      if (!accessToken) return null;
      const session = {
        access_token: accessToken,
        refresh_token: params.get("refresh_token"),
        expires_at: Math.floor(Date.now() / 1000) + Number(params.get("expires_in") || 3600),
        user: this.userFromToken(accessToken)
      };
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
      history.replaceState(null, "", `${location.pathname}${location.search}#/overview`);
      return session;
    }
    userFromToken(token) {
      try {
        let encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        encoded += "=".repeat((4 - encoded.length % 4) % 4);
        const payload = JSON.parse(atob(encoded));
        return { id: payload.sub, email: payload.email };
      } catch { return null; }
    }
    saveSession(session) {
      this.session = session;
      if (session) localStorage.setItem(this.sessionKey, JSON.stringify(session));
      else localStorage.removeItem(this.sessionKey);
    }
    normalizeSession(data) {
      if (!data?.access_token) return null;
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
        user: data.user || this.userFromToken(data.access_token)
      };
    }
    async request(path, options = {}, authenticated = true) {
      if (authenticated) await this.ensureSession();
      const headers = {
        apikey: this.key,
        "Content-Type": "application/json",
        ...(options.headers || {})
      };
      if (authenticated && this.session?.access_token) headers.Authorization = `Bearer ${this.session.access_token}`;
      try {
        const response = await fetch(`${this.url}${path}`, { ...options, headers });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
          return { data: null, error: { code: data?.code || String(response.status), message: data?.msg || data?.message || "请求失败" } };
        }
        return { data, error: null };
      } catch (error) {
        return { data: null, error: { code: "NETWORK_ERROR", message: error.message } };
      }
    }
    async ensureSession() {
      if (!this.session?.refresh_token) return this.session;
      if (Number(this.session.expires_at || 0) > Math.floor(Date.now() / 1000) + 60) return this.session;
      const result = await this.request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: JSON.stringify({ refresh_token: this.session.refresh_token })
      }, false);
      if (result.error) {
        this.saveSession(null);
        return null;
      }
      this.saveSession(this.normalizeSession(result.data));
      return this.session;
    }
    async signInWithPassword({ email, password }) {
      const result = await this.request("/auth/v1/token?grant_type=password", {
        method: "POST", body: JSON.stringify({ email, password })
      }, false);
      if (!result.error) {
        const session = this.normalizeSession(result.data);
        this.saveSession(session);
        result.data = { ...result.data, session, user: session.user };
      }
      return result;
    }
    async signUp({ email, password, options = {} }) {
      const redirect = options.emailRedirectTo ? `?redirect_to=${encodeURIComponent(options.emailRedirectTo)}` : "";
      const result = await this.request(`/auth/v1/signup${redirect}`, {
        method: "POST", body: JSON.stringify({ email, password })
      }, false);
      if (!result.error) {
        const session = this.normalizeSession(result.data);
        if (session) this.saveSession(session);
        result.data = { ...result.data, session, user: result.data?.user || session?.user || null };
      }
      return result;
    }
    async signOut() {
      if (this.session?.access_token) {
        await this.request("/auth/v1/logout", { method: "POST" });
      }
      this.saveSession(null);
      return { error: null };
    }
    from(table) {
      return {
        select: async () => this.request(`/rest/v1/${table}?select=*`, { method: "GET" }),
        upsert: async payload => this.request(`/rest/v1/${table}`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(payload)
        })
      };
    }
  }

  class TripStore {
    constructor() {
      this.items = this.load();
      this.user = null;
      this.cloud = new SupabaseRestClient(SUPABASE_URL, SUPABASE_KEY);
      this.listeners = new Set();
      this.fresh = !localStorage.getItem(STORAGE_KEY);
      this.syncing = false;
      this.save();
    }
    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (Array.isArray(saved)) return saved;
      } catch { /* Use samples. */ }
      return sampleItems();
    }
    save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); }
    list(type = null, includeDeleted = false) {
      return this.items.filter(item => (includeDeleted || !item.deleted_at) && (!type || item.item_type === type));
    }
    get(id) { return this.list(null, true).find(item => item.id === id); }
    subscribe(listener) { this.listeners.add(listener); }
    emit(type = "change") { this.listeners.forEach(listener => listener(type)); }
    upsert(values) {
      const record = {
        ...values, id: values.id || uuid(), created_at: values.created_at || nowIso(),
        updated_at: nowIso(), deleted_at: null
      };
      const index = this.items.findIndex(item => item.id === record.id);
      if (index >= 0) this.items[index] = { ...this.items[index], ...record };
      else this.items.push(record);
      this.fresh = false;
      this.save();
      this.emit();
      if (this.user) this.push(record);
      return record;
    }
    remove(id) {
      const record = this.get(id);
      if (!record) return;
      record.deleted_at = nowIso();
      record.updated_at = record.deleted_at;
      this.save();
      this.emit();
      if (this.user) this.push(record);
    }
    async push(record) {
      const { error } = await this.cloud.from(TABLE).upsert({ ...record, user_id: this.user.id });
      this.emit(error ? "sync-error" : "synced");
    }
    async initializeAuth() {
      if (!this.cloud) return this.emit("cloud-error");
      const { data } = await this.cloud.auth.getSession();
      this.user = data.session?.user || null;
      this.emit("auth");
      if (this.user) await this.sync();
      this.cloud.auth.onAuthStateChange(async (_event, session) => {
        const user = session?.user || null;
        if (user?.id === this.user?.id) return;
        this.user = user;
        this.emit("auth");
        if (this.user) await this.sync();
      });
    }
    async sync() {
      if (!this.cloud || !this.user || this.syncing) return;
      this.syncing = true;
      this.emit("syncing");
      const { data, error } = await this.cloud.from(TABLE).select("*");
      if (error) {
        this.syncing = false;
        this.emit(error.code === "PGRST205" ? "schema-missing" : "sync-error");
        return;
      }
      if (data.length && this.fresh) {
        this.items = data.map(({ user_id, ...item }) => item);
      } else {
        const merged = new Map(this.items.map(item => [item.id, item]));
        data.forEach(remote => {
          const { user_id, ...item } = remote;
          const local = merged.get(item.id);
          if (!local || new Date(item.updated_at) >= new Date(local.updated_at)) merged.set(item.id, item);
        });
        this.items = [...merged.values()];
      }
      applyBookingMigration();
      if (this.items.length) {
        const result = await this.cloud.from(TABLE).upsert(this.items.map(item => ({ ...item, user_id: this.user.id })));
        if (result.error) {
          this.syncing = false;
          return this.emit("sync-error");
        }
      }
      this.fresh = false;
      this.save();
      this.syncing = false;
      this.emit("synced");
    }
    async signIn(email, password) {
      const result = await this.cloud.auth.signInWithPassword({ email, password });
      if (!result.error) {
        this.user = result.data.user;
        this.emit("auth");
        await this.sync();
      }
      return result;
    }
    signUp(email, password) {
      return this.cloud.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.href.split("#")[0] }
      });
    }
    async signOut() {
      await this.cloud?.auth.signOut();
      this.user = null;
      this.emit("auth");
    }
  }

  const store = new TripStore();
  function applyBookingMigration() {
    const migrationKey = "semporna-booking-260815-v1";
    const obsoleteTitles = new Set([
      "抵达斗湖，前往仙本那", "入住与海鲜晚餐", "马步岛 · 卡帕莱跳岛",
      "敦沙卡兰海洋公园", "马达京潜水 / 浮潜", "自由探索与休息",
      "往返机票预算", "住宿预算", "跳岛与潜水预算", "抵达斗湖机场 · AK6267"
    ]);
    store.items.forEach(item => {
      if (obsoleteTitles.has(item.title) && !item.deleted_at) {
        item.deleted_at = nowIso();
        item.updated_at = item.deleted_at;
      }
    });
    const official = [
      ["26081500-0000-4000-8000-000000000031", "itinerary", "2026-08-14", "22:05", "上海浦东 T2 → 亚庇 T1", "transport", "春秋航空 9C8593，8月15日02:35抵达亚庇，航程跨日。"],
      ["26081500-0000-4000-8000-000000000032", "itinerary", "2026-08-15", "02:35", "亚庇机场转机 · 4小时25分", "transport", "抵达亚庇T1后在同一航站楼转机，下一程07:00起飞。"],
      ["26081500-0000-4000-8000-000000000033", "itinerary", "2026-08-15", "07:00", "亚庇 T1 → 斗湖 · AK6272", "transport", "马来西亚亚洲航空 AK6272，07:50抵达斗湖。"],
      ["26081500-0000-4000-8000-000000000034", "itinerary", "2026-08-15", "07:50", "斗湖机场拼车 → 仙本那", "transport", "预订资料确认抵达后乘共享面包车前往仙本那，具体上车点以接机通知为准。"],
      ["26081500-0000-4000-8000-000000000002", "itinerary", "2026-08-15", "14:00", "UC 民宿入住", "stay", "住宿日期为 8月15日至20日，共5晚，含简易早餐；仙本那房间通常14:00入住。"],
      ["26081500-0000-4000-8000-000000000003", "itinerary", "2026-08-15", null, "PADI OW + AOW · 泳池与理论", "diving", "完成开放水域与进阶开放水域课程的泳池训练和理论学习，具体集合时间以潜店通知为准。"],
      ["26081500-0000-4000-8000-000000000004", "itinerary", "2026-08-16", "08:00", "OW 开放水域训练 · 3潜", "diving", "全天完成3次开放水域训练潜水；潜点与集合时间以潜店当日通知为准。"],
      ["26081500-0000-4000-8000-000000000005", "itinerary", "2026-08-17", "08:00", "OW 1潜 + AOW 2潜", "diving", "完成1次OW与2次AOW开放水域潜水，共3潜。"],
      ["26081500-0000-4000-8000-000000000006", "itinerary", "2026-08-18", "08:00", "AOW 进阶开放水域训练 · 3潜", "diving", "完成3次进阶开放水域训练潜水。"],
      ["26081500-0000-4000-8000-000000000007", "itinerary", "2026-08-19", "07:30", "诗巴丹 Fun Dive · 3潜", "diving", "官方要求诗巴丹路线8:00前集合；具体时间、许可与海况以潜店通知为准。"],
      ["26081500-0000-4000-8000-000000000008", "itinerary", "2026-08-20", "09:00", "UC 民宿退房", "stay", "预订住宿于8月20日结束；仙本那房间通常09:00退房。"],
      ["26081500-0000-4000-8000-000000000009", "itinerary", "2026-08-20", "10:00", "潜水后恢复与整理", "free", "完成潜水课程后补水、休息并整理日志，注意后续禁飞间隔。"],
      ["26081500-0000-4000-8000-000000000010", "itinerary", "2026-08-22", null, "拼车前往斗湖机场", "transport", "送机时间和返程航班仍待确认，需提前与旅行机构确认。"],
      ["26081500-0000-4000-8000-000000000011", "learning", "2026-08-15", null, "压力、浮力与耳压平衡", "diving", "复习深度与压力变化、面镜排水、中性浮力和耳压平衡的基本原理。"],
      ["26081500-0000-4000-8000-000000000012", "learning", "2026-08-16", null, "OW：潜伴检查与水下沟通", "diving", "记录 BWRAF 潜伴检查、常用手势和气量管理。"],
      ["26081500-0000-4000-8000-000000000013", "learning", "2026-08-17", null, "AOW：导航与深潜意识", "diving", "学习指北针导航、深度对空气消耗和判断力的影响。"],
      ["26081500-0000-4000-8000-000000000014", "learning", "2026-08-18", null, "中性浮力与海洋保护", "diving", "观察自己的配重、呼吸和身体姿态，避免触碰珊瑚与追逐海洋生物。"],
      ["26081500-0000-4000-8000-000000000015", "learning", "2026-08-19", null, "诗巴丹海洋生态观察", "island", "记录当天观察到的鱼群、海龟或其他物种，以及负责任潜水行为。"]
    ];
    official.forEach(([id, itemType, tripDate, startTime, title, category, details]) => {
      if (store.get(id)) return;
      store.items.push({
        id, item_type: itemType, trip_date: tripDate, start_time: startTime, title, details,
        category, status: "pending", amount: null, currency: "CNY", sort_order: 0,
        metadata: { source: "confirmed-booking" }, created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      });
    });
    const expenses = [
      ["26081500-0000-4000-8000-000000000021", "机场拼车接送", 140, "transport"],
      ["26081500-0000-4000-8000-000000000022", "UC 民宿 5晚", 900, "hotel"],
      ["26081500-0000-4000-8000-000000000023", "PADI OW + AOW 课程", 2900, "activity"],
      ["26081500-0000-4000-8000-000000000024", "诗巴丹 Fun Dive 3潜", 1200, "activity"],
      ["26081500-0000-4000-8000-000000000025", "4天船程燃油附加费", 120, "transport"]
    ];
    expenses.forEach(([id, title, amount, category]) => {
      if (store.get(id)) return;
      store.items.push({
        id, item_type: "expense", trip_date: "2026-08-15", start_time: null, title,
        details: category === "transport" && amount === 120 ? "燃油附加费可能随油价变化。" : "来自已确认预订资料。",
        category, status: "planned", amount, currency: "MYR", sort_order: 0, metadata: { source: "confirmed-booking" },
        created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      });
    });
    const recommendations = [
      ["26081500-0000-4000-8000-000000000041", "仙本那海鲜晚餐", "food", "石斑、老虎虾、螃蟹等按当天供应选择；点单前确认时价、重量和做法。"],
      ["26081500-0000-4000-8000-000000000042", "奶油老虎虾", "food", "沙巴常见的浓香做法，也可以询问咸蛋黄或清蒸口味。"],
      ["26081500-0000-4000-8000-000000000043", "椰浆饭 Nasi Lemak", "food", "马来西亚经典早餐，通常搭配参巴酱、小鱼干、花生与鸡蛋。"],
      ["26081500-0000-4000-8000-000000000044", "沙巴生肉面", "food", "沙巴代表性面食之一，可选择干捞或汤面。"],
      ["26081500-0000-4000-8000-000000000045", "拉茶 Teh Tarik", "food", "经典马来西亚饮品，正常甜度较高，可以要求 kurang manis（少甜）。"],
      ["26081500-0000-4000-8000-000000000046", "新鲜椰子或椰子布丁", "food", "跳岛后补水打卡，购买前留意保存条件。"],
      ["26081500-0000-4000-8000-000000000051", "沙巴白咖啡", "shopping", "适合作为伴手礼，购买前查看糖分和生产日期。"],
      ["26081500-0000-4000-8000-000000000052", "沙巴茶或当地可可", "shopping", "选择密封包装，确认回国携带要求。"],
      ["26081500-0000-4000-8000-000000000053", "当地手工艺品", "shopping", "优先选择社区制作的正规商品，不购买珊瑚、贝壳或野生动物制品。"],
      ["26081500-0000-4000-8000-000000000054", "潜水日志印章或纪念品", "shopping", "在潜店完成日志并挑选一件轻便纪念品。"]
    ];
    recommendations.forEach(([id, title, category, details], index) => {
      if (store.get(id)) return;
      store.items.push({
        id, item_type: "wish", trip_date: null, start_time: null, title, details, category,
        status: "pending", amount: null, currency: "CNY", sort_order: 10 + index,
        metadata: { source: "local-recommendation" }, created_at: nowIso(), updated_at: nowIso(), deleted_at: null
      });
    });
    store.save();
    localStorage.setItem(migrationKey, "done");
  }
  applyBookingMigration();
  const list = type => store.list(type);
  const toCny = item => item.currency === "MYR"
    ? Number(item.amount || 0) / cnyToMyrRate
    : Number(item.amount || 0);
  const totalExpenses = () => list("expense").reduce((sum, item) => sum + toCny(item), 0);
  const completedPacking = () => list("packing").filter(item => item.status === "done").length;

  function toast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2300);
  }
  function open(selector) { $(selector).classList.add("open"); }
  function close(selector) { $(selector).classList.remove("open"); }
  function empty(icon, title, copy) {
    return `<div class="empty"><i>${icon}</i><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`;
  }
  function tag(category) { return `<span class="tag">${esc(categoryNames[category] || category || "其他")}</span>`; }
  function metric(icon, label, value, copy) {
    return `<article class="metric"><i>${icon}</i><span>${label}</span><strong>${value}</strong><small>${copy}</small></article>`;
  }
  function dateRail() {
    return `<div class="date-rail">${tripDays.map((date, index) => {
      const key = dateKey(date);
      return `<button class="date-button ${selectedDate === key ? "active" : ""}" data-date="${key}">
        <span>DAY ${index + 1}</span><strong>${date.getDate()}</strong><small>${weekdays[date.getDay()]}</small>
      </button>`;
    }).join("")}</div>`;
  }

  function itineraryCard(item) {
    return `<article class="timeline-item" data-edit="${item.id}">
      <div class="timeline-time">${item.start_time ? String(item.start_time).slice(0, 5) : "待定"}</div>
      <div>${tag(item.category)}<h4>${esc(item.title)}</h4><p>${esc(item.details || "尚未添加说明")}</p></div>
    </article>`;
  }

  function overviewView() {
    const itinerary = list("itinerary").sort(sortByDate);
    const wishes = list("wish");
    const packing = list("packing");
    const learnings = list("learning");
    const expenses = totalExpenses();
    return `
      <section class="hero">
        <span>THE SEA IS WAITING</span>
        <h2>去仙本那，看见海，也记录新的自己。</h2>
        <p>九天的旅程不只是景点清单。把每天想做的事、学到的知识和真实感受留下来，让旅行成为一段可回看的成长。</p>
        <div class="hero-tags"><i>跳岛</i><i>潜水</i><i>海上日落</i><i>旅行学习</i></div>
      </section>
      <section class="metrics">
        ${metric("≋", "已安排行程", `${itinerary.length}`, "覆盖 8月14日—22日")}
        ${metric("☆", "旅行愿望", `${wishes.filter(item => item.status !== "done").length}`, "等待在旅途中实现")}
        ${metric("✓", "清单完成", packing.length ? `${Math.round(completedPacking() / packing.length * 100)}%` : "0%", `${completedPacking()} / ${packing.length} 项`)}
        ${metric("¥", "当前预算", `¥${Math.round(expenses).toLocaleString()}`, `总预算 ¥${BUDGET.toLocaleString()}`)}
      </section>
      <section class="content-grid">
        <div>
          <article class="card">
            <div class="card-head"><h3>行程预览</h3><a href="#/itinerary">查看完整日程 →</a></div>
            <div class="list">${itinerary.slice(0, 5).map(item => `
              <article class="item-card" data-edit="${item.id}">
                <div class="row-top">${tag(item.category)}<small>${formatDate(item.trip_date)} · ${String(item.start_time || "").slice(0, 5)}</small></div>
                <h4>${esc(item.title)}</h4><p>${esc(item.details)}</p>
              </article>`).join("")}</div>
          </article>
        </div>
        <div>
          <article class="card">
            <div class="card-head"><h3>最想完成</h3><a href="#/wishlist">愿望清单 →</a></div>
            <div class="list">${wishes.slice(0, 4).map(item => wishCard(item)).join("")}</div>
          </article>
          <article class="card">
            <div class="card-head"><h3>旅行输入</h3><a href="#/journal">开始记录 →</a></div>
            <p style="margin:0;color:var(--muted);font-size:9px;line-height:1.7">已记录 ${learnings.length} 条学习内容。每天认识一种海洋生物、一个当地故事或一项潜水知识。</p>
          </article>
        </div>
      </section>`;
  }

  function itineraryView() {
    return `
      <div class="toolbar"><div><h2 class="view-title">每日行程</h2><p>从抵达、跳岛到返程，为每一天保留清晰安排和自由空间。</p></div><button class="primary-button" data-add="itinerary">＋ 添加行程</button></div>
      ${dateRail()}
      <div class="all-days">
        ${tripDays.map((day, index) => {
          const key = dateKey(day);
          const rows = list("itinerary").filter(item => item.trip_date === key).sort((a, b) => String(a.start_time || "99:99").localeCompare(String(b.start_time || "99:99")));
          return `<section class="card trip-day-section ${selectedDate === key ? "selected-day" : ""}" id="trip-day-${key}" data-day-section="${key}">
            <div class="card-head">
              <div><span class="day-index">DAY ${index + 1}</span><h3>${formatDate(key)} · ${weekdays[day.getDay()]}</h3></div>
              <div class="day-actions"><span class="tag">${rows.length} 项安排</span><button class="secondary-button" data-add="itinerary" data-add-date="${key}">＋</button></div>
            </div>
            <div class="timeline">${rows.length ? rows.map(itineraryCard).join("") : empty("≋", "这一天还没有安排", "可以留白，也可以添加一项期待")}</div>
          </section>`;
        }).join("")}
      </div>`;
  }

  function wishCard(item) {
    const done = item.status === "done";
    return `<article class="item-card check-row">
      <div data-edit="${item.id}">${tag(item.category)}<h4>${esc(item.title)}</h4><p>${esc(item.details)}</p></div>
      <button class="check ${done ? "done" : ""}" data-toggle="${item.id}">✓</button>
    </article>`;
  }
  function wishlistView() {
    const rows = list("wish").sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const done = rows.filter(item => item.status === "done").length;
    const groupOf = item => item.category === "food" ? "food" : item.category === "shopping" ? "shopping" : "experience";
    const groups = [
      ["food", "必吃推荐", "在点单前确认价格、重量和辣度"],
      ["shopping", "必买推荐", "选择轻便、正规和对环境友好的伴手礼"],
      ["experience", "体验打卡", "保留真正想体验和记住的瞬间"]
    ];
    const visibleGroups = groups.filter(([key]) => wishTab === "all" || wishTab === key);
    return `
      <div class="toolbar"><div><h2 class="view-title">旅行打卡</h2><p>把想吃、想买和想体验的项目列成清单，完成后逐项打勾。</p></div><button class="primary-button" data-add="wish">＋ 新打卡</button></div>
      <section class="metrics">
        ${metric("☆", "打卡项目", rows.length, "必吃、必买和体验")}
        ${metric("✓", "已经完成", done, "在旅途中逐一打勾")}
        ${metric("○", "待完成", rows.length - done, "允许计划发生变化")}
        ${metric("↗", "完成比例", rows.length ? `${Math.round(done / rows.length * 100)}%` : "0%", "旅程结束后回看")}
      </section>
      <div class="tabs">
        ${[["all","全部"],["food","必吃"],["shopping","必买"],["experience","体验"]].map(([key, label]) =>
          `<button class="tab ${wishTab === key ? "active" : ""}" data-wish-tab="${key}">${label}</button>`).join("")}
      </div>
      <div class="recommendation-groups">
        ${visibleGroups.map(([key, title, copy]) => {
          const items = rows.filter(item => groupOf(item) === key);
          return `<section class="card">
            <div class="card-head"><div><h3>${title}</h3><p class="group-copy">${copy}</p></div><span class="tag">${items.filter(item => item.status === "done").length}/${items.length}</span></div>
            <div class="list">${items.length ? items.map(wishCard).join("") : empty("☆", `暂无${title}`, "可以添加自己的旅行推荐")}</div>
          </section>`;
        }).join("")}
      </div>`;
  }

  function journalView() {
    const rows = list(journalTab).filter(item => item.trip_date === selectedDate).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return `
      <div class="toolbar"><div><h2 class="view-title">学习与感悟</h2><p>每天记录输入与感受，让旅行不只停留在照片里。</p></div><button class="primary-button" data-add="${journalTab}">＋ ${journalTab === "learning" ? "学习内容" : "今日感悟"}</button></div>
      <div class="tabs"><button class="tab ${journalTab === "learning" ? "active" : ""}" data-journal-tab="learning">每日学习</button><button class="tab ${journalTab === "reflection" ? "active" : ""}" data-journal-tab="reflection">每日感悟</button></div>
      ${dateRail()}
      <section class="card">
        <div class="card-head"><h3>${formatDate(selectedDate)} · ${journalTab === "learning" ? "今天学到了什么？" : "今天感受到了什么？"}</h3><span class="tag">${rows.length} 条</span></div>
        <div class="list">${rows.length ? rows.map(item => `
          <article class="item-card journal-card" data-edit="${item.id}">
            <div class="row-top">${tag(item.category)}<small>${item.item_type === "reflection" ? (moodNames[item.metadata?.mood] || "心情未记录") : "旅行学习"}</small></div>
            <h4>${esc(item.title)}</h4><p>${esc(item.details)}</p>
            ${item.metadata?.takeaway ? `<p><strong>我的收获：</strong>${esc(item.metadata.takeaway)}</p>` : ""}
          </article>`).join("") : empty("✎", "这一天还没有记录", journalTab === "learning" ? "记下一项新知识或当地文化" : "给今天留下一段真实感受")}</div>
      </section>`;
  }

  function budgetView() {
    const rows = list("expense").sort(sortByDate);
    const spent = totalExpenses();
    const grouped = rows.reduce((map, item) => {
      map[item.category] = (map[item.category] || 0) + toCny(item);
      return map;
    }, {});
    return `
      <div class="toolbar"><div><h2 class="view-title">预算支出</h2><p>用人民币记录计划和实际花费，旅行结束后可以完整复盘。</p></div><button class="primary-button" data-add="expense">＋ 记录支出</button></div>
      <section class="metrics">
        ${metric("¥", "总预算", `¥${BUDGET.toLocaleString()}`, "可在后续版本调整")}
        ${metric("↗", "已规划 / 支出", `¥${Math.round(spent).toLocaleString()}`, `${Math.round(spent / BUDGET * 100)}% 预算占用`)}
        ${metric("○", "剩余预算", `¥${Math.round(Math.max(0, BUDGET - spent)).toLocaleString()}`, "保留应急空间")}
        ${metric("≋", "支出项目", rows.length, "机票、酒店、活动等")}
      </section>
      <section class="content-grid">
        <article class="card">
          <div class="card-head"><h3>费用明细</h3><span class="tag">${rows.length} 项</span></div>
          <div class="list">${rows.map(item => `<article class="item-card expense-row" data-edit="${item.id}">
            <div>${tag(item.category)}<h4>${esc(item.title)}</h4><p>${formatDate(item.trip_date)} · ${item.status === "paid" ? "已支付" : "计划费用"}</p></div>
            <strong>${item.currency === "MYR" ? "RM" : "¥"}${Number(item.amount || 0).toLocaleString()}</strong>
          </article>`).join("") || empty("¥", "还没有费用记录", "从机票或住宿开始")}</div>
        </article>
        <article class="card">
          <div class="card-head"><h3>费用分布</h3><span>${Math.round(spent / BUDGET * 100)}%</span></div>
          <div class="category-bars">${Object.entries(grouped).map(([category, amount]) => `
            <div><div class="bar-head"><span>${esc(categoryNames[category] || category)}</span><span>约 ¥${Math.round(amount).toLocaleString()}</span></div><div class="progress"><i style="width:${spent ? amount / spent * 100 : 0}%"></i></div></div>`).join("")}</div>
        </article>
      </section>`;
  }

  function checklistView() {
    const rows = list("packing").sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const groups = Object.groupBy ? Object.groupBy(rows, item => item.category) : rows.reduce((map, item) => ((map[item.category] ||= []).push(item), map), {});
    const done = completedPacking();
    return `
      <div class="toolbar"><div><h2 class="view-title">行前清单</h2><p>证件、装备和健康准备，出发前逐项确认。</p></div><button class="primary-button" data-add="packing">＋ 添加清单</button></div>
      <section class="card" style="margin-bottom:13px"><div class="card-head"><h3>准备进度</h3><span class="tag">${done} / ${rows.length}</span></div><div class="progress"><i style="width:${rows.length ? done / rows.length * 100 : 0}%"></i></div></section>
      <section class="content-grid">${Object.entries(groups).map(([category, items]) => `
        <article class="card">
          <div class="card-head"><h3>${esc(categoryNames[category] || category)}</h3><span>${items.filter(item => item.status === "done").length}/${items.length}</span></div>
          <div class="list">${items.map(item => `<article class="item-card check-row"><div data-edit="${item.id}"><h4 style="margin:0">${esc(item.title)}</h4><p>${esc(item.details || "点击右侧完成")}</p></div><button class="check ${item.status === "done" ? "done" : ""}" data-toggle="${item.id}">✓</button></article>`).join("")}</div>
        </article>`).join("")}</section>`;
  }

  function sortByDate(a, b) {
    return `${a.trip_date || "9999"}${a.start_time || ""}`.localeCompare(`${b.trip_date || "9999"}${b.start_time || ""}`);
  }

  const schemas = {
    itinerary: { title: "每日行程", kicker: "ITINERARY", fields: [
      ["title", "行程名称", "text", true], ["trip_date", "日期", "date", true], ["start_time", "开始时间", "time"],
      ["category", "类型", "select", true, [["transport","交通"],["stay","住宿"],["diving","潜水"],["island","跳岛"],["food","美食"],["free","自由活动"]]],
      ["details", "行程说明", "textarea"], ["status", "状态", "select", true, [["pending","待确认"],["booked","已预订"],["done","已完成"]]]
    ]},
    wish: { title: "旅行打卡", kicker: "CHECK-IN LIST", fields: [
      ["title", "打卡项目", "text", true], ["category", "分类", "select", true, [["food","必吃"],["shopping","必买"],["experience","体验"],["photo","拍照"],["learning","学习"]]],
      ["details", "推荐理由或提醒", "textarea"], ["status", "状态", "select", true, [["pending","待打卡"],["done","已完成"]]]
    ]},
    learning: { title: "每日学习", kicker: "LEARNING", fields: [
      ["trip_date", "日期", "date", true], ["title", "学习主题", "text", true], ["details", "学到的内容", "textarea", true],
      ["takeaway", "我的收获", "textarea"], ["category", "领域", "select", true, [["learning","当地文化"],["diving","潜水知识"],["island","海洋生态"],["other","其他"]]]
    ]},
    reflection: { title: "每日感悟", kicker: "REFLECTION", fields: [
      ["trip_date", "日期", "date", true], ["title", "今日主题", "text", true], ["details", "当日感悟", "textarea", true],
      ["mood", "今日心情", "select", true, [["1","疲惫"],["2","平静"],["3","不错"],["4","开心"],["5","惊喜"]]]
    ]},
    expense: { title: "预算支出", kicker: "BUDGET", fields: [
      ["title", "费用名称", "text", true], ["amount", "金额", "number", true], ["currency", "币种", "select", true, [["CNY","人民币 CNY"],["MYR","马币 MYR"]]], ["trip_date", "日期", "date"],
      ["category", "类别", "select", true, [["flight","机票"],["hotel","酒店"],["activity","活动"],["meal","餐饮"],["transport","交通"],["equipment","装备"],["other","其他"]]],
      ["status", "状态", "select", true, [["planned","计划费用"],["paid","已支付"]]], ["details", "备注", "textarea"]
    ]},
    packing: { title: "行前清单", kicker: "PACKING", fields: [
      ["title", "清单项目", "text", true], ["category", "类别", "select", true, [["document","证件"],["clothing","衣物"],["divegear","潜水装备"],["digital","数码"],["health","健康"],["other","其他"]]],
      ["details", "补充说明", "textarea"], ["status", "状态", "select", true, [["pending","待准备"],["done","已完成"]]]
    ]}
  };

  function optionMarkup(values, current) {
    return values.map(([value, label]) => `<option value="${value}" ${String(value) === String(current) ? "selected" : ""}>${label}</option>`).join("");
  }
  function fieldMarkup(field, item) {
    const [name, label, type, required, values] = field;
    let value = item?.[name] ?? "";
    if (name === "takeaway") value = item?.metadata?.takeaway || "";
    if (name === "mood") value = item?.metadata?.mood || "3";
    const full = type === "textarea";
    if (type === "select") return `<label class="field"><span>${label}</span><select name="${name}" ${required ? "required" : ""}>${optionMarkup(values, value)}</select></label>`;
    if (type === "textarea") return `<label class="field ${full ? "full" : ""}"><span>${label}</span><textarea name="${name}" ${required ? "required" : ""}>${esc(value)}</textarea></label>`;
    return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} ${type === "number" ? 'min="0" step="0.01"' : ""}></label>`;
  }
  function defaults(type) {
    const base = { item_type: type, status: "pending", currency: "CNY", category: "other", metadata: {}, sort_order: 0 };
    if (["itinerary","learning","reflection","expense"].includes(type)) base.trip_date = selectedDate;
    if (type === "itinerary") Object.assign(base, { start_time: "09:00", category: "island" });
    if (type === "wish") base.category = "experience";
    if (type === "learning") base.category = "learning";
    if (type === "expense") Object.assign(base, { category: "activity", status: "planned" });
    if (type === "packing") base.category = "other";
    return base;
  }
  function openEditor(type, id = null) {
    const schema = schemas[type];
    const item = id ? store.get(id) : defaults(type);
    $("#itemType").value = type;
    $("#itemId").value = id || "";
    $("#modalKicker").textContent = schema.kicker;
    $("#modalTitle").textContent = `${id ? "编辑" : "新增"}${schema.title}`;
    $("#formFields").innerHTML = schema.fields.map(field => fieldMarkup(field, item)).join("");
    $("#deleteItem").classList.toggle("hidden", !id);
    open("#editorModal");
  }
  function readForm(type) {
    const data = Object.fromEntries(new FormData($("#itemForm")).entries());
    if (data.amount) data.amount = Number(data.amount);
    if (type === "learning") {
      data.metadata = { takeaway: data.takeaway || "" };
      delete data.takeaway;
    }
    if (type === "reflection") {
      data.metadata = { mood: Number(data.mood || 3) };
      delete data.mood;
    }
    return data;
  }

  function renderSide() {
    const now = new Date();
    const difference = Math.ceil((START_DATE - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    $("#countdown").textContent = difference > 0 ? difference : now <= END_DATE ? "旅途中" : "已归来";
    const packing = list("packing");
    const progress = packing.length ? Math.round(completedPacking() / packing.length * 100) : 0;
    $("#tripProgress").textContent = `${progress}%`;
    $("#tripProgressBar").style.width = `${progress}%`;
    $("#tripProgressCopy").textContent = progress === 100 ? "准备完成，可以安心出发" : `还有 ${packing.length - completedPacking()} 项行前准备`;
    const upcoming = list("itinerary").filter(item => item.trip_date >= today()).sort(sortByDate).slice(0, 4);
    $("#nextItems").innerHTML = upcoming.map(item => `<div class="side-item"><div class="side-date">${formatDate(item.trip_date)}</div><div><strong>${esc(item.title)}</strong><small>${String(item.start_time || "待定").slice(0,5)} · ${esc(categoryNames[item.category] || item.category)}</small></div></div>`).join("")
      || `<div class="empty"><strong>暂无待办行程</strong></div>`;
  }

  function render() {
    currentRoute = location.hash.replace("#/","").split("?")[0] || "overview";
    if (!routeTitles[currentRoute]) currentRoute = "overview";
    $("#pageTitle").textContent = routeTitles[currentRoute];
    $$("[data-route]").forEach(link => link.classList.toggle("active", link.dataset.route === currentRoute));
    const views = { overview: overviewView, itinerary: itineraryView, wishlist: wishlistView, journal: journalView, budget: budgetView, checklist: checklistView };
    $("#view").innerHTML = views[currentRoute]();
    renderSide();
  }

  function updateAccount(type) {
    const signed = Boolean(store.user);
    $("#accountName").textContent = signed ? store.user.email.split("@")[0] : "本地模式";
    $("#signedEmail").textContent = store.user?.email || "";
    $("#authForm").classList.toggle("hidden", signed);
    $("#signedPanel").classList.toggle("hidden", !signed);
    const labels = { syncing:"正在同步…", synced:"云端已同步", "sync-error":"同步失败，已保留本地", "schema-missing":"需要初始化旅行数据表", "cloud-error":"云同步组件加载失败" };
    $("#syncLabel").textContent = labels[type] || (signed ? "云端已连接" : "数据保存在此设备");
    if (type === "schema-missing") toast("请先在 Supabase 执行仙本那旅行数据表 SQL");
    if (type === "sync-error") toast("云端同步失败，本地记录不会丢失");
    if (type === "cloud-error") toast("云同步组件加载失败，请刷新页面或更换网络");
  }

  async function refreshExchangeRate() {
    try {
      const response = await fetch("https://api.frankfurter.dev/v2/rate/CNY/MYR");
      if (!response.ok) throw new Error("汇率服务暂不可用");
      const data = await response.json();
      if (!Number(data.rate)) throw new Error("汇率数据无效");
      cnyToMyrRate = Number(data.rate);
      localStorage.setItem("semporna-cny-myr-rate", String(cnyToMyrRate));
      render();
    } catch {
      // Keep the cached reference rate for mixed-currency budget totals.
    }
  }

  function bind() {
    window.addEventListener("hashchange", render);
    $("#view").addEventListener("click", event => {
      const add = event.target.closest("[data-add]");
      if (add) {
        if (add.dataset.addDate) selectedDate = add.dataset.addDate;
        return openEditor(add.dataset.add);
      }
      const edit = event.target.closest("[data-edit]");
      if (edit && !event.target.closest("[data-toggle]")) return openEditor(store.get(edit.dataset.edit).item_type, edit.dataset.edit);
      const toggle = event.target.closest("[data-toggle]");
      if (toggle) {
        const item = store.get(toggle.dataset.toggle);
        const willComplete = item.status !== "done";
        store.upsert({ ...item, status: willComplete ? "done" : "pending" });
        toast(willComplete ? "已完成" : "已取消完成");
        return;
      }
      const date = event.target.closest("[data-date]");
      if (date) {
        selectedDate = date.dataset.date;
        render();
        requestAnimationFrame(() => document.querySelector(`[data-day-section="${selectedDate}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
      const tab = event.target.closest("[data-journal-tab]");
      if (tab) { journalTab = tab.dataset.journalTab; render(); }
      const wishFilter = event.target.closest("[data-wish-tab]");
      if (wishFilter) { wishTab = wishFilter.dataset.wishTab; render(); }
    });
    $("#quickAdd").addEventListener("click", () => open("#quickModal"));
    $("#mobileAdd").addEventListener("click", () => open("#quickModal"));
    $$("[data-quick]").forEach(button => button.addEventListener("click", () => {
      close("#quickModal");
      openEditor(button.dataset.quick);
    }));
    $$("[data-close-editor]").forEach(button => button.addEventListener("click", () => close("#editorModal")));
    $$("[data-close-quick]").forEach(button => button.addEventListener("click", () => close("#quickModal")));
    $$("[data-close-auth]").forEach(button => button.addEventListener("click", () => close("#authModal")));
    $$(".modal-backdrop").forEach(layer => layer.addEventListener("click", event => { if (event.target === layer) layer.classList.remove("open"); }));
    document.addEventListener("keydown", event => { if (event.key === "Escape") $$(".modal-backdrop").forEach(layer => layer.classList.remove("open")); });
    $("#itemForm").addEventListener("submit", event => {
      event.preventDefault();
      const type = $("#itemType").value;
      const id = $("#itemId").value;
      const old = id ? store.get(id) : defaults(type);
      store.upsert({ ...old, ...readForm(type), id: id || undefined, item_type: type });
      close("#editorModal");
      toast(id ? "记录已更新" : "记录已保存");
    });
    $("#deleteItem").addEventListener("click", () => {
      const id = $("#itemId").value;
      if (!id || !confirm("确定删除这条记录吗？")) return;
      store.remove(id);
      close("#editorModal");
      toast("记录已删除");
    });
    $("#accountButton").addEventListener("click", () => open("#authModal"));
    $("#syncButton").addEventListener("click", () => store.user ? store.sync() : open("#authModal"));
    $("#authForm").addEventListener("submit", async event => {
      event.preventDefault();
      const result = await store.signIn($("#authEmail").value.trim(), $("#authPassword").value);
      if (result.error) return toast(`登录失败：${result.error.message}`);
      close("#authModal");
      toast("登录成功，旅行记录正在同步");
    });
    $("#signUp").addEventListener("click", async () => {
      if (!$("#authForm").reportValidity()) return;
      const result = await store.signUp($("#authEmail").value.trim(), $("#authPassword").value);
      if (result.error) return toast(`注册失败：${result.error.message}`);
      toast(result.data.session ? "注册成功" : "注册成功，请前往邮箱验证");
    });
    $("#signOut").addEventListener("click", async () => { await store.signOut(); close("#authModal"); toast("已退出账号"); });
    $("#manualSync").addEventListener("click", () => store.sync());
  }

  const now = new Date();
  $("#todayLabel").textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 · SEMPORNA TRIP PLANNER`;
  store.subscribe(type => { updateAccount(type); if (type !== "syncing") render(); });
  bind();
  updateAccount("auth");
  render();
  store.initializeAuth();
  refreshExchangeRate();
  window.addEventListener("focus", () => { if (store.user) store.sync(); });
})();
