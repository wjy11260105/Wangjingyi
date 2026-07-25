(function () {
  const sources = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://unpkg.com/@supabase/supabase-js@2"
  ];

  function loadApp() {
    const script = document.createElement("script");
    script.src = "./app.js";
    document.body.appendChild(script);
  }

  function loadSupabase(index) {
    if (window.supabase || index >= sources.length) {
      loadApp();
      return;
    }
    const script = document.createElement("script");
    script.src = sources[index];
    script.onload = () => window.supabase ? loadApp() : loadSupabase(index + 1);
    script.onerror = () => loadSupabase(index + 1);
    document.head.appendChild(script);
  }

  loadSupabase(0);
})();
