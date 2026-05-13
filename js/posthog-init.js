(function () {
  'use strict';

  var POSTHOG_KEY = 'phc_sN2BiBuMpLRVZeyLiYh2xFcJa6rrw2er6axFCFgBLCmw';
  var POSTHOG_HOST = 'https://eu.i.posthog.com';
  var RAW_URL_PROPERTY_KEYS = [
    '$current_url',
    '$initial_current_url',
    '$referrer',
    '$initial_referrer',
    '$session_entry_current_url',
    '$session_entry_referrer',
    'url',
    'current_url',
    'referrer_url'
  ];
  var SAFE_URL_PROPERTY_KEYS = [
    'url_path',
    'url_hash_present',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term'
  ];
  var pageStartedAt = Date.now();
  var maxScrollPercent = 0;
  var pageLeftCaptured = false;
  var heroViewedCaptured = false;

  // Custom analytics for explicit StudentHub CTA events.
  if (!POSTHOG_KEY || POSTHOG_KEY === 'POSTHOG_PROJECT_KEY_HERE') {
    if (window.console && window.console.warn) {
      window.console.warn('PostHog is not initialized: replace POSTHOG_PROJECT_KEY_HERE in js/posthog-init.js.');
    }
    return;
  }

  if (!POSTHOG_HOST || POSTHOG_HOST === 'POSTHOG_HOST_HERE') {
    if (window.console && window.console.warn) {
      window.console.warn('PostHog is not initialized: replace POSTHOG_HOST_HERE in js/posthog-init.js.');
    }
    return;
  }

  try {
    (function (t, e) {
      var o, n, p, r;
      e.__SV ||
        ((window.posthog = e),
        (e._i = []),
        (e.init = function (i, s, a) {
          function g(t, e) {
            var o = e.split('.');
            2 === o.length && ((t = t[o[0]]), (e = o[1]));
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
            };
          }
          (p = t.createElement('script')).type = 'text/javascript';
          p.async = true;
          p.src = s.api_host + '/static/array.js';
          (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r);
          var u = e;
          void 0 !== a ? (u = e[a] = []) : (a = 'posthog');
          u.people = u.people || [];
          u.toString = function (t) {
            var e = 'posthog';
            return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e;
          };
          u.people.toString = function () {
            return u.toString(1) + '.people (stub)';
          };
          o =
            'capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags reloadFeatureFlags group identifyGroup getFeatureFlag getFeatureFlagPayload';
          for (n = 0; n < o.split(' ').length; n++) g(u, o.split(' ')[n]);
          e._i.push([i, s, a]);
        }),
        (e.__SV = 1));
    })(document, window.posthog || []);

    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      property_denylist: RAW_URL_PROPERTY_KEYS,
      before_send: scrubPostHogEvent
    });
  } catch (error) {
    if (window.console && window.console.warn) {
      window.console.warn('PostHog failed to initialize.', error);
    }
  }

  function getTrackedTarget(eventTarget) {
    if (!eventTarget) return null;
    if (eventTarget.closest) return eventTarget.closest('[data-ph-cta-key]');
    if (eventTarget.parentElement && eventTarget.parentElement.closest) {
      return eventTarget.parentElement.closest('[data-ph-cta-key]');
    }
    return null;
  }

  function getText(target) {
    if (target.getAttribute('data-ph-cta-text')) return target.getAttribute('data-ph-cta-text');
    return (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getDestination(target) {
    if (target.href) return target.href;
    var closestLink = target.closest ? target.closest('a[href]') : null;
    return closestLink && closestLink.href ? closestLink.href : '';
  }

  function getSafeDestination(destination) {
    var fallback = (destination || '').split(/[?#]/)[0];

    if (!destination) {
      return {
        value: '',
        scheme: '',
        queryPresent: false,
        hashPresent: false
      };
    }

    try {
      var parsed = new URL(destination, window.location.href);
      var isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(destination);
      var scheme = isAbsolute ? parsed.protocol.replace(/:$/, '').toLowerCase() : '';

      if (isAbsolute && scheme !== 'http' && scheme !== 'https') {
        return {
          value: scheme === 'mailto' || scheme === 'tel' || scheme === 'sms' || scheme === 'whatsapp' ? scheme + ':[redacted]' : 'non-http-url:[redacted]',
          scheme: scheme || 'unknown',
          queryPresent: !!parsed.search || destination.indexOf('?') !== -1,
          hashPresent: !!parsed.hash || destination.indexOf('#') !== -1
        };
      }

      return {
        value: isAbsolute ? parsed.origin + parsed.pathname : parsed.pathname,
        scheme: isAbsolute ? scheme : 'relative',
        queryPresent: !!parsed.search,
        hashPresent: !!parsed.hash
      };
    } catch (error) {
      var schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(destination);
      var fallbackScheme = schemeMatch ? schemeMatch[1].toLowerCase() : '';
      if (fallbackScheme && fallbackScheme !== 'http' && fallbackScheme !== 'https') {
        return {
          value: fallbackScheme === 'mailto' || fallbackScheme === 'tel' || fallbackScheme === 'sms' || fallbackScheme === 'whatsapp' ? fallbackScheme + ':[redacted]' : 'non-http-url:[redacted]',
          scheme: fallbackScheme || 'unknown',
          queryPresent: destination.indexOf('?') !== -1,
          hashPresent: destination.indexOf('#') !== -1
        };
      }

      return {
        value: fallback,
        scheme: fallbackScheme || 'unknown',
        queryPresent: destination.indexOf('?') !== -1,
        hashPresent: destination.indexOf('#') !== -1
      };
    }
  }

  function isExternal(destination) {
    if (!destination) return false;

    try {
      var parsed = new URL(destination, window.location.href);
      return parsed.origin !== window.location.origin;
    } catch (error) {
      return false;
    }
  }

  function scrubPostHogEvent(event) {
    try {
      if (!event || !event.properties) return event;

      RAW_URL_PROPERTY_KEYS.forEach(function (key) {
        delete event.properties[key];
      });

      Object.keys(event.properties).forEach(function (key) {
        if (SAFE_URL_PROPERTY_KEYS.indexOf(key) !== -1) return;
        if (!/(url|href|referrer)/i.test(key)) return;
        if (typeof event.properties[key] !== 'string') return;
        if (event.properties[key].indexOf('?') === -1 && event.properties[key].indexOf('#') === -1) return;

        delete event.properties[key];
      });
    } catch (error) {
      if (window.console && window.console.warn) {
        window.console.warn('PostHog URL property scrub failed.', error);
      }
    }

    return event;
  }

  function getUtmValue(searchParams, key) {
    return searchParams.get(key) || '';
  }

  function getPageName() {
    var pageNode = document.querySelector ? document.querySelector('[data-ph-page]') : null;
    if (pageNode && pageNode.getAttribute('data-ph-page')) return pageNode.getAttribute('data-ph-page');

    var path = window.location.pathname || '';
    if (!path || path === '/' || /\/index\.html$/i.test(path)) return 'home';
    if (/\/contact\.html$/i.test(path)) return 'contact';

    return path.replace(/^\//, '').replace(/\.html$/i, '') || 'unknown';
  }

  function getReferringDomain() {
    if (!document.referrer) return '';

    try {
      return new URL(document.referrer).hostname;
    } catch (error) {
      return '';
    }
  }

  function getSafePageProperties(extraProperties) {
    var searchParams = new URLSearchParams(window.location.search);
    var properties = {
      product: 'studenthub',
      app: 'studenthub-landing',
      page: getPageName(),
      url_path: window.location.pathname,
      url_hash_present: !!window.location.hash,
      utm_source: getUtmValue(searchParams, 'utm_source'),
      utm_medium: getUtmValue(searchParams, 'utm_medium'),
      utm_campaign: getUtmValue(searchParams, 'utm_campaign'),
      utm_content: getUtmValue(searchParams, 'utm_content'),
      utm_term: getUtmValue(searchParams, 'utm_term'),
      referring_domain: getReferringDomain()
    };

    if (extraProperties) {
      Object.keys(extraProperties).forEach(function (key) {
        properties[key] = extraProperties[key];
      });
    }

    return properties;
  }

  function updateMaxScrollPercent() {
    try {
      var element = document.documentElement;
      var body = document.body;
      var scrollTop = window.pageYOffset || element.scrollTop || (body && body.scrollTop) || 0;
      var scrollHeight = Math.max(
        element.scrollHeight,
        body ? body.scrollHeight : 0,
        element.offsetHeight,
        body ? body.offsetHeight : 0,
        element.clientHeight
      );
      var viewportHeight = window.innerHeight || element.clientHeight || 0;
      var scrollableHeight = scrollHeight - viewportHeight;
      var scrollPercent = scrollableHeight > 0 ? Math.round((scrollTop / scrollableHeight) * 100) : 100;

      maxScrollPercent = Math.max(maxScrollPercent, Math.min(100, Math.max(0, scrollPercent)));
    } catch (error) {
      maxScrollPercent = Math.max(maxScrollPercent, 0);
    }
  }

  function captureEvent(eventName, properties) {
    try {
      if (!window.posthog || !window.posthog.capture) return;
      window.posthog.capture(eventName, properties);
    } catch (error) {
      if (window.console && window.console.warn) {
        window.console.warn('PostHog event capture failed.', error);
      }
    }
  }

  function capturePageViewed() {
    updateMaxScrollPercent();
    captureEvent(
      'landing page viewed',
      getSafePageProperties({
        max_scroll_percent: maxScrollPercent
      })
    );
  }

  function capturePageLeft() {
    if (pageLeftCaptured) return;
    pageLeftCaptured = true;
    updateMaxScrollPercent();

    captureEvent(
      'landing page left',
      getSafePageProperties({
        time_on_page_seconds: Math.max(0, Math.round((Date.now() - pageStartedAt) / 1000)),
        max_scroll_percent: maxScrollPercent
      })
    );
  }

  function captureHomepageHeroViewed() {
    if (heroViewedCaptured || getPageName() !== 'home') return;
    heroViewedCaptured = true;

    captureEvent('homepage hero viewed', getSafePageProperties());
  }

  function observeHomepageHero() {
    if (getPageName() !== 'home') return;

    var hero = document.querySelector ? document.querySelector('.heading-jumbo') : null;
    if (!hero || !window.IntersectionObserver) {
      captureHomepageHeroViewed();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        captureHomepageHeroViewed();
        observer.disconnect();
      });
    }, { threshold: 0.5 });

    observer.observe(hero);
  }

  function initializeManualEvents() {
    capturePageViewed();
    observeHomepageHero();
    window.addEventListener('scroll', updateMaxScrollPercent, { passive: true });
    window.addEventListener('pagehide', capturePageLeft);
    window.addEventListener('beforeunload', capturePageLeft);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeManualEvents);
  } else {
    initializeManualEvents();
  }

  document.addEventListener(
    'click',
    function (event) {
      try {
        var target = getTrackedTarget(event.target);
        if (!target || !window.posthog || !window.posthog.capture) return;

        var pageNode = target.closest ? target.closest('[data-ph-page]') : null;
        var destination = getDestination(target);
        var safeDestination = getSafeDestination(destination);
        var searchParams = new URLSearchParams(window.location.search);

        window.posthog.capture('landing cta clicked', {
          product: 'studenthub',
          app: 'studenthub-landing',
          page: target.getAttribute('data-ph-page') || (pageNode && pageNode.getAttribute('data-ph-page')) || 'home',
          section: target.getAttribute('data-ph-section') || '',
          cta_key: target.getAttribute('data-ph-cta-key') || '',
          cta_text: getText(target),
          destination: safeDestination.value,
          destination_scheme: safeDestination.scheme,
          destination_query_present: safeDestination.queryPresent,
          destination_hash_present: safeDestination.hashPresent,
          user_type_intent: target.getAttribute('data-ph-user-type-intent') || '',
          language: document.documentElement.lang || '',
          url_path: window.location.pathname,
          url_hash_present: !!window.location.hash,
          utm_source: getUtmValue(searchParams, 'utm_source'),
          utm_medium: getUtmValue(searchParams, 'utm_medium'),
          utm_campaign: getUtmValue(searchParams, 'utm_campaign'),
          utm_content: getUtmValue(searchParams, 'utm_content'),
          utm_term: getUtmValue(searchParams, 'utm_term'),
          is_external: isExternal(destination)
        });
      } catch (error) {
        if (window.console && window.console.warn) {
          window.console.warn('PostHog CTA capture failed.', error);
        }
      }
    },
    false
  );
})();
