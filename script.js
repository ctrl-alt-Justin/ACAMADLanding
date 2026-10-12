/**
 * ACAMAD — GSAP View-Switching & Tank Interactions
 *
 * Architecture:
 *   Two full-screen views stacked on top of each other (position: fixed).
 *   - view-hero: visible by default
 *   - view-tank: hidden behind
 *
 * UX Flow:
 *   1. "SEE WHAT WE'RE BUILDING" click →
 *      hero elements fade out & scale down, then tank fades in
 *   2. Tank shows two layers CENTERED on screen
 *   3. Click a layer →
 *      layers smoothly separate, container glides left,
 *      sublayers expand, preview slides in from right
 *   4. Click sublayer → crossfade preview image
 *   5. "BACK" or logo click → reverse, return to hero
 */

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// -------------------------------------------------------
// -------------------------------------------------------
// DOM
// -------------------------------------------------------
const viewHero        = $('#view-hero');
const viewAbout       = $('#view-about');
const viewJourney     = $('#view-journey');
const viewMovement    = $('#view-movement');
const viewTank        = $('#view-tank');
const sharedSculpture = $('#shared-sculpture');
const btnCTA          = $('#btn-see-building');
const btnBack         = $('#btn-back');
const logoLink        = $('#logo-link');
const tankCenter      = $('#tank-center');
const previewPanel    = $('#preview-panel');
const previewLabel    = $('#preview-label');
const previewImg      = $('#preview-img');
const layerDigital    = $('#layer-digital');
const layerClient     = $('#layer-client');
const tankTitle       = $('#tank-title');
const tankStage       = $('#tank-stage');
const bgParallax      = $('#bg-parallax');
const meshLeft        = $('#mesh-left');
const meshRight       = $('#mesh-right');
const bgPortalGlow    = $('#bg-portal-glow');

// -------------------------------------------------------
// State
// -------------------------------------------------------
let currentView = 'hero';   // 'hero' | 'about' | 'journey' | 'movement' | 'tank'
let activeLayer = null;     // 'digital' | 'client' | null
let isAnimating = false;

// Video playback controller
function playAllVideos() {
    $$('video').forEach(vid => {
        vid.muted = true;
        const p = vid.play();
        if (p !== undefined) p.catch(() => {});
    });
}

// Sculpture anatomical highlight box controller
function updateSculptureHighlight(viewName) {
    const boxHead = $('#box-head');
    const boxBody = $('#box-body');
    const boxTail = $('#box-tail');

    if (boxHead) boxHead.classList.toggle('active', viewName === 'about');
    if (boxBody) boxBody.classList.toggle('active', viewName === 'journey');
    if (boxTail) boxTail.classList.toggle('active', viewName === 'movement');
}

// Dynamic SVG Connector Lines for About Us
function updateAboutConnectorLines() {
    const svg = $('#about-lines-svg');
    const card = $('#about-card-dual');
    const badgeLimitless = $('#badge-limitless');
    const badgeGrowth = $('#badge-growth');
    const badgeZeal = $('#badge-zeal');
    const frameBottom = $('#about-frame-bottom');
    const boxHead = $('#box-head');

    if (!svg || !card || !badgeLimitless || !badgeGrowth || !badgeZeal || !frameBottom || !boxHead) return;

    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) return;

    const cardRect = card.getBoundingClientRect();
    const lRect = badgeLimitless.getBoundingClientRect();
    const gRect = badgeGrowth.getBoundingClientRect();
    const zRect = badgeZeal.getBoundingClientRect();
    const frameRect = frameBottom.getBoundingClientRect();
    const headRect = boxHead.getBoundingClientRect();

    // 1. Line from WHO WE ARE card to Limitless badge
    const lineCardToLim = $('#line-card-to-limitless');
    if (lineCardToLim) {
        lineCardToLim.setAttribute('x1', Math.round(cardRect.right - svgRect.left));
        lineCardToLim.setAttribute('y1', Math.round((cardRect.bottom - 24) - svgRect.top));
        lineCardToLim.setAttribute('x2', Math.round(lRect.left - svgRect.left));
        lineCardToLim.setAttribute('y2', Math.round((lRect.top + lRect.height / 2) - svgRect.top));
    }

    // 2. Stepped polyline connecting bottom of Limitless -> Growth -> Zeal
    const poly = $('#polyline-stepped-badges');
    if (poly) {
        const p1x = Math.round(lRect.left - svgRect.left);
        const p1y = Math.round(lRect.bottom - svgRect.top);
        const p2x = Math.round(lRect.right - svgRect.left);
        const p2y = Math.round(lRect.bottom - svgRect.top);

        const p3x = Math.round(gRect.left - svgRect.left);
        const p3y = Math.round(gRect.bottom - svgRect.top);
        const p4x = Math.round(gRect.right - svgRect.left);
        const p4y = Math.round(gRect.bottom - svgRect.top);

        const p5x = Math.round(zRect.left - svgRect.left);
        const p5y = Math.round(zRect.bottom - svgRect.top);
        const p6x = Math.round(zRect.right - svgRect.left);
        const p6y = Math.round(zRect.bottom - svgRect.top);

        poly.setAttribute('points', `${p1x},${p1y} ${p2x},${p2y} ${p2x},${p3y} ${p4x},${p3y} ${p4x},${p5y} ${p6x},${p5y}`);
    }

    // 3. Line from Limitless to bottom-left corner of ABOUT US head box
    // Stops right at the outer corner — never penetrates inside the box!
    const lineToHead = $('#line-limitless-to-head');
    if (lineToHead) {
        lineToHead.setAttribute('x1', Math.round((lRect.left + 24) - svgRect.left));
        lineToHead.setAttribute('y1', Math.round(lRect.top - svgRect.top));
        lineToHead.setAttribute('x2', Math.round(headRect.left - svgRect.left));
        lineToHead.setAttribute('y2', Math.round(headRect.bottom - svgRect.top));
    }

    // 4. Lines connecting badges to runner frame
    const lineToRunner1 = $('#line-badges-to-runner-1');
    if (lineToRunner1) {
        lineToRunner1.setAttribute('x1', Math.round(gRect.right - svgRect.left));
        lineToRunner1.setAttribute('y1', Math.round((gRect.top + gRect.height / 2) - svgRect.top));
        lineToRunner1.setAttribute('x2', Math.round(frameRect.left - svgRect.left));
        lineToRunner1.setAttribute('y2', Math.round((frameRect.top + frameRect.height * 0.35) - svgRect.top));
    }

    const lineToRunner2 = $('#line-badges-to-runner-2');
    if (lineToRunner2) {
        lineToRunner2.setAttribute('x1', Math.round(zRect.right - svgRect.left));
        lineToRunner2.setAttribute('y1', Math.round((zRect.top + zRect.height / 2) - svgRect.top));
        lineToRunner2.setAttribute('x2', Math.round(frameRect.left - svgRect.left));
        lineToRunner2.setAttribute('y2', Math.round((frameRect.bottom - 20) - svgRect.top));
    }
}

