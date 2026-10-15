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
const sharedSculpture   = $('#shared-sculpture');
const heroEmblemWrapper = $('#hero-emblem-wrapper');
const btnCTA            = $('#btn-see-building');
const btnBack           = $('#btn-back');
const logoLink          = $('#logo-link');
const tankCenter        = $('#tank-center');
const previewPanel      = $('#preview-panel');
const previewLabel      = $('#preview-label');
const previewImg        = $('#preview-img');
const layerDigital      = $('#layer-digital');
const layerClient       = $('#layer-client');
const tankTitle         = $('#tank-title');
const tankStage         = $('#tank-stage');
const bgParallax        = $('#bg-parallax');
const meshLeft          = $('#mesh-left');
const meshRight         = $('#mesh-right');
const bgPortalGlow      = $('#bg-portal-glow');

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

// -------------------------------------------------------
// -------------------------------------------------------
// Cinematic Camera Pan & Zoom Targets with Selective Spotlight
// -------------------------------------------------------
const CAMERA_TARGETS = {
    hero: {
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        duration: 1.0,
        baseBrightness: 1,
        spotlightOpacity: 0,
        spotlightMask: 'none',
    },
    about: {
        // Subtle focus on HEAD (upper-right rotating orb)
        scale: 1.32,
        xPercent: -5,
        yPercent: 14,
        duration: 1.15,
        baseBrightness: 0.28,
        spotlightOpacity: 1,
        spotlightMask: 'radial-gradient(circle at 74% 16%, #000 0%, #000 24%, transparent 48%)',
    },
    journey: {
        // Balanced focus on BODY WAVE (entire flowing torso band from edge to edge)
        scale: 1.25,
        xPercent: 0,
        yPercent: -2,
        duration: 1.15,
        baseBrightness: 0.28,
        spotlightOpacity: 1,
        spotlightMask: 'linear-gradient(to bottom, transparent 16%, #000 28%, #000 66%, transparent 78%)',
    },
    movement: {
        // Balanced focus on TAIL / STRIDE (entire lower stepping blocks)
        scale: 1.32,
        xPercent: -4,
        yPercent: -16,
        duration: 1.15,
        baseBrightness: 0.28,
        spotlightOpacity: 1,
        spotlightMask: 'linear-gradient(to bottom, transparent 48%, #000 64%, #000 100%)',
    },
};

