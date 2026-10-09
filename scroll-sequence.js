/* Scroll driven MP4 background with a bounded WebP Canvas fallback. */
(() => {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad = (value, width) => String(value).padStart(width, "0");

  class ScrollSequence {
    constructor(root) {
      this.root = root;
      this.video = root.querySelector("[data-scroll-video]");
      this.canvas = root.querySelector("[data-scroll-canvas]");
      this.ctx = this.canvas?.getContext("2d", { alpha: false, desynchronized: true });
      this.loader = root.querySelector(".sequence-loader");
      this.progressText = root.querySelector("[data-video-progress]");
      this.progressBar = root.querySelector("[data-video-progress-bar]");
      this.frameLabel = root.querySelector("[data-frame-number]");
      this.indicator = root.querySelector(".scroll-indicator");
      this.totalFrames = Number(root.dataset.total || 477);
      this.frameTemplate = root.dataset.frames || "";
      this.padding = Number(root.dataset.padding || 3);
      this.before = 3;
      this.ahead = 10;
      this.maxConcurrent = 3;
      this.maxCache = 12;
      this.targetFrame = 0;
      this.currentFrame = -1;
      this.scrollProgress = 0;
      this.raf = 0;
      this.ready = false;
      this.videoFailed = false;
      this.videoUrl = this.video?.dataset.videoSrc || root.dataset.video || "";
      this.blobUrl = "";
      this.cache = new Map();
      this.pending = new Map();
      this.failed = new Set();
      this.queue = new Map();
      this.active = 0;
      this.wanted = new Set();
      this.handleScroll = this.handleScroll.bind(this);
      this.render = this.render.bind(this);
      this.handleResize = this.handleResize.bind(this);
    }

    init() {
      if (!this.video || !this.canvas || !this.ctx || !this.videoUrl) return;

      this.video.pause();
      this.video.autoplay = false;
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.preload = "auto";
      // The URL stays in data-video-src until fetch completes, avoiding a duplicate media request.
      this.video.removeAttribute("src");

      this.video.addEventListener("loadedmetadata", () => this.primeVideo());
      this.video.addEventListener("loadeddata", () => this.primeVideo());
      this.video.addEventListener("canplay", () => this.primeVideo());
      this.video.addEventListener("error", () => this.activateFallback());
      this.video.addEventListener("timeupdate", () => this.updateFrameLabel());

      this.handleResize();
      if ("ResizeObserver" in window) new ResizeObserver(this.handleResize).observe(this.root);
      window.addEventListener("resize", this.handleResize, { passive: true });
      window.addEventListener("scroll", this.handleScroll, { passive: true });
      window.addEventListener("pagehide", () => this.dispose(), { once: true });

      if ("IntersectionObserver" in window) {
        this.visibilityObserver = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !this.loadStarted) this.loadVideo();
        }, { rootMargin: "100% 0px" });
        this.visibilityObserver.observe(this.root);
      } else {
        this.loadVideo();
      }

      this.scheduleRender();
    }

    async loadVideo() {
      if (this.loadStarted || this.videoFailed) return;
      this.loadStarted = true;
      try {
        const response = await fetch(this.videoUrl, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Video request failed (${response.status})`);

        const total = Number(response.headers.get("content-length")) || 0;
        let blob;
        if (response.body?.getReader) {
          const reader = response.body.getReader();
          const chunks = [];
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.byteLength;
            this.updateLoadingProgress(total ? Math.min(99, Math.round(received / total * 100)) : 0);
          }
          blob = new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" });
        } else {
          blob = await response.blob();
        }

        if (this.videoFailed) return;
        this.blobUrl = URL.createObjectURL(blob);
        this.video.src = this.blobUrl;
        this.video.load();
      } catch {
        this.activateFallback();
      }
    }

    primeVideo() {
      if (this.videoFailed || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      const duration = this.video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      this.video.pause();
      this.ready = true;
      this.video.classList.add("is-ready");
      this.video.classList.remove("is-failed");
      this.updateLoadingProgress(100);
      this.hideLoader();
      this.scheduleRender();
    }

    activateFallback() {
      if (this.videoFailed) return;
      this.videoFailed = true;
      this.ready = false;
      this.video.pause();
      this.video.classList.remove("is-ready");
      this.video.classList.add("is-failed");
      this.visibilityObserver?.disconnect();
      this.scheduleWindow(this.targetFrame);
      this.scheduleRender();
    }

    handleScroll() {
      if (!this.raf) this.raf = requestAnimationFrame(this.render);
    }

    scheduleRender() {
      if (!this.raf) this.raf = requestAnimationFrame(this.render);
    }

    render() {
      this.raf = 0;
      const rect = this.root.getBoundingClientRect();
      const scrollable = Math.max(1, this.root.offsetHeight - window.innerHeight);
      this.scrollProgress = clamp(-rect.top / scrollable, 0, 1);
      const sceneVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      this.indicator?.classList.toggle("is-hidden", !sceneVisible || this.scrollProgress > 0.06);
      this.frameLabel?.closest(".sequence-frame-label")?.classList.toggle("is-hidden", !sceneVisible);
      this.targetFrame = Math.round(this.scrollProgress * (this.totalFrames - 1));
      this.updateFrameLabel();

      if (!this.videoFailed) {
        if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.duration > 0) {
          const targetTime = this.scrollProgress * this.video.duration;
          if (Math.abs(this.video.currentTime - targetTime) > 0.008) {
            try {
              this.video.currentTime = targetTime;
            } catch {
              // The next frame will retry after the media element finishes its current seek.
            }
          }
        }
        return;
      }

      if (this.targetFrame !== this.currentFrame) {
        this.currentFrame = this.targetFrame;
        this.scheduleWindow(this.currentFrame);
      }
      this.drawBestAvailable(this.targetFrame);
    }

    updateFrameLabel() {
      if (this.frameLabel) this.frameLabel.textContent = pad(this.targetFrame + 1, 3);
    }

    updateLoadingProgress(value) {
      if (this.progressText) this.progressText.textContent = `${value}%`;
      if (this.progressBar) this.progressBar.style.width = `${value}%`;
    }

    hideLoader() {
      this.loader?.classList.add("is-hidden");
      this.root.querySelector(".sequence-loading")?.classList.add("is-ready");
    }

    frameUrl(index) {
      return this.frameTemplate.replace("{index}", pad(index, this.padding));
    }

    scheduleWindow(center) {
      const start = Math.max(0, center - this.before);
      const end = Math.min(this.totalFrames - 1, center + this.ahead);
      this.wanted = new Set(Array.from({ length: end - start + 1 }, (_, i) => start + i));
      for (const index of this.queue.keys()) if (!this.wanted.has(index)) this.queue.delete(index);
      for (const [index, controller] of this.pending) {
        if (index < start - 2 || index > end + 2) controller.abort();
      }
      for (const index of this.wanted) {
        if (!this.cache.has(index) && !this.pending.has(index) && !this.failed.has(index)) {
          this.queue.set(index, Math.abs(index - center));
        }
      }
      this.trimCache(center, start, end);
      this.pumpQueue();
    }

    pumpQueue() {
      while (this.active < this.maxConcurrent && this.queue.size) {
        const [index] = [...this.queue.entries()].sort((a, b) => a[1] - b[1])[0];
        this.queue.delete(index);
        this.loadFrame(index);
      }
    }

    async loadFrame(index) {
      const controller = new AbortController();
      this.pending.set(index, controller);
      this.active += 1;
      try {
        const response = await fetch(this.frameUrl(index), { signal: controller.signal, cache: "force-cache" });
        if (!response.ok) throw new Error(`Frame request failed (${response.status})`);
        const blob = await response.blob();
        let bitmap;
        if ("createImageBitmap" in window) {
          try {
            bitmap = await createImageBitmap(blob);
          } catch {
            bitmap = await this.decodeImage(blob);
          }
        } else {
          bitmap = await this.decodeImage(blob);
        }
        if (controller.signal.aborted) {
          bitmap.close?.();
          return;
        }
        this.cache.set(index, { bitmap, used: performance.now() });
        this.trimCache(this.targetFrame, this.targetFrame - this.before, this.targetFrame + this.ahead);
        this.drawBestAvailable(this.targetFrame);
      } catch (error) {
        if (error.name !== "AbortError") {
          this.failed.add(index);
          if (index === this.targetFrame && !this.cache.size) {
            this.drawPlaceholder();
            this.hideLoader();
          }
        }
      } finally {
        if (this.pending.get(index) === controller) this.pending.delete(index);
        this.active -= 1;
        this.pumpQueue();
      }
    }

    decodeImage(blob) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Frame decode failed")); };
        image.src = url;
      });
    }

    trimCache(center, start, end) {
      if (this.cache.size <= this.maxCache) return;
      const candidates = [...this.cache.entries()]
        .filter(([index]) => index !== center)
        .sort(([a, aValue], [b, bValue]) => {
          const aProtected = a >= start && a <= end ? 1 : 0;
          const bProtected = b >= start && b <= end ? 1 : 0;
          return (aProtected - bProtected) || (aValue.used - bValue.used) || (Math.abs(b - center) - Math.abs(a - center));
        });
      while (this.cache.size > this.maxCache && candidates.length) {
        const [index, record] = candidates.shift();
        this.cache.delete(index);
        record.bitmap.close?.();
      }
    }

    drawBestAvailable(target) {
      const direct = this.cache.get(target);
      let selected = target;
      let record = direct;
      if (!record) {
        let distance = Infinity;
        for (const [index, candidate] of this.cache) {
          const nextDistance = Math.abs(index - target);
          if (nextDistance < distance) { distance = nextDistance; selected = index; record = candidate; }
        }
      }
      if (!record || !this.cssWidth || !this.cssHeight || selected === this.lastDrawn) return;
      this.lastDrawn = selected;
      record.used = performance.now();
      const image = record.bitmap;
      const scale = Math.max(this.cssWidth / image.width, this.cssHeight / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      this.ctx.fillStyle = "#05070d";
      this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
      this.ctx.drawImage(image, (this.cssWidth - width) / 2, (this.cssHeight - height) / 2, width, height);
      this.hideLoader();
    }

    drawPlaceholder() {
      this.ctx.fillStyle = "#05070d";
      this.ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);
    }

    handleResize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.cssWidth = Math.max(1, rect.width);
      this.cssHeight = Math.max(1, rect.height);
      this.canvas.width = Math.round(this.cssWidth * dpr);
      this.canvas.height = Math.round(this.cssHeight * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.lastDrawn = -1;
      if (this.videoFailed) this.drawBestAvailable(this.targetFrame);
      this.scheduleRender();
    }

    dispose() {
      this.visibilityObserver?.disconnect();
      for (const controller of this.pending.values()) controller.abort();
      for (const record of this.cache.values()) record.bitmap.close?.();
      this.cache.clear();
      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    }
  }

  const start = () => document.querySelectorAll("[data-scroll-sequence]").forEach((root) => {
    if (root.__scrollSequence) return;
    root.__scrollSequence = new ScrollSequence(root);
    root.__scrollSequence.init();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