// -------------------------------------------------------
// Techy Hacker Typewriter Effect for Backstage Log
// -------------------------------------------------------
let typewriterTimers = [];
function runHackerTypewriter() {
    const titleEl = $('#hacker-log-title');
    const msgEl = $('#hacker-log-msg');
    const cursorEl = $('#hacker-cursor');
    if (!titleEl || !msgEl) return;

    typewriterTimers.forEach(t => clearInterval(t));
    typewriterTimers = [];

    const fullTitle = "[?] Presence of a backstage guy detected";
    const fullMsg = 'Message: "Where Legacy Starts With Vision"';
    const scrambleChars = '!<>-_\\/[]{}—=+*^?#________';

    titleEl.textContent = '';
    msgEl.textContent = '';
    if (cursorEl) cursorEl.style.display = 'inline-block';

    let tIndex = 0;
    const titleTimer = setInterval(() => {
        if (tIndex <= fullTitle.length) {
            const confirmed = fullTitle.substring(0, tIndex);
            const glitch = (tIndex < fullTitle.length) ? scrambleChars[Math.floor(Math.random() * scrambleChars.length)] : '';
            titleEl.textContent = confirmed + glitch;
            tIndex++;
        } else {
            clearInterval(titleTimer);
            titleEl.textContent = fullTitle;

            // Start typing message
            let mIndex = 0;
            const msgTimer = setInterval(() => {
                if (mIndex <= fullMsg.length) {
                    const confirmed = fullMsg.substring(0, mIndex);
                    const glitch = (mIndex < fullMsg.length) ? scrambleChars[Math.floor(Math.random() * scrambleChars.length)] : '';
                    msgEl.textContent = confirmed + glitch;
                    mIndex++;
                } else {
                    clearInterval(msgTimer);
                    msgEl.textContent = fullMsg;
                }
            }, 28);
            typewriterTimers.push(msgTimer);
        }
    }, 24);
    typewriterTimers.push(titleTimer);
}

// -------------------------------------------------------
// -------------------------------------------------------
// Home Page Scroll Parallax & Inertial Momentum Glide
// -------------------------------------------------------
function initHomeScrollParallax() {
    const viewHero        = $('#view-hero');
    const problemSec      = $('#home-problem-section');
    const problemContent  = $('#problem-center-content');
    const watermarkBrand  = $('#watermark-brand-bg');
    const alliancesBand   = $('#problem-alliances-band');
    const problemAmbient  = $('.home-problem-ambient');
    const heroText        = $('#hero-text');
    const scrollCue       = $('#hero-scroll-cue');
    const btnProblemConsultation = $('#btn-problem-consultation');
    const meshPatterns    = $$('.mesh-pattern');
    const bgDeepBase      = $('.bg-deep-base');
    const bgDynamicCanvas = $('#bg-dynamic-canvas');

    if (!viewHero) return;

    // Synchronous Parallax Frame Renderer (updates text, logo, and background in sync)
    function renderParallax(scrollY) {
        const maxScroll = viewHero.scrollHeight - viewHero.clientHeight;
        const progress = maxScroll > 0 ? scrollY / maxScroll : 0;

        // 1. Hero Text moves noticeably FASTER (1.30x effective speed) to emphasize foreground parallax
        if (heroText) {
            gsap.set(heroText, {
                y: -scrollY * 0.30,
            });
        }

        // 2. 3D Logo stays STUCK to Section 1 without fading, moving in sync with the hero
        if (sharedSculpture) {
            gsap.set(sharedSculpture, {
                y: -scrollY - (scrollY * 0.15),
                opacity: 1,
                scale: 1,
            });
        }

        // 3. Dark Pattern in Background moves MUCH SLOWER (0.12x speed)
        // Foreground text (1.30x) vs Background pattern (0.12x) creates a dramatic 10:1 parallax contrast!
        if (meshPatterns.length) {
            gsap.set(meshPatterns, {
                y: -scrollY * 0.12,
            });
        }
        if (bgDeepBase) {
            gsap.set(bgDeepBase, {
                y: -scrollY * 0.12,
            });
        }
        if (bgDynamicCanvas) {
            gsap.set(bgDynamicCanvas, {
                y: -scrollY * 0.12,
            });
        }

        // 4. Subtle ambient glow depth layer
        if (bgPortalGlow) {
            gsap.set(bgPortalGlow, {
                y: -scrollY * 0.08,
                opacity: 0.25 + progress * 0.22,
            });
        }

        // 5. Section 2 (Problem) text floats into view with enhanced foreground speed
        if (problemContent) {
            gsap.set(problemContent, {
                y: (1 - progress) * 60,
                x: 0,
                rotationX: 0,
                rotationY: 0,
            });
        }

        // 6. Watermark subtle scroll drift across the bottom
        if (watermarkBrand) {
            gsap.set(watermarkBrand, {
                x: (progress - 0.5) * 60,
                y: 0,
            });
        }
    }

    // -------------------------------------------------------
    // Luxurious Inertial Momentum Scroller ("Slidy, Smooth & Slightly Slower")
    // -------------------------------------------------------
    let currentScroll = 0;
    let targetScroll = 0;
    let isLerping = false;
    let rafId = null;
    const lerpDamping = 0.075;     // Buttery smooth exponential damping
    const speedScale  = 0.65;      // Slightly slower wheel multiplier (65% speed) for measured, dignified control

    function updateLerp() {
        if (currentView !== 'hero') {
            isLerping = false;
            return;
        }

        const diff = targetScroll - currentScroll;
        if (Math.abs(diff) > 0.25) {
            currentScroll += diff * lerpDamping;
            viewHero.scrollTop = currentScroll;
            renderParallax(currentScroll);
            rafId = requestAnimationFrame(updateLerp);
        } else {
            currentScroll = targetScroll;
            viewHero.scrollTop = currentScroll;
            renderParallax(currentScroll);
            isLerping = false;
        }
    }

    function triggerLerp() {
        if (!isLerping) {
            isLerping = true;
            rafId = requestAnimationFrame(updateLerp);
        }
    }

    // Intercept mouse wheel on hero view to replace harsh notched jumps with silky momentum glide
    window.addEventListener('wheel', (e) => {
        if (currentView !== 'hero') return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
        if (e.target?.closest('.consultation-modal')) return;

        e.preventDefault();

        const maxScroll = viewHero.scrollHeight - viewHero.clientHeight;
        if (maxScroll <= 0) return;

        // Controlled, slightly slower input accumulation
        const delta = e.deltaY * speedScale;
        targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + delta));

        triggerLerp();
    }, { passive: false });

    // Fallback sync for native drag, scrollbar or touch interactions
    viewHero.addEventListener('scroll', () => {
        if (currentView !== 'hero') return;
        if (!isLerping) {
            currentScroll = viewHero.scrollTop;
            targetScroll = viewHero.scrollTop;
            renderParallax(currentScroll);
        }
    }, { passive: true });

    // Smooth keyboard scrolling (Arrow keys, PageUp/Down, Space)
    window.addEventListener('keydown', (e) => {
        if (currentView !== 'hero') return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        const maxScroll = viewHero.scrollHeight - viewHero.clientHeight;
        if (maxScroll <= 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            targetScroll = Math.min(maxScroll, targetScroll + 75);
            triggerLerp();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            targetScroll = Math.max(0, targetScroll - 75);
            triggerLerp();
        } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
            e.preventDefault();
            targetScroll = Math.min(maxScroll, targetScroll + window.innerHeight * 0.75);
            triggerLerp();
        } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
            e.preventDefault();
            targetScroll = Math.max(0, targetScroll - window.innerHeight * 0.75);
            triggerLerp();
        }
    });



    // 3. Smooth scroll cue trigger
    if (scrollCue && problemSec) {
        scrollCue.addEventListener('click', () => {
            targetScroll = problemSec.offsetTop;
            triggerLerp();
        });
    }

    // 4. Connect consultation button in Problem section to the modal
    if (btnProblemConsultation) {
        btnProblemConsultation.addEventListener('click', () => {
            if (window.openConsultationModal) {
                window.openConsultationModal('Client-Based Solutions');
            }
        });
    }

    // Expose reset / jump helper for view transitions
    window.resetHeroSmoothScroll = () => {
        targetScroll = 0;
        currentScroll = 0;
        if (rafId) cancelAnimationFrame(rafId);
        isLerping = false;
        viewHero.scrollTop = 0;
        gsap.set(['#view-hero', '#hero-text', '.title-line', '.hero-description', '.btn-cta'], {
            filter: 'none',
            clearProps: 'filter',
        });
        if (alliancesBand) gsap.set(alliancesBand, { x: 0, y: 0 });
        if (problemAmbient) problemAmbient.style.background = 'radial-gradient(ellipse 75% 55% at 50% 40%, rgba(30, 44, 12, 0.45) 0%, rgba(14, 20, 4, 0) 75%)';
        renderParallax(0);
    };
}