function applyCameraTransform(targetView, isImmediate = false) {
    const target = CAMERA_TARGETS[targetView] || CAMERA_TARGETS.hero;
    const baseVid = $('#hero-logo-base');
    const spotVid = $('#hero-logo-spotlight');

    if (!heroEmblemWrapper) return;

    if (isImmediate) {
        gsap.set(heroEmblemWrapper, {
            scale: target.scale,
            xPercent: target.xPercent,
            yPercent: target.yPercent,
        });
        if (baseVid) {
            gsap.set(baseVid, {
                filter: `drop-shadow(0 25px 45px rgba(0,0,0,0.7)) brightness(${target.baseBrightness}) contrast(1.05)`,
            });
        }
        if (spotVid) {
            spotVid.style.webkitMaskImage = target.spotlightMask;
            spotVid.style.maskImage = target.spotlightMask;
            gsap.set(spotVid, { opacity: target.spotlightOpacity });
        }
        return;
    }

    gsap.to(heroEmblemWrapper, {
        scale: target.scale,
        xPercent: target.xPercent,
        yPercent: target.yPercent,
        duration: target.duration,
        ease: 'power3.inOut',
        overwrite: 'auto',
    });

    if (baseVid) {
        gsap.to(baseVid, {
            filter: `drop-shadow(0 25px 45px rgba(0,0,0,0.7)) brightness(${target.baseBrightness}) contrast(1.05)`,
            duration: 0.8,
            ease: 'power2.out',
            overwrite: 'auto',
        });
    }

    if (spotVid) {
        if (target.spotlightOpacity > 0) {
            spotVid.style.webkitMaskImage = target.spotlightMask;
            spotVid.style.maskImage = target.spotlightMask;
            gsap.to(spotVid, {
                opacity: 1,
                duration: 0.7,
                ease: 'power2.out',
                overwrite: 'auto',
            });
        } else {
            gsap.to(spotVid, {
                opacity: 0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: 'auto',
            });
        }
    }
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
    playAllVideos();

    // Microsecond sync between base and spotlight videos
    const baseVid = $('#hero-logo-base');
    const spotVid = $('#hero-logo-spotlight');
    if (baseVid && spotVid) {
        baseVid.addEventListener('timeupdate', () => {
            if (Math.abs(spotVid.currentTime - baseVid.currentTime) > 0.05) {
                spotVid.currentTime = baseVid.currentTime;
            }
        });
        baseVid.addEventListener('play', () => spotVid.play().catch(() => {}));
        baseVid.addEventListener('pause', () => spotVid.pause());
    }

    applyCameraTransform(currentView, true);
    document.addEventListener('click', playAllVideos, { once: true });

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
    if (window.isConsultationOpen && window.closeConsultationModal) {
        window.closeConsultationModal(() => {
            navigateToView(targetView, isImmediate);
        });
        return;
    }
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

    if (isImmediate) {
        // Immediate switch without transition delays
        $$('.view').forEach(v => {
            v.classList.remove('active');
            gsap.set(v, { visibility: 'hidden', opacity: 0 });
        });
        const toEl = $(`#view-${targetView}`);
        if (toEl) {
            toEl.classList.add('active');
            gsap.set(toEl, { visibility: 'visible', opacity: 1, y: 0 });
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
            gsap.set(sharedSculpture, { opacity: 1, scale: 1, filter: 'none' });
            gsap.set(bgParallax, { scale: 1 });
        }
        applyCameraTransform(targetView, true);
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
    playAllVideos();

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

    applyCameraTransform(toView);

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
            isAnimating = false;
        }
    });

    // Ensure shared sculpture stays fully crisp and visible
    tl.to(sharedSculpture, {
        opacity: 1,
        filter: 'none',
        duration: 0.4,
        ease: 'power2.out',
    }, 0.1);

    // 1. Fade out current view elements
    if (fromEl) {
        tl.to(fromEl, {
            opacity: 0,
            y: -15,
            duration: 0.32,
            ease: 'power2.in',
        }, 0);
    }

    // 2. Fade in target view container
    if (toEl) {
        tl.set(toEl, { visibility: 'visible', opacity: 0, y: 15, zIndex: 10 }, 0.22)
          .to(toEl, {
              opacity: 1,
              y: 0,
              duration: 0.45,
              ease: 'power2.out',
          }, 0.24);

        // Targeted entrance animations
        if (toView === 'about') {
            tl.fromTo('#view-about .card-seamless-about', 
                { opacity: 0, x: -35 }, 
                { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, 0.28)
              .fromTo('#view-about .step-badge', 
                { opacity: 0, y: 18 }, 
                { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(1.4)' }, 0.36)
              .fromTo('#view-about .founder-editorial-quote', 
                { opacity: 0, y: 18 }, 
                { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.42);
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
            tl.fromTo('#view-hero .title-line', 
                { opacity: 0, y: 30 }, 
                { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out' }, 0.28)
              .fromTo('#view-hero .hero-description', 
                { opacity: 0, y: 20 }, 
                { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 0.38)
              .fromTo('#view-hero .btn-cta', 
                { opacity: 0, y: 20 }, 
                { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, 0.42);
        }
    }
}

// -------------------------------------------------------
// VIEW TRANSITION: Current View → Tank (4-Step Parting Mesh Portal)
// -------------------------------------------------------
function transitionToTank() {
    if (isAnimating || currentView === 'tank') return;
    isAnimating = true;
    applyCameraTransform('hero');

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
            filter: 'blur(5px)',
            duration: 0.7,
            ease: 'power2.inOut',
        }, 0);
    }

    tl.to(sharedSculpture, {
        opacity: 0,
        scale: 1.12,
        x: 40,
        filter: 'blur(8px)',
        duration: 0.75,
        ease: 'power2.inOut',
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

    // Innovation roof and layers glide forward into crisp focus
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
            applyCameraTransform(targetView);
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

    // 4. Shared logo video sculpture returns with target camera framing
    applyCameraTransform(targetView);
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
        tl.set(toEl, { visibility: 'visible', opacity: 0, y: 20, zIndex: 10 }, 0.85)
          .to(toEl, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power3.out',
          }, 0.9);
    }
}

// -------------------------------------------------------
// OUR MOVEMENT: Services Interactive Dropdown (Informational)
// -------------------------------------------------------
function initMovementDropdown() {
    const trigger = $('#dropdown-trigger');
    const menu    = $('#dropdown-menu-list');
    const label   = $('.dropdown-selected-label');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = menu.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        menu.style.display = isOpen ? 'flex' : 'none';
    });

    $$('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const serviceName = item.dataset.service;
            if (label && serviceName) {
                label.textContent = serviceName;
            }
            $$('.dropdown-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            menu.classList.remove('open');
            menu.style.display = 'none';
            trigger.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#services-dropdown')) {
            menu.classList.remove('open');
            menu.style.display = 'none';
            trigger.setAttribute('aria-expanded', 'false');
        }
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

    if (!modal) return;

    // Custom Dropdowns matching website dark olive theme
    const customSelects = modal.querySelectorAll('.custom-select');
    customSelects.forEach(dropdown => {
        const trigger = dropdown.querySelector('.custom-select-trigger');
        const valueDisplay = dropdown.querySelector('.custom-select-value');
        const hiddenInput = dropdown.querySelector('input[type="hidden"]');
        const optionItems = dropdown.querySelectorAll('.custom-select-option');
        const parentRow = dropdown.closest('.inquiry-row');

        if (!trigger) return;

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isOpen = dropdown.classList.contains('open');
            // Close all other dropdowns
            customSelects.forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('open');
                    d.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
                    d.closest('.inquiry-row')?.classList.remove('has-open-select');
                }
            });

            if (isOpen) {
                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
                if (parentRow) parentRow.classList.remove('has-open-select');
            } else {
                dropdown.classList.add('open');
                trigger.setAttribute('aria-expanded', 'true');
                if (parentRow) parentRow.classList.add('has-open-select');
            }
        });

        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const val = item.getAttribute('data-value');
                if (valueDisplay) valueDisplay.textContent = val;
                if (hiddenInput) hiddenInput.value = val;

                optionItems.forEach(opt => opt.classList.remove('selected'));
                item.classList.add('selected');

                dropdown.classList.remove('open');
                trigger.setAttribute('aria-expanded', 'false');
                if (parentRow) parentRow.classList.remove('has-open-select');
            });
        });
    });

    // Close any open custom dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            customSelects.forEach(d => {
                d.classList.remove('open');
                d.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
                d.closest('.inquiry-row')?.classList.remove('has-open-select');
            });
        }
    });

    const closeAllDropdowns = () => {
        customSelects.forEach(d => {
            d.classList.remove('open');
            d.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
            d.closest('.inquiry-row')?.classList.remove('has-open-select');
        });
    };

    window.openConsultationModal = (service) => {
        if (window.isConsultationOpen) {
            window.closeConsultationModal();
            return;
        }
        window.isConsultationOpen = true;

        // Elements on screen to fade out so ONLY the ambient background is visible
        const pageElements = [
            '#view-hero', '#view-about', '#view-journey', '#view-movement', '#view-tank',
            '#shared-sculpture'
        ];

        // Phase 1: Fade out page contents
        gsap.to(pageElements, {
            opacity: 0,
            scale: 0.98,
            duration: 0.32,
            ease: 'power2.inOut',
            onComplete: () => {
                // Phase 2: Fade to white / negative TV wash & show inquiry form
                modal.classList.add('open');
                modal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
                document.body.classList.add('inquiry-form-active');

                // Animate backdrop white wash
                gsap.fromTo(backdrop, 
                    { opacity: 0 }, 
                    { opacity: 1, duration: 0.45, ease: 'power2.out' }
                );

                // Phase 3: Animate form container smoothly in
                gsap.fromTo('.consultation-fullpage-inner',
                    { opacity: 0, y: 24 },
                    { opacity: 1, y: 0, duration: 0.45, delay: 0.12, ease: 'power2.out' }
                );
            }
        });

        // If a specific service was passed, select it in Operations To Improve
        if (service) {
            const opsSelect = $('#custom-select-operations');
            if (opsSelect) {
                const targetOpt = Array.from(opsSelect.querySelectorAll('.custom-select-option'))
                    .find(opt => opt.getAttribute('data-value').toLowerCase().includes(service.toLowerCase()));
                if (targetOpt) {
                    targetOpt.click();
                }
            }
        }
    };

    window.closeConsultationModal = (callback) => {
        if (!window.isConsultationOpen) {
            if (typeof callback === 'function') callback();
            return;
        }
        window.isConsultationOpen = false;

        // Fade out inquiry form and backdrop
        gsap.to('.consultation-fullpage-inner', {
            opacity: 0,
            y: -16,
            duration: 0.22,
            ease: 'power2.in'
        });

        gsap.to(backdrop, {
            opacity: 0,
            duration: 0.32,
            delay: 0.05,
            ease: 'power2.inOut',
            onComplete: () => {
                modal.classList.remove('open');
                modal.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('inquiry-form-active');
                document.body.style.overflow = '';
                closeAllDropdowns();
                if (status) status.textContent = '';

                // Restore page content of the current active view
                const activeViewId = window.currentView || currentView || 'hero';
                const activeViewEl = $(`#view-${activeViewId}`);
                const elementsToRestore = [activeViewEl, '#shared-sculpture'];

                gsap.to(elementsToRestore, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.38,
                    ease: 'power2.out'
                });

                if (typeof callback === 'function') callback();
            }
        });
    };

    const closeModal = () => window.closeConsultationModal();

    if (openBtn) openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.isConsultationOpen) {
            window.closeConsultationModal();
        } else {
            window.openConsultationModal();
        }
    });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && window.isConsultationOpen) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('#form-name')?.value || 'Client';
            status.textContent = `Thank you, ${name}. Your inquiry has been received. Our team will contact you shortly.`;
            status.style.color = '#202c13';
            status.style.fontWeight = '600';
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
    const sublayers     = openLayer.querySelector('.layer-sublayers');
    const arrow         = openLayer.querySelector('.toggle-arrow');
    const sublayerItems = sublayers.querySelectorAll('.sublayer-item');
    const firstItem     = sublayers.querySelector('.sublayer-item');

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

        // 2. Slide tank container to the left
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
        if (window.isConsultationOpen) {
            requestAnimationFrame(animate);
            return;
        }
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
