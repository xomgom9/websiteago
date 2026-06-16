(() => {
  const FDA_2026_SRC = "/assets/fda-certificate-2026-image.webp?v=20260616-uploaded";

  function applyImageStyle(img) {
    img.src = FDA_2026_SRC;
    img.alt = "FDA Certification of Registration 2026";
    img.loading = "lazy";
    img.decoding = "async";
    img.dataset.fda2026 = "true";
    img.style.display = "block";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.objectFit = "contain";
  }

  function swapFdaCertificate() {
    const images = document.querySelectorAll('.cert-image-fda img, img[alt*="FDA" i], img[src*="fda" i], img[src*="certificate" i]');
    let swapped = false;

    images.forEach((img) => {
      if (img.dataset.fda2026 === "true" && img.src.includes(FDA_2026_SRC)) return;
      applyImageStyle(img);
      swapped = true;
    });

    const certContainers = document.querySelectorAll('.cert-image-fda, [class*="fda" i], [class*="certificate" i]');
    certContainers.forEach((container) => {
      if (container.querySelector('img[data-fda2026="true"]')) return;
      const img = document.createElement("img");
      applyImageStyle(img);
      container.appendChild(img);
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