// -------------------------------------------------------
// Init
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    animateHeroEntrance();
    initNavigation();
    initMobileNav();
    initTankParticles();
    initMovementDropdown();
    initConsultationModal();
    initHomeScrollParallax();
    initBackgroundDynamic();
    playAllVideos();
    updateSculptureHighlight(currentView);
    document.addEventListener('click', playAllVideos, { once: true });
    window.addEventListener('resize', updateAboutConnectorLines);
    setTimeout(updateAboutConnectorLines, 100);

    btnCTA.addEventListener('click', () => navigateToView('tank'));
    btnBack.addEventListener('click', () => navigateToView('hero'));
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToView('hero');
    });

    // Layer toggles
    $$('.layer-toggle').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isAnimating) return;
            const layer = el.closest('.tank-layer');
            const target = layer.dataset.layer;
            if (activeLayer === target) {
                collapseLayer();
            } else if (activeLayer) {
                swapLayer(target);
            } else {
                expandLayer(target);
            }
        });
    });

    // Sublayer clicks
    $$('.sublayer-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            switchPreview(item);
        });
    });

    // Clickable sculpture anatomical parts (Head -> About Us, Body -> Our Journey, Tail -> Our Movement)
    $$('.sculpture-box').forEach(box => {
        const handleActivate = () => {
            const targetView = box.dataset.view;
            if (targetView && typeof navigateToView === 'function') {
                navigateToView(targetView);
            }
        };

        box.addEventListener('click', (e) => {
            e.stopPropagation();
            handleActivate();
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActivate();
            }
        });
    });
});

// -------------------------------------------------------
// -------------------------------------------------------
// Navigation Controller
// -------------------------------------------------------
function initNavigation() {
    $$('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.dataset.view;
            if (targetView) {
                window.location.hash = targetView;
                navigateToView(targetView);
            }
        });
    });

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '').toLowerCase();
        if (hash && ['about', 'journey', 'movement', 'tank', 'hero'].includes(hash)) {
            navigateToView(hash);
        }
    });

    // Check initial hash on load
    const initialHash = window.location.hash.replace('#', '').toLowerCase();
    if (initialHash && ['about', 'journey', 'movement', 'tank'].includes(initialHash)) {
        setTimeout(() => navigateToView(initialHash, true), 80);
    }
}

