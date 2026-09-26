// adds a "my open prs" button to a repo's pull request list that applies the
// filter `is:pr state:open author:@me`.
(() => {
  const BUTTON_ID = 'gh-helper-my-open-prs';
  const QUERY = 'is:pr state:open author:@me';
  // matches the list page and its sidebar views like /pulls/<username>
  // ("authored by me"), /pulls/assigned, /pulls/mentioned, /pulls/review-requested
  const PULLS_PATH = /^\/([^/]+)\/([^/]+)\/pulls(?:\/[^/]+)?\/?$/;

  const parseRepo = () => {
    const match = window.location.pathname.match(PULLS_PATH);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  };

  const targetHref = ({ owner, repo }) =>
    `/${owner}/${repo}/pulls?q=${encodeURIComponent(QUERY).replace(/%20/g, '+')}`;

  const isActive = () => {
    const current = new URLSearchParams(window.location.search).get('q') || '';
    return current.trim().split(/\s+/).sort().join(' ') === QUERY.split(' ').sort().join(' ');
  };

  // the "new pull request" link is the most stable anchor across github's
  // classic and react-based pr list layouts.
  const findAnchor = ({ owner, repo }) => {
    const compareHref = `/${owner}/${repo}/compare`;
    return (
      document.querySelector(`a[href="${compareHref}"]`) ||
      document.querySelector(`a[href^="${compareHref}?"]`) ||
      document.querySelector(`a[href^="${compareHref}/"]`)
    );
  };

  // clone the "new pull request" button so we inherit github's current styling
  // (primer react classes are hashed and change between deploys). fall back to
  // the classic `btn` class if the anchor doesn't look like a button.
  const buildButton = (repoInfo, anchor) => {
    let a;
    if (anchor.dataset.component === 'Button') {
      a = anchor.cloneNode(true);
      a.dataset.variant = 'default';
      a.removeAttribute('data-discover');
      a.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      const label = a.querySelector('[data-component="text"]');
      if (label) {
        label.textContent = 'My Open PRs';
      } else {
        a.textContent = 'My Open PRs';
      }
    } else {
      a = document.createElement('a');
      a.className = 'btn';
      a.style.marginRight = '8px';
      a.textContent = 'My Open PRs';
    }
    a.id = BUTTON_ID;
    a.href = targetHref(repoInfo);
    a.title = `Filter to ${QUERY}`;
    return a;
  };

  const run = () => {
    const repoInfo = parseRepo();
    const existing = document.getElementById(BUTTON_ID);

    if (!repoInfo) {
      if (existing) existing.remove();
      return;
    }

    const anchor = findAnchor(repoInfo);
    if (!anchor) return;

    let button = existing;
    if (!button || button.nextElementSibling !== anchor) {
      if (button) button.remove();
      button = buildButton(repoInfo, anchor);
      anchor.parentElement.insertBefore(button, anchor);
    }

    button.href = targetHref(repoInfo);
    button.setAttribute('aria-pressed', String(isActive()));
  };

  window.__ghHelperFeatures = window.__ghHelperFeatures || [];
  window.__ghHelperFeatures.push({ name: 'my-open-prs', run });
})();
