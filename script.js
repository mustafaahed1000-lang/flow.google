const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".topbar nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

const localPreview = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
const adUnits = [...document.querySelectorAll(".adsterra-native, .adsterra-banner, .adsterra-square")];
const adsenseUnits = [...document.querySelectorAll(".adsense-placement")];
if (localPreview) {
  for (const unit of adUnits) unit.innerHTML = '<span class="ad-preview-note">معاينة محلية — الإعلان يظهر بعد النشر</span>';
  for (const unit of adsenseUnits) unit.classList.add("is-preview");
} else {
  const nativeUnit = document.querySelector(".adsterra-native");
  if (nativeUnit) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.cfasync = "false";
    script.src = nativeUnit.dataset.adScript;
    nativeUnit.append(script);
  }

  const formatUnits = [...document.querySelectorAll(".adsterra-banner, .adsterra-square")];
  let formatIndex = 0;
  const loadNextAd = () => {
    const unit = formatUnits[formatIndex++];
    if (!unit) return;
    window.atOptions = JSON.parse(unit.dataset.adOptions);
    const script = document.createElement("script");
    script.src = unit.dataset.adScript;
    script.async = false;
    script.onload = loadNextAd;
    script.onerror = loadNextAd;
    unit.append(script);
  };
  loadNextAd();

  document.querySelectorAll(".adsbygoogle[data-ad-client='ca-pub-7686787781265209']").forEach((unit) => {
    if (!/^\d+$/.test(unit.dataset.adSlot || "")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      unit.closest(".adsense-placement")?.classList.add("is-active");
    } catch (error) {
      console.warn("تعذّر تهيئة وحدة AdSense:", error);
    }
  });
}

const mainWrapper = document.querySelector(".main-content-wrapper");
const backdrop = document.querySelector(".bg-video");
const heroOrbVideo = document.querySelector(".hero-video-orb");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const videoVisibility = new WeakMap();
const videoReadyHooks = new WeakSet();

function playVisibleVideo(video) {
  if (!video || reducedMotion || !videoVisibility.get(video)) return;
  video.classList.add("is-ready");
  const playback = video.play();
  if (playback && playback.catch) playback.catch(() => {});
}

function startBackdropAfterOrb() {
  if (!backdrop || !videoVisibility.get(backdrop)) return;
  setVideoPlayback(backdrop, true);
}

function prepareLazyVideo(video) {
  if (!video || video.dataset.sourceLoaded === "true") return;
  const smallViewport = window.matchMedia("(max-width: 700px)").matches;
  const saveData = navigator.connection?.saveData || ["slow-2g", "2g"].includes(navigator.connection?.effectiveType);
  const source = (smallViewport || saveData) && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src;
  if (!source) return;
  video.dataset.sourceLoaded = "true";
  video.muted = true;
  video.playsInline = true;
  video.preload = "none";
  video.src = source;
  video.load();
}

function setVideoPlayback(video, shouldPlay) {
  if (!video) return;
  videoVisibility.set(video, shouldPlay);
  if (!shouldPlay || reducedMotion) {
    video.pause();
    return;
  }

  if (video === backdrop && heroOrbVideo && videoVisibility.get(heroOrbVideo) &&
      !heroOrbVideo.classList.contains("is-ready") && !heroOrbVideo.classList.contains("is-failed")) return;

  prepareLazyVideo(video);
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    playVisibleVideo(video);
    return;
  }

  if (!videoReadyHooks.has(video)) {
    videoReadyHooks.add(video);
    video.addEventListener("loadeddata", () => {
      playVisibleVideo(video);
      if (video === heroOrbVideo) startBackdropAfterOrb();
    });
    video.addEventListener("canplay", () => {
      playVisibleVideo(video);
      if (video === heroOrbVideo) startBackdropAfterOrb();
    });
    video.addEventListener("error", () => {
      video.classList.add("is-failed");
      if (video === heroOrbVideo) startBackdropAfterOrb();
    }, { once: true });
  }

  // Start a range-stream only while visible; play() lets the browser fetch the first playable chunk.
  const playback = video.play();
  if (playback && playback.catch) playback.catch(() => {});
}

if ("IntersectionObserver" in window) {
  const videoObserver = new IntersectionObserver((entries) => {
    const observations = entries.map((entry) => ({
      entry,
      video: entry.target.matches("video") ? entry.target : entry.target.querySelector("video")
    })).filter(({ video }) => video);
    for (const { entry, video } of observations) videoVisibility.set(video, entry.isIntersecting);
    for (const { entry, video } of observations) setVideoPlayback(video, entry.isIntersecting);
  }, { rootMargin: "240px", threshold: 0.01 });

  if (mainWrapper && backdrop) videoObserver.observe(mainWrapper);
  if (heroOrbVideo) videoObserver.observe(heroOrbVideo);
} else {
  setVideoPlayback(backdrop, false);
  setVideoPlayback(heroOrbVideo, false);
}