function navigateToView(targetView, isImmediate = false) {
    if (isAnimating && !isImmediate) return;
    if (currentView === targetView && !isImmediate) return;

    // Update active nav-link highlighting
    $$('.nav-link').forEach(link => {
        if (link.dataset.view === targetView) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Toggle BOOK A CONSULTATION green fill on inner pages
    const btnConsultation = $('#btn-consultation');
    if (btnConsultation) {
        const innerPages = ['about', 'journey', 'movement', 'tank'];
        if (innerPages.includes(targetView)) {
            btnConsultation.classList.add('btn-consultation--active');
        } else {
            btnConsultation.classList.remove('btn-consultation--active');
        }
    }

    if (isImmediate) {
        // Immediate switch without transition delays
        $$('.view').forEach(v => {
            v.classList.remove('active');
            gsap.set(v, { visibility: 'hidden', opacity: 0 });
        });
        const toEl = $(`#view-${targetView}`);
        if (toEl) {
            toEl.classList.add('active');
            gsap.set(toEl, { visibility: 'visible', opacity: 1, y: 0, filter: 'none', clearProps: 'filter' });
        }
        if (targetView === 'tank') {
            gsap.set(meshLeft, { xPercent: -105 });
            gsap.set(meshRight, { xPercent: 105 });
            gsap.set(sharedSculpture, { opacity: 0 });
            gsap.set(bgParallax, { scale: 1.38 });
            gsap.set('#tank-focal-pattern', { opacity: 1 });
            gsap.set('.tank-title, .tank-layer, .tank-roof-frame', { opacity: 1, y: 0, scale: 1 });
            gsap.set(btnBack, { visibility: 'visible', opacity: 1 });
        } else {
            gsap.set(meshLeft, { xPercent: 0 });
            gsap.set(meshRight, { xPercent: 0 });
            gsap.set(sharedSculpture, { opacity: 1, scale: 1, filter: 'none', clearProps: 'filter' });
            gsap.set(bgParallax, { scale: 1 });
            if (targetView === 'about') {
                runHackerTypewriter();
            }
        }
        updateSculptureHighlight(targetView);
        if (targetView === 'about') setTimeout(updateAboutConnectorLines, 50);
        playAllVideos();
        currentView = targetView;
        return;
    }

    // Switching to Innovation Tank
    if (targetView === 'tank') {
        transitionToTank();
        return;
    }

    // Leaving Innovation Tank
    if (currentView === 'tank') {
        leaveTankTo(targetView);
        return;
    }

    // Direct transition between non-tank views (hero, about, journey, movement)
    switchBetweenStandardViews(currentView, targetView);
}

// -------------------------------------------------------
// Hero entrance animation
// -------------------------------------------------------
function animateHeroEntrance() {
    const video = $('#hero-logo-video');
    if (video) video.play().catch(() => {});

    gsap.set(['.title-line', '.hero-description', '.btn-cta'], { opacity: 0, y: 30 });
    gsap.set(sharedSculpture, { opacity: 0, scale: 0.92, x: 20 });
    gsap.set(bgParallax, { scale: 1 });

    const tl = gsap.timeline({ delay: 0.08, defaults: { ease: 'power3.out' } });

    tl.to('.title-line', {
        opacity: 1, y: 0, duration: 0.6,
        stagger: 0.1,
    })
    .to('.hero-description', { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    .to('.btn-cta', { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
    .to(sharedSculpture, {
        opacity: 1, scale: 1, x: 0, duration: 0.9,
        ease: 'power3.out',
    }, 0.15);
}

// -------------------------------------------------------
// Mobile nav
// -------------------------------------------------------
function initMobileNav() {
    const toggle = $('#mobile-menu-toggle');
    const links  = $('#nav-links');
    if (toggle) {
        toggle.addEventListener('click', () => links.classList.toggle('open'));
    }
    $$('.nav-link').forEach(l =>
        l.addEventListener('click', () => links.classList.remove('open'))
    );
}

// -------------------------------------------------------
// SWITCH BETWEEN STANDARD VIEWS (Hero, About, Journey, Movement)
// -------------------------------------------------------
function switchBetweenStandardViews(fromView, toView) {
    isAnimating = true;
    const fromEl = $(`#view-${fromView}`);
    const toEl   = $(`#view-${toView}`);

    updateSculptureHighlight(toView);

    const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
            if (fromEl) {
                fromEl.classList.remove('active');
                gsap.set(fromEl, { visibility: 'hidden', opacity: 0 });
            }
            if (toEl) {
                toEl.classList.add('active');
            }
            playAllVideos();
            currentView = toView;
            if (toView === 'about') updateAboutConnectorLines();
            isAnimating = false;
        }
    });

    // Ensure shared sculpture stays fully crisp and visible at resting position
    tl.to(sharedSculpture, {
        opacity: 1,
        y: 0,
        filter: 'none',
        duration: 0.4,
        ease: 'power2.out',
    }, 0.1);

    if (fromView === 'hero') {
        const heroText = $('#hero-text');
        if (heroText) {
            tl.to(heroText, { y: 0, duration: 0.4, ease: 'power2.out' }, 0);
        }
        const problemContent = $('#problem-center-content');
        if (problemContent) {
            tl.to(problemContent, { y: 0, duration: 0.4, ease: 'power2.out' }, 0);
        }
        const meshPatterns = $$('.mesh-pattern');
        if (meshPatterns.length) {
            tl.to(meshPatterns, { y: 0, duration: 0.4, ease: 'power2.out' }, 0);
        }
        const bgDeepBase = $('.bg-deep-base');
        if (bgDeepBase) {
            tl.to(bgDeepBase, { y: 0, duration: 0.4, ease: 'power2.out' }, 0);
        }
    }

    // 1. Fade out current view elements
    if (fromEl) {
        tl.to(fromEl, {
            opacity: 0,
            y: -15,
            duration: 0.32,
            ease: 'power2.in',
            clearProps: 'filter',
        }, 0);
    }

    // 2. Fade in target view container
    if (toEl) {
        tl.set(toEl, { visibility: 'visible', opacity: 0, y: 15, zIndex: 10, filter: 'none', clearProps: 'filter' }, 0.22)
          .to(toEl, {
              opacity: 1,
              y: 0,
              filter: 'none',
              clearProps: 'filter',
              duration: 0.45,
              ease: 'power2.out',
          }, 0.24);

        // Targeted entrance animations
        if (toView === 'about') {
            tl.call(updateAboutConnectorLines, null, 0.24)
              .call(runHackerTypewriter, null, 0.3)
              .fromTo('#view-about .card-dual', 
                { opacity: 0, x: -35 }, 
                { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, 0.28)
              .fromTo('#view-about .founder-backstage-log', 
                { opacity: 0, y: 20 }, 
                { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.38)
              .fromTo('#view-about .about-lines-svg', 
                { opacity: 0 }, 
                { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.32)
              .fromTo('#view-about .about-frame-bottom', 
                { opacity: 0, scale: 0.95 }, 
                { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' }, 0.36)
              .fromTo('#view-about .step-badge', 
                { opacity: 0, y: 15 }, 
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', onComplete: updateAboutConnectorLines }, 0.4);
        } else if (toView === 'journey') {
            tl.fromTo('#view-journey .gallery-photo-card', 
                { opacity: 0, y: -20, scale: 0.95 }, 
                { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.04, ease: 'power3.out' }, 0.28)
              .fromTo('#view-journey .card-seamless-story', 
                { opacity: 0, x: -35 }, 
                { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, 0.35);
        } else if (toView === 'movement') {
            tl.fromTo('#view-movement .card-seamless-services', 
                { opacity: 0, x: -35 }, 
                { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, 0.28);
        } else if (toView === 'hero') {
            gsap.set(['#view-hero', '#hero-text', '.title-line', '.hero-description', '.btn-cta'], {
                filter: 'none',
                clearProps: 'filter'
            });
            if (window.resetHeroSmoothScroll) {
                window.resetHeroSmoothScroll();
            } else {
                const heroScrollEl = $('#view-hero');
                if (heroScrollEl) {
                    heroScrollEl.scrollTo({ top: 0, behavior: 'instant' });
                }
            }
            if (sharedSculpture) {
                gsap.set(sharedSculpture, { y: 0, opacity: 1, scale: 1, filter: 'none', clearProps: 'filter' });
            }
            if (bgParallax) {
                gsap.set(bgParallax, { y: 0, scale: 1 });
            }
            if (bgPortalGlow) {
                gsap.set(bgPortalGlow, { y: 0, opacity: 0.25 });
            }
            const meshPatterns = $$('.mesh-pattern');
            if (meshPatterns.length) {
                gsap.set(meshPatterns, { y: 0 });
            }
            const bgDeepBase = $('.bg-deep-base');
            if (bgDeepBase) {
                gsap.set(bgDeepBase, { y: 0 });
            }
            const bgDynamicCanvas = $('#bg-dynamic-canvas');
            if (bgDynamicCanvas) {
                gsap.set(bgDynamicCanvas, { y: 0, opacity: 1 });
            }
            const heroText = $('#hero-text');
            if (heroText) {
                gsap.set(heroText, { y: 0, filter: 'none', clearProps: 'filter' });
            }
            const problemContent = $('#problem-center-content');
            if (problemContent) {
                gsap.set(problemContent, { y: 0, filter: 'none', clearProps: 'filter' });
            }
            tl.fromTo('#view-hero .title-line', 
                { opacity: 0, y: 30, filter: 'none', clearProps: 'filter' }, 
                { opacity: 1, y: 0, filter: 'none', clearProps: 'filter', duration: 0.55, stagger: 0.08, ease: 'power3.out' }, 0.28)
              .fromTo('#view-hero .hero-description', 
                { opacity: 0, y: 20, filter: 'none', clearProps: 'filter' }, 
                { opacity: 1, y: 0, filter: 'none', clearProps: 'filter', duration: 0.45, ease: 'power3.out' }, 0.38)
              .fromTo('#view-hero .btn-cta', 
                { opacity: 0, y: 20, filter: 'none', clearProps: 'filter' }, 
                { opacity: 1, y: 0, filter: 'none', clearProps: 'filter', duration: 0.45, ease: 'power3.out' }, 0.42);
        }
    }
}

// -------------------------------------------------------
// VIEW TRANSITION: Current View → Tank (4-Step Parting Mesh Portal)
// -------------------------------------------------------
function transitionToTank() {
    if (isAnimating || currentView === 'tank') return;
    isAnimating = true;
    updateSculptureHighlight('tank');

    const activeViewEl = $(`#view-${currentView}`);

    const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
            isAnimating = false;
            if (activeViewEl) {
                activeViewEl.classList.remove('active');
                gsap.set(activeViewEl, { visibility: 'hidden' });
            }
            viewTank.classList.add('active');
            currentView = 'tank';
        },
    });

    // ===================================================
    // STEP 1: Element fade with slow zoom in (0.0s – 0.9s)
    // ===================================================
    if (activeViewEl) {
        tl.to(activeViewEl, {
            opacity: 0,
            y: -25,
            scale: 1.04,
            duration: 0.7,
            ease: 'power2.inOut',
            clearProps: 'filter',
        }, 0);
    }

    tl.to(sharedSculpture, {
        opacity: 0,
        scale: 1.12,
        x: 40,
        duration: 0.75,
        ease: 'power2.inOut',
        clearProps: 'filter',
    }, 0.05)
    .to(bgParallax, {
        scale: 1.1,
        duration: 0.9,
        ease: 'sine.inOut',
    }, 0)

    // ===================================================
    // STEP 2: Mesh Part (0.9s – 2.0s)
    // ===================================================
    .to('.mesh-edge', {
        opacity: 1,
        duration: 0.3,
    }, 0.85)
    .to(meshLeft, {
        xPercent: -105,
        rotationY: -10,
        duration: 1.25,
        ease: 'power3.inOut',
    }, 0.95)
    .to(meshRight, {
        xPercent: 105,
        rotationY: 10,
        duration: 1.25,
        ease: 'power3.inOut',
    }, 0.95)
    .to('#bg-dynamic-canvas', {
        opacity: 0,
        duration: 0.8,
    }, 0.85)
    .to('.mesh-edge', {
        opacity: 0.2,
        duration: 0.6,
    }, 1.45)

    // ===================================================
    // STEP 3: Enter the Innovation Part (1.2s – 2.3s)
    // ===================================================
    .to(bgParallax, {
        scale: 1.38,
        duration: 1.15,
        ease: 'power2.inOut',
    }, 1.15)
    .to(bgPortalGlow, {
        scale: 1.4,
        opacity: 0.45,
        duration: 1.15,
        ease: 'power2.inOut',
    }, 1.15)

    // ===================================================
    // STEP 4: Elements fade in (2.0s – 2.9s)
    // ===================================================
    .set(viewTank, { visibility: 'visible', opacity: 1, zIndex: 15 }, 1.8)
    .set(['.tank-title', '.tank-layer', '.tank-roof-frame', '#tank-focal-pattern'], { opacity: 0, y: 35, scale: 0.92, filter: 'blur(5px)' }, 1.8)
    .set(btnBack, { visibility: 'visible', opacity: 0, y: 20 }, 1.8)

    // Focal pattern emerges behind the tank, guiding focus to center
    .to('#tank-focal-pattern', {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power3.out',
    }, 1.95)

    // Title glides forward from depth into focus
    .to('.tank-title', {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'power3.out',
    }, 2.0)

    // Innovation roof and layers glide forward into crisp focus (zoom-in portal entrance)
    .to('.tank-roof-frame, .tank-layer', {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
    }, 2.1)

    // Back button settles in
    .to(btnBack, {
        opacity: 1,
        y: 0,
        duration: 0.55,
    }, 2.45);
}

// -------------------------------------------------------
// VIEW TRANSITION: Tank → Target View (Reverse: Reseal Mesh)
// -------------------------------------------------------
function leaveTankTo(targetView = 'hero') {
    if (isAnimating) return;
    isAnimating = true;

    // If a layer is open, collapse first, then transition
    if (activeLayer) {
        collapseLayer(() => doLeaveTankTo(targetView));
    } else {
        doLeaveTankTo(targetView);
    }
}

function doLeaveTankTo(targetView) {
    const toEl = $(`#view-${targetView}`);

    const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
            viewTank.classList.remove('active');
            gsap.set(viewTank, { visibility: 'hidden', zIndex: 5 });
            gsap.set(btnBack, { visibility: 'hidden', opacity: 0 });
            gsap.set('.mesh-edge', { opacity: 0 });
            if (toEl) {
                toEl.classList.add('active');
            }
            updateSculptureHighlight(targetView);
            if (targetView === 'hero') {
                const heroScrollEl = $('#view-hero');
                if (heroScrollEl) {
                    heroScrollEl.scrollTo({ top: 0, behavior: 'instant' });
                }
            }
            if (targetView === 'about') setTimeout(updateAboutConnectorLines, 50);
            playAllVideos();
            isAnimating = false;
            currentView = targetView;
        },
    });

    // 1. Innovation Tank elements pull back into depth
    tl.to(btnBack, {
        opacity: 0, y: 15, duration: 0.25,
    }, 0)
    .to(['.tank-title', '.tank-layer', '.tank-roof-frame', '#tank-focal-pattern'], {
        opacity: 0,
        y: 25,
        scale: 0.92,
        filter: 'blur(4px)',
        duration: 0.45,
        stagger: 0.04,
    }, 0)
    .to(viewTank, {
        opacity: 0,
        duration: 0.35,
    }, 0.3)

    // 2. Camera pulls back out
    .to(bgParallax, {
        scale: 1,
        duration: 1.15,
        ease: 'power2.inOut',
    }, 0.3)
    .to(bgPortalGlow, {
        scale: 1,
        opacity: 0.25,
        duration: 1.15,
        ease: 'power2.inOut',
    }, 0.3)

    // 3. Mesh panels glide back and seal in the center
    .to('.mesh-edge', {
        opacity: 0.8,
        duration: 0.3,
    }, 0.4)
    .to([meshLeft, meshRight], {
        xPercent: 0,
        rotationY: 0,
        duration: 1.1,
        ease: 'power3.inOut',
    }, 0.35)
    .to('.mesh-edge', {
        opacity: 0,
        duration: 0.4,
    }, 1.25)
    .to('#bg-dynamic-canvas', {
        opacity: 1,
        duration: 0.8,
    }, 0.8)

    // 4. Shared logo video sculpture returns
    tl.to(sharedSculpture, {
        opacity: 1,
        scale: 1,
        x: 0,
        filter: 'none',
        duration: 0.8,
        ease: 'power3.out',
    }, 0.8);

    // 5. Target view emerges
    if (toEl) {
        tl.set(toEl, { visibility: 'visible', opacity: 0, y: 20, zIndex: 10, filter: 'none', clearProps: 'filter' }, 0.85)
          .to(toEl, {
              opacity: 1,
              y: 0,
              filter: 'none',
              clearProps: 'filter',
              duration: 0.7,
              ease: 'power3.out',
          }, 0.9);
    }
}

// -------------------------------------------------------
// OUR MOVEMENT: Services Interactive Dropdown
// -------------------------------------------------------
function initMovementDropdown() {
    const trigger = $('#dropdown-trigger');
    const menu    = $('#dropdown-menu-list');
    const label   = $('.dropdown-selected-label');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    $$('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const serviceName = item.dataset.service;
            if (label) label.textContent = serviceName;
            menu.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');

            // Open consultation modal pre-selected to this service
            if (window.openConsultationModal) {
                window.openConsultationModal(serviceName);
            }
        });
    });

    document.addEventListener('click', () => {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    });
}

// -------------------------------------------------------
// CONSULTATION MODAL CONTROLLER
// -------------------------------------------------------
function initConsultationModal() {
    const modal         = $('#consultation-modal');
    const openBtn       = $('#btn-consultation');
    const closeBtn      = $('#modal-close');
    const backdrop      = $('#modal-backdrop');
    const form          = $('#consultation-form');
    const status        = $('#form-status');
    const serviceSelect = $('#form-service');

    if (!modal) return;

    window.openConsultationModal = (service) => {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        if (service && serviceSelect) {
            for (let opt of serviceSelect.options) {
                if (opt.text.toLowerCase().includes(service.toLowerCase()) || 
                    service.toLowerCase().includes(opt.text.toLowerCase())) {
                    serviceSelect.value = opt.value;
                    break;
                }
            }
        }
    };

    const closeModal = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        if (status) status.textContent = '';
    };

    if (openBtn) openBtn.addEventListener('click', () => window.openConsultationModal());
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('#form-name').value;
            status.textContent = `Thank you, ${name}. Request received. Our engineering lead will contact you promptly.`;
            status.style.color = '#beea64';
            setTimeout(() => {
                closeModal();
                form.reset();
            }, 2500);
        });
    }
}

