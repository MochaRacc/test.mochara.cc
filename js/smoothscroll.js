function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

window.addEventListener("DOMContentLoaded", () => {
  if (isTouchDevice()) {
    console.log("Touch device detected: smooth scrolling disabled");
    return; // skip initializing smooth scroll
  }

  const smooth = new SmoothScroll({
    ease: 0.085,
    wrapper: ".smooth-scroll-wrapper",
    content: ".smooth-scroll-content",
    header: ".mracc-header",
    footer: ".mracc-footer"
  });
  smooth.init();
  window.__smoothScroll = smooth;
});


class SmoothScroll {
  constructor(opts = {}) {
    this.ease = typeof opts.ease === 'number' ? opts.ease : 0.08;
    this.wrapper = document.querySelector(opts.wrapper || ".smooth-scroll-wrapper");
    this.content = document.querySelector(opts.content || ".smooth-scroll-content");
    this.header = document.querySelector(opts.header || ".mracc-header");
    this.footer = document.querySelector(opts.footer || ".mracc-footer");
    if (!this.wrapper || !this.content) {
      console.warn("SmoothScroll: wrapper or content element not found.");
      return;
    }
    this.current = 0;
    this.target = 0;
    this.maxScroll = 0;
    this.running = false;
    this.isTouching = false;
    this.touchStartY = 0;
    this.touchLastY = 0;
    this.onWheel = this.onWheel.bind(this);
    this.onRAF = this.onRAF.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onKey = this.onKey.bind(this);
  }

  init() {
    if (!this.wrapper || !this.content) return;
    this.setHeaderFooterPadding();
    this.updateSize();
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKey, { passive: false });
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd, { passive: true });
    this.running = true;
    this.raf = requestAnimationFrame(this.onRAF);
  }

  destroy() {
    this.running = false;
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);
    cancelAnimationFrame(this.raf);
    this.content.style.transform = "";
    this.wrapper.style.paddingTop = "";
    this.wrapper.style.paddingBottom = "";
    document.body.style.height = "";
  }

  setHeaderFooterPadding() {
    if (this.header) {
      const hh = this.header.offsetHeight;
      this.wrapper.style.paddingTop = hh + "px";
    }
    if (this.footer) {
      const fh = this.footer.offsetHeight;
      this.wrapper.style.paddingBottom = fh + "px";
    }
  }

  updateSize() {
    const contentHeight = Math.max(this.content.scrollHeight, this.content.offsetHeight);
    this.maxScroll = Math.max(0, contentHeight - window.innerHeight);
    document.body.style.height = contentHeight + "px";
    this.target = Math.max(0, Math.min(this.target, this.maxScroll));
    this.current = Math.max(0, Math.min(this.current, this.maxScroll));
  }

  onWheel(e) {
    const targetEl = e.target;
    if (this._isFormElement(targetEl)) return;
    e.preventDefault();
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 24;
    if (e.deltaMode === 2) delta *= window.innerHeight;
    this.target = Math.max(0, Math.min(this.target + delta, this.maxScroll));
  }

  onTouchStart(e) {
    if (e.touches.length !== 1) return;
    this.isTouching = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchLastY = this.touchStartY;
  }

  onTouchMove(e) {
    if (!this.isTouching || e.touches.length !== 1) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const dy = this.touchLastY - y;
    this.touchLastY = y;
    this.target = Math.max(0, Math.min(this.target + dy, this.maxScroll));
  }

  onTouchEnd() {
    this.isTouching = false;
  }

  onKey(e) {
    if (this._isFormElement(e.target)) return;
    let handled = false;
    switch (e.code) {
      case 'ArrowDown':
        this.target = Math.min(this.target + 60, this.maxScroll);
        handled = true;
        break;
      case 'ArrowUp':
        this.target = Math.max(this.target - 60, 0);
        handled = true;
        break;
      case 'PageDown':
        this.target = Math.min(this.target + window.innerHeight * 0.9, this.maxScroll);
        handled = true;
        break;
      case 'PageUp':
        this.target = Math.max(this.target - window.innerHeight * 0.9, 0);
        handled = true;
        break;
      case 'Home':
        this.target = 0;
        handled = true;
        break;
      case 'End':
        this.target = this.maxScroll;
        handled = true;
        break;
      case 'Space':
        this.target = Math.min(this.target + window.innerHeight * 0.9, this.maxScroll);
        handled = true;
        break;
    }
    if (handled) e.preventDefault();
  }

  onRAF() {
    this.current += (this.target - this.current) * this.ease;
    if (Math.abs(this.target - this.current) < 0.05) this.current = this.target;
    this.content.style.transform = `translate3d(0, ${-this.current}px, 0)`;
    if (this.running) this.raf = requestAnimationFrame(this.onRAF);
  }

  onResize() {
    this.setHeaderFooterPadding();
    this.updateSize();
  }

  _isFormElement(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  scrollTo(y = 0, immediate = false) {
    const dest = Math.max(0, Math.min(y, this.maxScroll));
    this.target = dest;
    if (immediate) {
      this.current = dest;
      this.content.style.transform = `translate3d(0, ${-this.current}px, 0)`;
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const smooth = new SmoothScroll({
    ease: 0.085,
    wrapper: ".smooth-scroll-wrapper",
    content: ".smooth-scroll-content",
    header: ".mracc-header",
    footer: ".mracc-footer"
  });
  smooth.init();
  window.__smoothScroll = smooth;
});
