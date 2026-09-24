// entry point for all features. github is a turbo/spa app, so features must be
// idempotent and get re-run on every navigation and dom change.
(() => {
  const features = window.__ghHelperFeatures || [];

  const runAll = () => {
    for (const feature of features) {
      try {
        feature.run();
      } catch (err) {
        console.error(`[github-helper] feature "${feature.name}" failed`, err);
      }
    }
  };

  // debounce mutation bursts so we don't hammer the dom
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      runAll();
    });
  };

  document.addEventListener('turbo:load', schedule);
  document.addEventListener('turbo:render', schedule);
  window.addEventListener('popstate', schedule);

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  runAll();
})();