// -------------------------------------------------------
// EXPAND LAYER (center → left, reveal sublayers + preview)
// -------------------------------------------------------
function expandLayer(layerName) {
    isAnimating = true;
    activeLayer = layerName;

    const openLayer     = layerName === 'digital' ? layerDigital : layerClient;
    const otherLayer    = layerName === 'digital' ? layerClient : layerDigital;
    const sublayers     = openLayer.querySelector('.layer-sublayers');
    const arrow         = openLayer.querySelector('.toggle-arrow');
    const sublayerItems = sublayers.querySelectorAll('.sublayer-item');
    const firstItem     = sublayers.querySelector('.sublayer-item');

    // Add zoom class to the active layer
    openLayer.classList.add('layer-zoomed');
    otherLayer.classList.remove('layer-zoomed');

    // Measure natural height of sublayers
    gsap.set(sublayers, { height: 'auto', opacity: 1 });
    const naturalH = sublayers.offsetHeight;
    gsap.set(sublayers, { height: 0, opacity: 0 });

    // Calculate layout shift so tank + preview are symmetrically placed
    const stageW = tankStage.offsetWidth;
    const tankW = 520;
    const previewW = 440;
    const gap = 50;
    const totalW = tankW + gap + previewW;
    const leftEdge = Math.max(0, (stageW - totalW) / 2);
    const currentLeft = (stageW - tankW) / 2;
    const shiftX = leftEdge - currentLeft;

    // Prepare preview data before reveal so there is zero flicker
    $$('.sublayer-item').forEach(s => s.classList.remove('active'));
    if (firstItem) {
        firstItem.classList.add('active');
        previewLabel.textContent = firstItem.dataset.label;
        previewImg.src = firstItem.dataset.img;
    }
    gsap.set(previewImg, { opacity: 0.95, scale: 1 });
    gsap.set(previewLabel, { opacity: 1, y: 0 });

    // Position preview panel symmetrically
    gsap.set(previewPanel, {
        right: Math.max(0, leftEdge),
        x: 60,
        opacity: 0,
        visibility: 'hidden'
    });

    const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
            isAnimating = false;
        },
    });

    tl
        // 0. Slight title lift (transform only, no layout change)
        .to(tankTitle, { y: -15, duration: 0.5 }, 0)

        // 1. Maintain close gap
        .to(tankCenter, { gap: 14, duration: 0.3 }, 0)

        // 2. Slide tank container to the left (no zoom-in scaling)
        .to(tankCenter, { x: shiftX, duration: 0.7 }, 0.05)

        // 3. Rotate arrow open
        .to(arrow, { rotation: 180, duration: 0.4, ease: 'power2.out' }, 0)

        // 4. Expand sublayers container
        .to(sublayers, { height: naturalH, opacity: 1, duration: 0.55 }, 0.2)

        // 5. Stagger each sublayer item in
        .fromTo(sublayerItems,
            { x: -25, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
            0.35
        )

        // 6. Slide in preview panel from the right
        .to(previewPanel, {
            visibility: 'visible',
            opacity: 1,
            x: 0,
            duration: 0.65,
            ease: 'power2.out',
        }, 0.35);
}

