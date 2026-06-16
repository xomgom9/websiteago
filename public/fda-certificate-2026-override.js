(() => {
  const FDA_2026_SRC = "/assets/fda-certificate-2026-image.webp?v=20260616-fda-only";

  function swapFdaCertificate() {
    const fdaImages = document.querySelectorAll(".cert-image-fda img");
    let swapped = false;

    fdaImages.forEach((img) => {
      if (img.dataset.fda2026 === "true") return;
      img.src = FDA_2026_SRC;
      img.alt = "FDA certificate placeholder";
      img.loading = "lazy";
      img.decoding = "async";
      img.dataset.fda2026 = "true";
      img.style.display = "block";
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.objectFit = "contain";
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
