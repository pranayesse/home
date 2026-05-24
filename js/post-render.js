/**
 * post-render.js
 * ==============
 * Shared rendering logic for all individual post pages (posts/<slug>.html).
 * Fetches the matching .md file, renders it with marked.js, and wires up
 * prev/next navigation from BLOG_POSTS.
 *
 * Requires: marked.js, blog-data.js — both loaded before this script.
 */
(function () {
  // Derive slug from URL pathname: /posts/my-slug.html → my-slug
  var slug = window.location.pathname.split('/').pop().replace('.html', '');

  var bodyEl = document.getElementById('post-body');
  var prevEl = document.getElementById('prev-post');
  var nextEl = document.getElementById('next-post');

  if (!slug || typeof BLOG_POSTS === 'undefined') return;

  var idx = -1;
  for (var i = 0; i < BLOG_POSTS.length; i++) {
    if (BLOG_POSTS[i].slug === slug) { idx = i; break; }
  }

  // Prev / Next navigation
  if (prevEl) {
    if (idx > 0) {
      prevEl.href = BLOG_POSTS[idx - 1].slug + '.html';
      prevEl.textContent = '← ' + BLOG_POSTS[idx - 1].title.substring(0, 38) + '…';
    } else {
      prevEl.style.visibility = 'hidden';
    }
  }
  if (nextEl) {
    if (idx !== -1 && idx < BLOG_POSTS.length - 1) {
      nextEl.href = BLOG_POSTS[idx + 1].slug + '.html';
      nextEl.textContent = BLOG_POSTS[idx + 1].title.substring(0, 38) + '… →';
    } else {
      nextEl.style.visibility = 'hidden';
    }
  }

  // Fetch and render markdown
  if (!bodyEl) return;
  fetch(slug + '.md')
    .then(function (r) {
      if (!r.ok) throw new Error('not found');
      return r.text();
    })
    .then(function (md) {
      bodyEl.innerHTML = marked.parse(md);
    })
    .catch(function () {
      bodyEl.innerHTML =
        '<p style="color:var(--muted);font-family:var(--mono);padding:2rem 0;">' +
        'Post content coming soon. Check back shortly.' +
        '</p>';
    });
})();