// -------------------------------------------------------
// COLLAPSE LAYER (back to centered)
// -------------------------------------------------------
function collapseLayer(onComplete) {
    if (!activeLayer) { if (onComplete) onComplete(); return; }
    isAnimating = true;

    const openLayer     = activeLayer === 'digital' ? layerDigital : layerClient;
    const sublayers     = openLayer.querySelector('.layer-sublayers');
    const arrow         = openLayer.querySelector('.toggle-arrow');
    const sublayerItems = sublayers.querySelectorAll('.sublayer-item');

    // Clear active sublayer highlight
    $$('.sublayer-item').forEach(s => s.classList.remove('active'));

    const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
            activeLayer = null;
            isAnimating = false;
            gsap.set(sublayers, { height: 0, opacity: 0 });
            gsap.set(sublayerItems, { opacity: 1, x: 0 });
            gsap.set(previewPanel, { visibility: 'hidden', opacity: 0 });
            // Remove zoom class from all layers
            openLayer.classList.remove('layer-zoomed');
            if (onComplete) onComplete();
        },
    });

    tl
        // 0. Fade out sublayer items
        .to(sublayerItems, {
            opacity: 0, x: -12, duration: 0.2, stagger: 0.03, ease: 'power2.in',
        }, 0)

        // 1. Fade out preview panel
        .to(previewPanel, {
            opacity: 0, x: 40, duration: 0.35, ease: 'power2.in',
        }, 0)

        // 2. Collapse sublayers height
        .to(sublayers, { height: 0, opacity: 0, duration: 0.38 }, 0.08)

        // 3. Reset arrow
        .to(arrow, { rotation: 0, duration: 0.3 }, 0.05)

        // 4. Glide tank back to center
        .to(tankCenter, { x: 0, duration: 0.55 }, 0.1)

        // 5. Close gap back to default
        .to(tankCenter, { gap: 14, duration: 0.3 }, 0.15)

        // 6. Return title position
        .to(tankTitle, { y: 0, duration: 0.5 }, 0.1);
}

