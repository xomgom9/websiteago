(() => {
  const FDA_2026_SRC = "/assets/fda-certificate-2026-image.webp?v=20260616-2";

  function swapFdaCertificate() {
    const images = document.querySelectorAll('.cert-image-fda img, img[alt*="FDA" i]');
    let swapped = false;

    images.forEach((img) => {
      if (img.dataset.fda2026 === "true") return;
      img.src = FDA_2026_SRC;
      img.alt = "FDA Certification of Registration 2026";
      img.dataset.fda2026 = "true";
      swapped = true;
    });

    return swapped;
  }

  function run() {
    swapFdaCertificate();

    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      const done = swapFdaCertificate();
      if (done || attempts >= 40) window.clearInterval(interval);
    }, 250);

    const observer = new MutationObserver(() => swapFdaCertificate());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