const languageToggle = document.querySelector(".language-toggle");
const textTranslations = {
  "مرّر للأسفل لتبدأ": "Scroll to explore",
  "جارٍ تجهيز المشهد": "Preparing the scene",
  "تعذّر تحميل بعض إطارات المشهد": "Some scene frames could not be loaded",
  "دليل عربي مستقل": "Independent guide",
  "الخطوات": "Guide",
  "فيديوهات وصور": "Videos & images",
  "الأمان والخصوصية": "Safety & privacy",
  "الأسئلة الشائعة": "FAQ",
  "التواصل والدعم": "Contact & support",
  "ابدأ من هنا": "Get started",
  "دليل مجاني · شرح واضح · استخدام مسؤول": "Free guide · clear steps · responsible use",
  "خلّي طريقك": "Make your way",
  "إلى": "to",
  "أوضح.": "clearer.",
  "شاهد أمثلة Google Flow، تصفّح المشاهد التفاعلية، وتعرّف على ملف FlowPass ومحتوياته من مكان واحد.": "Explore Google Flow examples, browse the interactive scenes, and learn about the FlowPass file in one place.",
  "شوف الدليل": "Explore the guide",
  "فيديوهات Google Flow": "Google Flow videos",
  "شاهد المشاهد": "Explore scenes",
  "شوف الأمثلة": "View examples",
  "نزّل الملف": "Download",
  "مساحة إعلانية": "Advertisement",
  "Google AdSense": "Google AdSense",
  "مساحة إعلان متجاوبة": "Responsive ad space",
  "سيظهر الإعلان هنا بعد ربط AdSense والحصول على الموافقة": "An ad can appear here after AdSense setup and approval.",
  "01 — ابدأ من هنا": "01 — GET STARTED",
  "تعرّف على Flow،": "Discover Flow,",
  "من الفكرة إلى الفيديو.": "from idea to video.",
  "شاهد المشاهد، تعرّف على محتوى الموقع، ثم انتقل إلى المقاطع أو ملف الإضافة.": "Explore the scenes, see what the site offers, then watch the clips or download the extension.",
  "شاهد المشاهد": "Explore the scenes",
  "ابدأ بتجربة مقدمة التمرير التفاعلية واستكشف الصور التي أعددناها.": "Scroll through the interactive intro and explore the images.",
  "ابدأ المشاهدة": "Start exploring",
  "تصفّح المقاطع": "Browse the clips",
  "اختر أي فيديو من المجموعة وشغّله مباشرة من الصفحة.": "Choose any video and play it right on the page.",
  "شاهد الفيديوهات": "Watch the videos",
  "حمّل ملف FlowPass": "Download FlowPass",
  "نزّل ملف الإضافة المضغوط، وستجد تعليمات التثبيت ضمن محتوياته.": "Download the extension archive; installation instructions are included.",
  "انتقل للتنزيل": "Go to download",
  "02 — مقاطع من المجلد": "02 — FROM YOUR VIDEO FOLDER",
  "شاهد مقاطع Flow": "Watch Flow clips",
  "بوضوح وترتيب.": "clearly and easily.",
  "هذه الفيديوهات من الملفات المرفقة بالموقع. اختر أي مقطع واضغط تشغيل؛ عنوانه وشرحه موجودان تحته مباشرة.": "These videos come from the files supplied with the site. Select a clip to play it; its title and description are right below.",
  "المقطع 01": "CLIP 01",
  "رسوم وحركة Flow": "Flow motion graphics",
  "مشاهد متحركة تعرض أسلوب Flow البصري.": "Animated scenes showcasing Flow’s visual style.",
  "المقطع 02": "CLIP 02",
  "رحلة بين المشاهد": "A journey between scenes",
  "حركة كاميرا تربط لقطات مختلفة بانسيابية.": "A camera move linking different shots smoothly.",
  "المقطع 03": "CLIP 03",
  "من الغابة إلى المشهد التالي": "From the forest to the next scene",
  "مثال بصري على انتقال الكاميرا بين بيئتين.": "A visual example of a camera transition between two environments.",
  "المقطع 04": "CLIP 04",
  "حركة داخل الاستوديو": "Moving through the studio",
  "لقطة متحركة تمرّ عبر مساحة إبداعية.": "A moving shot through a creative space.",
  "المقطع 05": "CLIP 05",
  "من الرسم إلى المشهد": "From sketch to scene",
  "شاهد فكرة مرسومة تتحول إلى لقطة متحركة.": "Watch a drawn idea become a moving shot.",
  "03 — تنزيل المجلد": "03 — DOWNLOAD THE FILE",
  "ملف الإضافة.": "The extension file.",
  "إضافة متصفح Chromium تساعد على الوصول إلى Google Flow. حمّل الملف المضغوط وافتح تعليمات README المرفقة لمعرفة محتوياته وطريقة التثبيت.": "A Chromium browser extension for Google Flow. Download the archive and read the included README for its contents and installation steps.",
  "الإصدار": "Version",
  "الصيغة": "Format",
  "المصدر": "Source",
  "نزّل المجلد مجانًا": "Download the free file",
  "ملف المشروع كما وصلنا،": "Project file as supplied,",
  "ومستودعه على GitHub ↗": "and its GitHub repository ↗",
  "04 — أمانك أولًا": "04 — YOUR SAFETY",
  "استخدمه": "Use it",
  "وأنت مطمّن.": "with care.",
  "هذا الموقع دليل مستقل من المجتمع، وليس تابعًا إلى Google. لا نطلب منك كلمة مرورك أو بيانات الدفع.": "This is an independent community guide and is not affiliated with Google. We never ask for your password or payment details.",
  "استخدم المصادر الرسمية": "Use official sources",
  "راجع صفحات المساعدة وشروط Google.": "Check Google Help and Terms.",
  "لا تشارك بياناتك": "Keep your details private",
  "لا ترسل كلمة المرور أو رموز التحقق لأي شخص.": "Never share your password or verification codes.",
  "افحص الملفات": "Scan files",
  "استخدم مضاد الفيروسات قبل فتح أي ملف.": "Scan files before opening them.",
  "إعلان متجاوب": "Responsive ad placement",
  "05 — أسئلة سريعة": "05 — QUICK QUESTIONS",
  "قبل ما تبدأ": "Before you start",
  "هل الموقع تابع لشركة Google؟": "Is this website affiliated with Google?",
  "لا. هذا موقع مستقل يقدّم محتوى تعليميًا، ولا يمثّل Google أو يرتبط بها.": "No. This is an independent educational website and does not represent or belong to Google.",
  "كيف أعرف إذا Flow متاح في بلدي؟": "How do I check if Flow is available in my country?",
  "راجع": "See",
  "قائمة البلدان والمتطلبات في مركز مساعدة Google Flow": "the supported countries and requirements in Google Flow Help",
  "؛ قد تختلف الميزات حسب المنطقة.": "; features may vary by region.",
  "شو موجود داخل الملف؟": "What is included in the file?",
  "ملفات إضافة FlowPass للمتصفحات المبنية على Chromium، مع واجهة الإضافة وملفاتها وتعليمات README.": "FlowPass extension files for Chromium browsers, including its interface, assets, and README instructions.",
  "هل الإعلانات تعني أن Google تؤيد هذا الموقع؟": "Do ads mean Google endorses this site?",
  "لا. أي إعلانات مستقبلية عبر AdSense لا تعني رعاية Google للموقع أو ارتباطها به. يجب أن يكون المحتوى أصليًا ومفيدًا وأن يلتزم بسياسات الناشرين.": "No. AdSense ads do not mean Google sponsors or is affiliated with this site. Content should be original, useful, and follow publisher policies.",
  "الخصوصية والأمان": "Privacy & safety",
  "الأسئلة الشائعة": "FAQ",
  "التواصل والدعم": "Contact & support",
  "طرق التواصل": "CONTACT",
  "واتساب · +972 59 464 3895": "WhatsApp · +972 59 464 3895",
  "دليل الوصول": "Access guide",
  "محدّث": "Updated",
  "حلول مرتّبة": "Organized solutions",
  "خطوة بخطوة": "Step by step",
  "محتوى مجاني للتوعية والمساعدة. Google وGoogle Flow علامتان تجاريتان لمالكيهما.": "Free educational and helpful content. Google and Google Flow are trademarks of their respective owners."
};