// -------------------------------------------------------
// SWAP LAYER (direct switch without returning to center)
// -------------------------------------------------------
function swapLayer(newLayerName) {
    if (isAnimating) return;
    isAnimating = true;

    const oldLayerName = activeLayer;
    const oldLayer     = oldLayerName === 'digital' ? layerDigital : layerClient;
    const newLayer     = newLayerName === 'digital' ? layerDigital : layerClient;
    const oldSubs      = oldLayer.querySelector('.layer-sublayers');
    const newSubs      = newLayer.querySelector('.layer-sublayers');
    const oldArrow     = oldLayer.querySelector('.toggle-arrow');
    const newArrow     = newLayer.querySelector('.toggle-arrow');
    const oldItems     = oldSubs.querySelectorAll('.sublayer-item');
    const newItems     = newSubs.querySelectorAll('.sublayer-item');
    const newFirstItem = newSubs.querySelector('.sublayer-item');

    // Pre-measure new sublayers natural height
    gsap.set(newSubs, { height: 'auto', opacity: 1 });
    const naturalH = newSubs.offsetHeight;
    gsap.set(newSubs, { height: 0, opacity: 0 });

    activeLayer = newLayerName;

    // Update zoom classes
    newLayer.classList.add('layer-zoomed');
    oldLayer.classList.remove('layer-zoomed');

    const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
            isAnimating = false;
            gsap.set(oldSubs, { height: 0, opacity: 0 });
            gsap.set(oldItems, { opacity: 1, x: 0 });
        },
    });

    // 1. Fade away old sublayer items & reset old arrow
    tl.to(oldItems, {
        opacity: 0,
        x: -12,
        duration: 0.22,
        stagger: 0.03,
        ease: 'power2.in',
    }, 0)
    .to(oldArrow, {
        rotation: 0,
        duration: 0.28,
        ease: 'power2.inOut',
    }, 0)

    // 2. Crossfade preview panel out smoothly
    .to([previewImg, previewLabel], {
        opacity: 0,
        y: -6,
        duration: 0.2,
        ease: 'power2.in',
    }, 0)

    // 3. Old sublayers collapse height to 0
    // When switching digital -> client, this smoothly animates Client Solution UP
    // When switching client -> digital, this cleanly closes Client Solution sublayers
    .to(oldSubs, {
        height: 0,
        opacity: 0,
        duration: 0.42,
        ease: 'power2.inOut',
    }, 0.18)

    // 4. Update preview data while invisible
    .call(() => {
        $$('.sublayer-item').forEach(s => s.classList.remove('active'));
        if (newFirstItem) {
            newFirstItem.classList.add('active');
            previewLabel.textContent = newFirstItem.dataset.label;
            previewImg.src = newFirstItem.dataset.img;
        }
    }, null, 0.35)

    // 5. Rotate new layer arrow open
    .to(newArrow, {
        rotation: 180,
        duration: 0.35,
        ease: 'power2.out',
    }, 0.48)

    // 6. Expand new sublayers container (giving space for internal layers)
    .to(newSubs, {
        height: naturalH,
        opacity: 1,
        duration: 0.45,
        ease: 'power2.out',
    }, 0.5)

    // 7. Stagger new sublayer items in
    .fromTo(newItems,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.35, stagger: 0.07, ease: 'power2.out' },
        0.62
    )

    // 8. Fade in preview panel with new image & label
    .fromTo([previewLabel, previewImg],
        { opacity: 0, y: 8 },
        {
            opacity: (i, target) => (target === previewImg ? 0.95 : 1),
            y: 0,
            duration: 0.38,
            ease: 'power2.out',
        },
        0.64
    );
}

// -------------------------------------------------------
// SWITCH PREVIEW IMAGE (crossfade)
// -------------------------------------------------------
function switchPreview(sublayerEl) {
    if (isAnimating) return;

    // Update active state
    const parent = sublayerEl.closest('.layer-sublayers');
    parent.querySelectorAll('.sublayer-item').forEach(s => s.classList.remove('active'));
    sublayerEl.classList.add('active');

    const newLabel = sublayerEl.dataset.label;
    const newSrc   = sublayerEl.dataset.img;

    // Smooth crossfade of image and label together
    gsap.to([previewImg, previewLabel], {
        opacity: 0,
        scale: 0.98,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
            previewLabel.textContent = newLabel;
            previewImg.src = newSrc;

            const reveal = () => {
                gsap.to(previewImg, { opacity: 0.95, scale: 1, duration: 0.35, ease: 'power2.out' });
                gsap.to(previewLabel, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
            };

            if (previewImg.complete) {
                reveal();
            } else {
                previewImg.onload = reveal;
            }
        },
    });
}

// -------------------------------------------------------
// Responsive layout adjustment
// -------------------------------------------------------
window.addEventListener('resize', () => {
    if (activeLayer && !isAnimating) {
        const stageW = tankStage.offsetWidth;
        const tankW = 520;
        const previewW = 440;
        const gap = 50;
        const totalW = tankW + gap + previewW;
        const leftEdge = Math.max(0, (stageW - totalW) / 2);
        const currentLeft = (stageW - tankW) / 2;
        const shiftX = leftEdge - currentLeft;
        gsap.set(tankCenter, { x: shiftX });
        gsap.set(previewPanel, { right: Math.max(0, leftEdge) });
    }
});

