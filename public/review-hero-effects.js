(() => {
  const values = [4.5, 4.6, 4.7, 4.8, 4.9, 5.0];

  function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function ratingFor(seed) {
    return values[hashText(seed) % values.length];
  }

  function makeStar(className) {
    const star = document.createElement('span');
    star.className = `star ${className}`;
    star.textContent = '★';
    return star;
  }

  function makeRatingNode(rating) {
    const wrapper = document.createElement('div');
    wrapper.className = 'comment-rating';
    wrapper.setAttribute('aria-label', `${rating.toFixed(1)} out of 5 star customer rating`);

    const stars = document.createElement('span');
    stars.className = 'comment-rating-stars';
    stars.setAttribute('aria-hidden', 'true');

    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5 && fullStars < 5;
    for (let i = 0; i < 5; i += 1) {
      const type = i < fullStars ? 'full' : i === fullStars && hasHalf ? 'half' : 'empty';
      stars.appendChild(makeStar(type));
    }

    const score = document.createElement('span');
    score.className = 'comment-rating-score';
    score.textContent = `${rating.toFixed(1)}/5`;

    wrapper.appendChild(stars);
    wrapper.appendChild(score);
    return wrapper;
  }

  function decorateReviewCards() {
    const cards = document.querySelectorAll('.stories .comment-card');
    cards.forEach((card) => {
      if (card.querySelector('.comment-rating')) return;
      const meta = card.querySelector('.comment-meta');
      if (!meta) return;
      const name = meta.querySelector('strong')?.textContent?.trim() || '';
      const status = meta.querySelector('span')?.textContent?.trim() || '';
      const rating = ratingFor(`${name}-${status}`);
      meta.insertAdjacentElement('afterend', makeRatingNode(rating));
    });
  }

  function makeText(value) {
    return document.createTextNode(value);
  }

  function makeHighlight(value, className) {
    const span = document.createElement('span');
    span.className = `hero-highlight ${className}`;
    span.textContent = value;
    return span;
  }

  function highlightHeroHeadline() {
    const heading = document.querySelector('.hero h1');
    if (!heading || heading.dataset.highlightReady === '1') return;
    const text = heading.textContent.trim().replace(/\s+/g, ' ');
    if (text !== 'Still Hoping for a Baby After Months or Years of Trying?') return;

    heading.textContent = '';
    heading.setAttribute('aria-label', text);
    heading.appendChild(makeText('Still Hoping for a Baby '));
    heading.appendChild(makeHighlight('After Months', 'hero-highlight-months'));
    heading.appendChild(makeText(' or '));
    heading.appendChild(makeHighlight('Years of Trying?', 'hero-highlight-years'));
    heading.dataset.highlightReady = '1';
  }

  function applyEnhancements() {
    highlightHeroHeadline();
    decorateReviewCards();
  }

  function start() {
    applyEnhancements();
    const observer = new MutationObserver(applyEnhancements);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(applyEnhancements, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
