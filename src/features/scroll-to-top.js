// adds a floating "scroll to top" button on github actions job log pages. the
// button appears once the page (or the log container) is scrolled more than one
// viewport down and smooth-scrolls back to the top on click.
(() => {
  const BUTTON_ID = 'gh-helper-scroll-top';
  const JOB_PATH = /^\/[^/]+\/[^/]+\/actions\/runs\/\d+\/job\/\d+/;

  // github's log view sometimes scrolls an inner container instead of the
  // window, so we track whichever element scrolled most recently.
  let lastScrolled = null;
  let listening = false;

  const scrolledFar = () => {
    if (window.scrollY >= window.innerHeight) return true;
    const el = lastScrolled;
    return !!el && el.scrollTop >= el.clientHeight;
  };

  const update = () => {
    const button = document.getElementById(BUTTON_ID);
    if (button) button.classList.toggle('is-visible', scrolledFar());
  };

  const onScroll = (event) => {
    const target = event.target;
    lastScrolled = target instanceof Element ? target : null;
    update();
  };

  const onClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lastScrolled?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const listen = () => {
    if (listening) return;
    // capture phase so scroll events from inner containers reach us too
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    listening = true;
  };

  const unlisten = () => {
    if (!listening) return;
    document.removeEventListener('scroll', onScroll, { capture: true });
    listening = false;
    lastScrolled = null;
  };

  const buildButton = () => {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = '↑ Scroll to top';
    button.title = 'Scroll to top';
    button.addEventListener('click', onClick);
    return button;
  };

  const run = () => {
    const onJobPage = JOB_PATH.test(window.location.pathname);
    const existing = document.getElementById(BUTTON_ID);

    if (!onJobPage) {
      existing?.remove();
      unlisten();
      return;
    }

    // turbo swaps <body> on navigation, so re-append if our button was dropped
    if (!existing || !existing.isConnected) {
      existing?.remove();
      document.body.appendChild(buildButton());
    }
    listen();
    update();
  };

  window.__ghHelperFeatures = window.__ghHelperFeatures || [];
  window.__ghHelperFeatures.push({ name: 'scroll-to-top', run });
})();