// -------------------------------------------------------
// Dynamic Ambient Tech Particles for Innovation Tank
// -------------------------------------------------------
function initTankParticles() {
    const canvas = $('#tank-particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    const count = 45;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * (width || 1200),
            y: Math.random() * (height || 800),
            radius: 0.7 + Math.random() * 1.5,
            baseAlpha: 0.12 + Math.random() * 0.28,
            twinkleSpeed: 0.015 + Math.random() * 0.025,
            twinkleOffset: Math.random() * Math.PI * 2,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.14,
        });
    }

    let time = 0;
    function animate() {
        if (currentView === 'tank') {
            ctx.clearRect(0, 0, width, height);
            time += 0.02;

            for (let i = 0; i < count; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                const alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(time * p.twinkleSpeed * 50 + p.twinkleOffset));

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(165, 195, 75, ${alpha})`;
                ctx.shadowColor = 'rgba(190, 220, 85, 0.35)';
                ctx.shadowBlur = p.radius * 2.5;
                ctx.fill();
            }
        }
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

// -------------------------------------------------------
// Subtle Living Dynamic Atmosphere (Parallax-Locked Canvas)
// -------------------------------------------------------
function initBackgroundDynamic() {
    const canvas = document.getElementById('bg-dynamic-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    // Resize handler (matches the 200vh layout of .bg-dynamic-canvas)
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = Math.round(window.innerHeight * 2);
    }
    resize();
    window.addEventListener('resize', resize);

    // 1. Ethereal Ambient Floating Dust Motes (Warm Chartreuse & Phthalo Olive)
    const MOTE_COUNT = 45;
    const motes = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
        motes.push({
            x: Math.random() * (width || 1400),
            y: Math.random() * (height || 1800),
            radius: 0.75 + Math.random() * 1.25,
            baseAlpha: 0.08 + Math.random() * 0.16, // ultra-subtle
            twinkleSpeed: 0.012 + Math.random() * 0.02,
            twinkleOffset: Math.random() * Math.PI * 2,
            driftSpeed: 0.12 + Math.random() * 0.18, // gentle upward drift
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.008 + Math.random() * 0.012,
            swayAmp: 0.3 + Math.random() * 0.5,
            hue: Math.random() > 0.4 ? '175, 215, 80' : '150, 190, 70',
        });
    }

    // 2. High-Tech Tactical Grid Coordinate Pips & Radar Pings
    // Aligns exactly with the 48px coordinate grid in the CSS background
    const GRID_SIZE = 48;
    const NODE_COUNT = 14;
    const gridNodes = [];

    function resetGridNode(node) {
        const cols = Math.max(2, Math.floor(width / GRID_SIZE));
        const rows = Math.max(2, Math.floor(height / GRID_SIZE));
        // Pick an exact grid intersection
        node.x = (Math.floor(Math.random() * (cols - 1)) + 1) * GRID_SIZE;
        node.y = (Math.floor(Math.random() * (rows - 1)) + 1) * GRID_SIZE;
        node.progress = 0;
        node.duration = 240 + Math.floor(Math.random() * 260); // 4 - 8.5 seconds
        node.peakAlpha = 0.18 + Math.random() * 0.18; // soft tactical ping
        node.maxPingRadius = 7 + Math.random() * 6;
        node.type = Math.random() > 0.4 ? 'crosshair' : 'ping';
    }

    for (let i = 0; i < NODE_COUNT; i++) {
        const node = {};
        resetGridNode(node);
        node.progress = Math.random() * node.duration; // stagger starting points
        gridNodes.push(node);
    }

    // 3. Subtle Drifting Ambient Light Beam / Wave (Gentle, low contrast, completely seamless)
    let scanY = 0;
    const scanSpeed = 0.28; // slow glide

    let time = 0;
    function animate() {
        // Pause drawing when user is inside the Innovation Tank (which has its own canvas)
        if (window.currentView === 'tank') {
            requestAnimationFrame(animate);
            return;
        }

        ctx.clearRect(0, 0, width, height);
        time += 1;

        // A. Subtle Telemetry Wave Beam (Faint soft glow, completely blended, no white lines)
        scanY += scanSpeed;
        if (scanY > height + 200) scanY = -200;
        const waveGrad = ctx.createLinearGradient(0, scanY - 120, 0, scanY + 120);
        waveGrad.addColorStop(0, 'rgba(140, 185, 55, 0)');
        waveGrad.addColorStop(0.5, 'rgba(175, 220, 75, 0.022)');
        waveGrad.addColorStop(1, 'rgba(140, 185, 55, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fillRect(0, scanY - 120, width, 240);

        // B. Render Atmospheric Floating Motes
        for (let i = 0; i < MOTE_COUNT; i++) {
            const m = motes[i];
            m.y -= m.driftSpeed;
            m.x += Math.sin(time * m.swaySpeed + m.swayOffset) * m.swayAmp;

            // Seamless boundary wrap around 200vh height
            if (m.y < 0) {
                m.y = height;
                m.x = Math.random() * width;
            }
            if (m.x < 0) m.x = width;
            if (m.x > width) m.x = 0;

            const alpha = m.baseAlpha * (0.7 + 0.3 * Math.sin(time * m.twinkleSpeed + m.twinkleOffset));
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${m.hue}, ${alpha})`;
            ctx.shadowColor = 'rgba(190, 235, 90, 0.25)';
            ctx.shadowBlur = m.radius * 2;
            ctx.fill();
        }

        // C. Render High-Tech Grid Coordinate Nodes & Crosshairs
        for (let i = 0; i < NODE_COUNT; i++) {
            const n = gridNodes[i];
            n.progress += 1;

            if (n.progress >= n.duration) {
                resetGridNode(n);
                continue;
            }

            // Normalised cycle 0 -> 1 -> 0
            const norm = n.progress / n.duration;
            const cycleAlpha = Math.sin(norm * Math.PI) * n.peakAlpha;

            if (cycleAlpha > 0.01) {
                ctx.save();
                ctx.shadowColor = 'rgba(190, 235, 90, 0.4)';
                ctx.shadowBlur = 4;

                // Center micro dot
                ctx.beginPath();
                ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 245, 110, ${cycleAlpha})`;
                ctx.fill();

                if (n.type === 'crosshair') {
                    // Tactile micro crosshair ticks (+)
                    ctx.strokeStyle = `rgba(180, 225, 90, ${cycleAlpha * 0.75})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(n.x - 4, n.y);
                    ctx.lineTo(n.x + 4, n.y);
                    ctx.moveTo(n.x, n.y - 4);
                    ctx.lineTo(n.x, n.y + 4);
                    ctx.stroke();
                } else {
                    // Expanding subtle radar ping ring
                    const ringRadius = norm * n.maxPingRadius;
                    const ringAlpha = cycleAlpha * (1 - norm);
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, ringRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(185, 230, 95, ${ringAlpha * 0.6})`;
                    ctx.lineWidth = 0.85;
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

