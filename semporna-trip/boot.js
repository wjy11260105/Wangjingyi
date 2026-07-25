(function () {
  const sources = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://unpkg.com/@supabase/supabase-js@2"
  ];

  function loadSupabase(index) {
    if (window.supabase) {
      window.dispatchEvent(new CustomEvent("supabase-ready"));
      return;
    }
    if (index >= sources.length) {
      window.dispatchEvent(new CustomEvent("supabase-unavailable"));
      return;
    }
    const script = document.createElement("script");
    script.src = sources[index];
    script.onload = () => window.supabase
      ? window.dispatchEvent(new CustomEvent("supabase-ready"))
      : loadSupabase(index + 1);
    script.onerror = () => loadSupabase(index + 1);
    document.head.appendChild(script);
  }

  loadSupabase(0);
})();
