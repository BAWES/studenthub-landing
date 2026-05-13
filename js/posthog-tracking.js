/**
 * StudentHub PostHog Analytics — Comprehensive CTA & Conversion Tracking
 * Project: phc_sN2BiBuMpLRVZeyLiYh2xFcJa6rrw2er6axFCFgBLCmw
 *
 * Event schema:
 *   cta_clicked      { button, section, destination }  — all link/button clicks
 *   form_submitted   { form_id, page }                  — form submissions
 *   form_started     { form_id, page }                  — first interaction with a form
 *   contact_intent   { method, value, page }            — email/phone link clicks
 *   video_played     { video_id, page }                 — video lightbox opened
 *   scroll_depth     { depth_pct, page }                — 25 / 50 / 75 / 100%
 *   nav_clicked      { label, destination }             — nav bar clicks
 */

(function () {
  'use strict';

  var PAGE = (function () {
    var p = window.location.pathname.replace(/^\//, '') || 'index.html';
    return p;
  })();

  function capture(event, props) {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, Object.assign({ page: PAGE }, props));
    }
  }

  function trackLink(selector, button, section, destination) {
    var els = document.querySelectorAll(selector);
    els.forEach(function (el) {
      el.addEventListener('click', function () {
        capture('cta_clicked', {
          button: button,
          section: section,
          destination: destination || el.getAttribute('href') || ''
        });
      });
    });
  }

  function trackLinksFromMap(containerSelector, map) {
    var container = document.querySelector(containerSelector);
    if (!container) return;
    container.querySelectorAll('a').forEach(function (el) {
      var href = el.getAttribute('href') || '';
      // strip domain for matching
      var key = href.replace(/https?:\/\/[^/]+/, '').replace(/^\//,'');
      Object.keys(map).forEach(function (pattern) {
        if (href.indexOf(pattern) !== -1) {
          el.addEventListener('click', function () {
            capture('cta_clicked', {
              button: map[pattern],
              section: 'footer',
              destination: href
            });
          });
        }
      });
    });
  }

  /* ─────────────────────────────────────────────
     SCROLL DEPTH
  ───────────────────────────────────────────── */
  function initScrollDepth() {
    var fired = {};
    var thresholds = [25, 50, 75, 100];
    function onScroll() {
      var scrolled = window.scrollY + window.innerHeight;
      var total = document.documentElement.scrollHeight;
      var pct = Math.floor((scrolled / total) * 100);
      thresholds.forEach(function (t) {
        if (pct >= t && !fired[t]) {
          fired[t] = true;
          capture('scroll_depth', { depth_pct: t });
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ─────────────────────────────────────────────
     FORM TRACKING
  ───────────────────────────────────────────── */
  function initFormTracking() {
    document.querySelectorAll('form').forEach(function (form) {
      var formId = form.id || form.name || 'unknown_form';
      var started = false;

      // first interaction = form started
      form.querySelectorAll('input, textarea, select').forEach(function (field) {
        field.addEventListener('focus', function () {
          if (!started) {
            started = true;
            capture('form_started', { form_id: formId });
          }
        }, { once: true });
      });

      // submit
      form.addEventListener('submit', function () {
        capture('form_submitted', { form_id: formId });
      });
    });
  }

  /* ─────────────────────────────────────────────
     INDEX.HTML TRACKING
  ───────────────────────────────────────────── */
  function initIndex() {
    // ── Announcement bar Discord
    trackLink('.discordannouncement', 'discord_announcement_bar', 'announcement_bar', 'https://discord.gg/CXceJWnwNT');

    // ── Hero
    trackLink('a[href="https://student.studenthub.co"].cc-jumbo-button', 'i_want_to_work', 'hero', 'https://student.studenthub.co');
    trackLink('a[href="employers/staffing.html"].cc-jumbo-button', 'i_want_to_hire', 'hero', 'employers/staffing.html');
    trackLink('.watchvideolink', 'watch_video', 'hero', 'youtube');

    // ── Community section
    trackLink('a[href="https://discord.gg/CXceJWnwNT"].cc-jumbo-button', 'discord_community', 'community', 'https://discord.gg/CXceJWnwNT');
    trackLink('a[href="https://universe.bawes.net"]', 'enter_universe', 'community', 'https://universe.bawes.net');

    // ── Job-seekers section
    trackLink('a[href="https://student.studenthub.co/"].uui-button-secondary-gray', 'student_get_started', 'jobseekers_section', 'https://student.studenthub.co/');
    trackLink('a[href="students.html"].uui-button', 'student_learn_more', 'jobseekers_section', 'students.html');

    // ── Employers section
    trackLink('a[href="employers/staffing.html"].uui-button-secondary-gray', 'employer_get_started', 'employers_section', 'employers/staffing.html');
    trackLink('a[href="employers.html"].uui-button', 'employer_learn_more', 'employers_section', 'employers.html');

    // ── Video lightbox
    var videoLink = document.querySelector('.watchvideolink');
    if (videoLink) {
      videoLink.addEventListener('click', function () {
        capture('video_played', { video_id: 'y2bWymwHjeU' });
      });
    }
  }

  /* ─────────────────────────────────────────────
     EMPLOYERS.HTML TRACKING
  ───────────────────────────────────────────── */
  function initEmployers() {
    // ── Hero
    trackLink('a.brix---btn-primary[href="contact.html"]', 'contact_us_hero', 'hero', 'contact.html');
    trackLink('a.brix---btn-secondary[href="employers/staffing.html"]', 'learn_more_hero', 'hero', 'employers/staffing.html');

    // ── Support cards
    trackLink('a.brix---card-link-center[href="contact.html"]:nth-of-type(1)', 'account_issues_email', 'support_cards', 'contact.html');
    // All 3 support cards go to contact.html — track them by text content
    document.querySelectorAll('.brix---card-link-center').forEach(function (card) {
      card.addEventListener('click', function () {
        var heading = card.querySelector('h2, h3');
        var label = heading ? heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'support_card';
        capture('cta_clicked', {
          button: label,
          section: 'support_cards',
          destination: card.getAttribute('href') || ''
        });
      });
    });

    // ── Direct contact
    trackLink('a[href="mailto:contact@studenthub.co"]', 'email_direct', 'onboarding', 'mailto:contact@studenthub.co');
    trackLink('a[href="tel:22276350"]', 'phone_direct', 'onboarding', 'tel:22276350');
  }

  /* ─────────────────────────────────────────────
     STUDENTS.HTML TRACKING
  ───────────────────────────────────────────── */
  function initStudents() {
    // ── Hero
    trackLink('a.brix---btn-primary[href="https://student.studenthub.co"]', 'get_started_hero', 'hero', 'https://student.studenthub.co');
    trackLink('a.brix---btn-secondary[href="contact.html"]', 'talk_to_us_hero', 'hero', 'contact.html');

    // ── Support cards
    document.querySelectorAll('.brix---card-link-center').forEach(function (card) {
      card.addEventListener('click', function () {
        var heading = card.querySelector('h2, h3');
        var label = heading ? heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'support_card';
        capture('cta_clicked', {
          button: label,
          section: 'support_cards',
          destination: card.getAttribute('href') || ''
        });
      });
    });

    // ── Direct contact
    trackLink('a[href="mailto:contact@studenthub.co"]', 'email_direct', 'onboarding', 'mailto:contact@studenthub.co');
    trackLink('a[href="tel:22276350"]', 'phone_direct', 'onboarding', 'tel:22276350');
  }

  /* ─────────────────────────────────────────────
     SHARED: FOOTER + NAV (all pages)
  ───────────────────────────────────────────── */
  function initFooter() {
    var footerMap = {
      'https://student.studenthub.co': 'find_work',
      'students.html':                 'get_onboarded',
      'employers.html':                'start_hiring',
      'employers/staffing.html':       'staffing',
      'employers/why-hire-students':   'why_hire_students',
      'https://blog.studenthub.co':    'blog',
      'partner-companies.html':        'partner_companies',
      'contact.html':                  'contact',
      'legal/terms-of-use':            'terms_of_use',
      'legal/privacy-policy':          'privacy_policy'
    };
    trackLinksFromMap('.footer', footerMap);

    // Social icons
    var socialMap = { 'instagram': 'instagram', 'facebook': 'facebook', 'twitter': 'twitter', 'linkedin': 'linkedin' };
    document.querySelectorAll('.footer .social-link').forEach(function (el) {
      el.addEventListener('click', function () {
        var href = el.getAttribute('href') || '';
        var platform = Object.keys(socialMap).find(function (p) { return href.indexOf(p) !== -1; }) || 'unknown';
        capture('cta_clicked', { button: 'social_' + platform, section: 'footer', destination: href });
      });
    });
  }

  function initNav() {
    document.querySelectorAll('.navbar a, .nav-menu-override a').forEach(function (el) {
      el.addEventListener('click', function () {
        capture('nav_clicked', {
          label: el.textContent.trim(),
          destination: el.getAttribute('href') || ''
        });
      });
    });
  }

  /* ─────────────────────────────────────────────
     INIT — route by page
  ───────────────────────────────────────────── */
  function init() {
    initScrollDepth();
    initFormTracking();
    initFooter();
    initNav();

    if (PAGE === '' || PAGE === 'index.html') {
      initIndex();
    } else if (PAGE.indexOf('employers') !== -1 && PAGE.indexOf('staffing') === -1) {
      initEmployers();
    } else if (PAGE.indexOf('students') !== -1) {
      initStudents();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
