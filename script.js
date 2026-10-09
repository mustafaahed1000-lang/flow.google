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

const sequence = document.querySelector("#scroll-sequence");
const canvas = document.querySelector("#sequence-canvas");
let drawSequence = () => {};

if (sequence && canvas) {
  const context = canvas.getContext("2d", { alpha: false });
  const indicator = sequence.querySelector(".scroll-indicator");
  const frameCount = 240;
  const framesPath = "./فديوهات موقع/frames_Camera_moving_through_creative_s…_20261009001547-upscaled-2x.mp4_30fps_png/frame_";
  const frameCache = new Map();
  let targetIndex = 0;
  let lastPainted = -1;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let renderQueued = false;

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      drawSequence();
    });
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvasWidth = Math.round(window.innerWidth * ratio);
    canvasHeight = Math.round(window.innerHeight * ratio);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    lastPainted = -1;
    queueRender();
  }

  function drawCover(image) {
    const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (canvasWidth - width) / 2;
    const y = (canvasHeight - height) / 2;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, x, y, width, height);
  }

  function trimCache() {
    const min = Math.max(0, targetIndex - 3);
    const max = Math.min(frameCount - 1, targetIndex + 7);
    for (const [index] of frameCache) {
      if ((index < min || index > max) && frameCache.size > 12) frameCache.delete(index);
    }
  }

  function loadFrame(index) {
    if (index < 0 || index >= frameCount) return null;
    if (frameCache.has(index)) return frameCache.get(index);

    const image = new Image();
    image.decoding = "async";
    frameCache.set(index, image);
    image.onload = () => {
      if (index === targetIndex) {
        drawCover(image);
        lastPainted = index;
      }
      trimCache();
    };
    image.onerror = () => frameCache.delete(index);
    image.src = framesPath + String(index).padStart(6, "0") + ".png";
    return image;
  }

  drawSequence = function () {
    const scrollable = Math.max(1, sequence.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -sequence.getBoundingClientRect().top / scrollable));
    targetIndex = Math.round(progress * (frameCount - 1));

    if (indicator) indicator.classList.toggle("is-hidden", progress > 0.06);

    const current = loadFrame(targetIndex);
    for (let offset = 1; offset <= 3; offset++) loadFrame(targetIndex + offset);

    if (current && current.complete && current.naturalWidth && lastPainted !== targetIndex) {
      drawCover(current);
      lastPainted = targetIndex;
    }
    trimCache();
  };

  window.addEventListener("scroll", queueRender, { passive: true });
  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
}

const mainWrapper = document.querySelector(".main-content-wrapper");
const backdrop = document.querySelector(".bg-video");
const heroOrbVideo = document.querySelector(".hero-video-orb");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setVideoPlayback(video, shouldPlay) {
  if (!video) return;
  if (shouldPlay && !reducedMotion) {
    const playback = video.play();
    if (playback && playback.catch) playback.catch(() => {});
  } else {
    video.pause();
  }
}

function syncDecorativeVideos() {
  const sequenceFinished = !sequence || sequence.getBoundingClientRect().bottom <= 0;
  if (!sequenceFinished) {
    setVideoPlayback(backdrop, false);
    setVideoPlayback(heroOrbVideo, false);
    return;
  }

  if (mainWrapper && backdrop) {
    const pageRect = mainWrapper.getBoundingClientRect();
    setVideoPlayback(backdrop, pageRect.top < window.innerHeight && pageRect.bottom > 0);
  }

  if (heroOrbVideo) {
    const orbRect = heroOrbVideo.getBoundingClientRect();
    setVideoPlayback(heroOrbVideo, orbRect.top < window.innerHeight && orbRect.bottom > 0);
  }
}

window.addEventListener("scroll", syncDecorativeVideos, { passive: true });
window.addEventListener("resize", syncDecorativeVideos, { passive: true });
syncDecorativeVideos();

const languageToggle = document.querySelector(".language-toggle");
const textTranslations = {
  "مرّر للأسفل لتبدأ": "Scroll to explore",
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
