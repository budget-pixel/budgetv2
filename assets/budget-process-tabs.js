(function () {
  const tabs = Array.from(document.querySelectorAll('[data-bp-tab]'));
  const overview = document.getElementById('bp-panel-overview');
  const sections = Array.from(overview.querySelectorAll(':scope > .bp-section'));
  const resource = document.getElementById('bp-resource-panel');
  const content = document.getElementById('bp-resource-content');
  const status = resource.querySelector('[role="status"]');
  const resources = {
    calendar: ['Budget Calendar', 'budget-calendar.html'],
    policies: ['Financial Policies', 'financial-policies.html'],
    funds: ['Fund Structure', 'fund-descriptions-and-structure.html']
  };
  const frames = new Map();
  // No combined "Overview" tab: the page opens on the first topic and
  // readers click through one topic at a time.
  const defaultKey = tabs[0].dataset.bpTab;
  let active = defaultKey;

  sections.forEach(section => {
    const key = section.getAttribute('aria-labelledby');
    section.id = 'bp-panel-' + key;
  });

  function loadResource(key) {
    if (frames.has(key)) return;
    const frame = document.createElement('iframe');
    frame.className = 'bp-resource-frame';
    frame.title = resources[key][0];
    frame.dataset.resource = key;
    frame.addEventListener('load', () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const style = doc.createElement('style');
      style.textContent = 'html,body{height:auto!important;min-height:0!important;overflow:hidden!important;background:transparent!important}.wc-budget-process-back,nav#nav-menu,footer,.wc-breadcrumb,.page-eyebrow,.page-title,.wc-page-title-row{display:none!important}#layout{display:block!important;margin:0!important;padding:0!important}main#content{box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:0 2px 20px!important}';
      doc.head.appendChild(style);
      const main = doc.querySelector('main#content');
      function resize() {
        if (frame.hidden || !main) return;
        frame.style.height = Math.ceil(main.getBoundingClientRect().bottom + doc.defaultView.scrollY + 24) + 'px';
      }
      if (main) new ResizeObserver(resize).observe(main);
      frame._resize = resize;
      frame.dataset.loaded = 'true';
      resize();
      if (active === key) status.hidden = true;
    });
    frame.src = resources[key][1] + '?embed=department-popup';
    content.appendChild(frame);
    frames.set(key, frame);
  }

  function select(key, updateUrl) {
    if (!resources[key] && !sections.some(s => s.id === 'bp-panel-' + key)) key = defaultKey;
    active = key;
    const isResource = !!resources[key];
    tabs.forEach(tab => {
      const selected = tab.dataset.bpTab === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    overview.hidden = isResource;
    sections.forEach(section => {
      section.hidden = section.id !== 'bp-panel-' + key;
      if (!section.hidden) {
        section.setAttribute('role', 'tabpanel');
        section.setAttribute('aria-labelledby', 'bp-tab-' + key);
        section.tabIndex = 0;
      } else {
        section.removeAttribute('role');
        section.removeAttribute('tabindex');
      }
    });
    resource.hidden = !isResource;
    frames.forEach(frame => { frame.hidden = frame.dataset.resource !== key; });
    if (isResource) {
      document.getElementById('bp-resource-title').textContent = resources[key][0];
      resource.setAttribute('role', 'tabpanel');
      resource.setAttribute('aria-labelledby', 'bp-tab-' + key);
      loadResource(key);
      const frame = frames.get(key);
      frame.hidden = false;
      status.hidden = frame.dataset.loaded === 'true';
      if (frame._resize) frame._resize();
    }
    if (updateUrl) history.replaceState(null, '', key === defaultKey ? location.pathname + location.search : '#' + key);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.bpTab, true));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].focus();
      select(tabs[next].dataset.bpTab, true);
    });
  });
  overview.addEventListener('click', event => {
    const link = event.target.closest('a[href="budget-calendar.html"]');
    if (!link) return;
    event.preventDefault();
    select('calendar', true);
    document.getElementById('bp-tab-calendar').focus();
    document.querySelector('.bp-jump-links').scrollIntoView({block: 'start'});
  });
  window.addEventListener('hashchange', () => select(location.hash.slice(1), false));
  select(location.hash.slice(1) || defaultKey, false);
})();