const originalTextNodes = new WeakMap();

function applyLanguage(language) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    if (!originalTextNodes.has(textNode)) originalTextNodes.set(textNode, textNode.nodeValue);
    const original = originalTextNodes.get(textNode);
    const key = original.trim();
    if (language === "en" && Object.prototype.hasOwnProperty.call(textTranslations, key)) {
      const leading = original.match(/^\s*/)[0];
      const trailing = original.match(/\s*$/)[0];
      textNode.nodeValue = leading + textTranslations[key] + trailing;
    } else if (language === "ar") {
      textNode.nodeValue = original;
    }
  }

  const english = language === "en";
  document.documentElement.lang = english ? "en" : "ar";
  document.documentElement.dir = english ? "ltr" : "rtl";
  document.title = english ? "Flow Guide — Google Flow clips and guide" : "Flow Guide — دليلك لحل مشكلة Google Flow";
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = english
    ? "Explore Google Flow clips, local videos, and interactive scenes in this Arabic and English guide."
    : "دليل عربي لمقاطع وأدوات Google Flow، مع فيديوهات محلية ومشاهد تفاعلية.";
  if (languageToggle) {
    languageToggle.textContent = english ? "عربي" : "EN";
    languageToggle.setAttribute("aria-label", english ? "Switch to Arabic" : "Switch to English");
  }
  try { localStorage.setItem("flow-guide-language", language); } catch (_) {}
}

let currentLanguage = "ar";
try { currentLanguage = localStorage.getItem("flow-guide-language") || "ar"; } catch (_) {}
applyLanguage(currentLanguage);

if (languageToggle) {
  languageToggle.addEventListener("click", () => {
    currentLanguage = currentLanguage === "ar" ? "en" : "ar";
    applyLanguage(currentLanguage);
  });
}
