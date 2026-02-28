// ── ACTIVE NAV ON SCROLL ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-icon');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 200) current = s.id;
  });
  navLinks.forEach(l => {
    l.classList.toggle('active', l.dataset.section === current);
  });
});

// ── MODAL HELPERS ──
const blogModal  = document.getElementById('blog-modal');
const writeModal = document.getElementById('write-modal');

document.getElementById('open-write-btn').addEventListener('click', () => {
  currentEditId = null;
  document.getElementById('post-title').value   = '';
  document.getElementById('post-tag').value     = '';
  document.getElementById('post-content').value = '';
  document.querySelector('#write-modal .modal-header h2').textContent = 'Write New Post';
  document.getElementById('publish-btn').textContent = 'Publish Post →';
  document.getElementById('publish-status').style.display = 'none';
  writeModal.classList.add('open');
});

document.getElementById('close-write-modal').addEventListener('click', () => writeModal.classList.remove('open'));
document.getElementById('close-blog-modal').addEventListener('click', () => blogModal.classList.remove('open'));

blogModal.addEventListener('click',  e => { if (e.target === blogModal)  blogModal.classList.remove('open'); });
writeModal.addEventListener('click', e => { if (e.target === writeModal) writeModal.classList.remove('open'); });

// ── CONTACT FORM ──
document.getElementById('cf-submit').addEventListener('click', () => {
  const status = document.getElementById('cf-status');
  status.textContent = '✓ Message sent! (Connect EmailJS or Formspree to activate)';
  status.style.display = 'block';
  setTimeout(() => (status.style.display = 'none'), 4000);
});

// ── BLOG STATE ──
let allPosts      = [];
let currentEditId = null;
let firebaseReady = false;
let fbDb          = null;
let fbMod         = null;

// ── LOCAL STORAGE (default storage — always works) ──
const LS_KEY = 'portfolio_blog_posts';
const ls = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  },
  save(posts) { localStorage.setItem(LS_KEY, JSON.stringify(posts)); },
  add(data) {
    const posts = this.getAll();
    const entry = {
      ...data,
      id:   Date.now().toString(36) + Math.random().toString(36).slice(2),
      date: new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }),
    };
    posts.unshift(entry);
    this.save(posts);
    return posts;
  },
  update(id, data) {
    const posts = this.getAll().map(p => p.id === id ? { ...p, ...data } : p);
    this.save(posts);
    return posts;
  },
  remove(id) {
    const posts = this.getAll().filter(p => p.id !== id);
    this.save(posts);
    return posts;
  },
};

// ── BLOG: OPEN POST MODAL ──
function openPost(id) {
  const p = allPosts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-tag').textContent     = p.tag || 'Post';
  document.getElementById('modal-title').textContent   = p.title;
  document.getElementById('modal-date').textContent    = p.date;
  document.getElementById('modal-content').textContent = p.content;
  blogModal.classList.add('open');
}
window.openPost = openPost;

// ── BLOG: RENDER POSTS ──
function renderPosts(posts) {
  const container = document.getElementById('blog-posts-container');
  if (!posts.length) {
    container.innerHTML = '<div class="empty-state">No posts yet. Write your first one! ✍️</div>';
    return;
  }
  container.innerHTML = posts.map(p => `
    <div class="blog-card" onclick="openPost('${p.id}')">
      <div class="blog-card-img">
        <span style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:#333;letter-spacing:0.1em">${p.tag || 'Blog'}</span>
      </div>
      <div class="blog-card-body">
        <div class="blog-tag">${p.tag || 'Post'}</div>
        <h3>${p.title}</h3>
        <p>${p.content.slice(0, 100)}${p.content.length > 100 ? '...' : ''}</p>
        <div class="blog-date">${p.date}</div>
        <div class="blog-card-actions">
          <button class="blog-action-btn" onclick="editPost('${p.id}', event)">Edit</button>
          <button class="blog-action-btn delete" onclick="deletePost('${p.id}', event)">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── BLOG: EDIT ──
window.editPost = function(id, event) {
  event.stopPropagation();
  const p = allPosts.find(x => x.id === id);
  if (!p) return;
  currentEditId = id;
  document.getElementById('post-title').value   = p.title;
  document.getElementById('post-tag').value     = p.tag || '';
  document.getElementById('post-content').value = p.content;
  document.querySelector('#write-modal .modal-header h2').textContent = 'Edit Post';
  document.getElementById('publish-btn').textContent = 'Update Post →';
  document.getElementById('publish-status').style.display = 'none';
  writeModal.classList.add('open');
};

// ── BLOG: DELETE ──
window.deletePost = async function(id, event) {
  event.stopPropagation();
  if (!confirm('Delete this post? This cannot be undone.')) return;
  if (firebaseReady) {
    try {
      await fbMod.deleteDoc(fbMod.doc(fbDb, 'posts', id));
    } catch (err) {
      alert('Error deleting post: ' + err.message);
      return;
    }
  } else {
    ls.remove(id);
  }
  allPosts = allPosts.filter(p => p.id !== id);
  renderPosts(allPosts);
};

// ── BLOG: PUBLISH / UPDATE (registered immediately — always works) ──
document.getElementById('publish-btn').addEventListener('click', async () => {
  const title   = document.getElementById('post-title').value.trim();
  const tag     = document.getElementById('post-tag').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const status  = document.getElementById('publish-status');

  if (!title || !content) {
    status.textContent   = '⚠ Title and content are required.';
    status.style.color   = '#f59e0b';
    status.style.display = 'block';
    return;
  }

  status.style.color   = 'var(--lime)';
  status.style.display = 'block';

  try {
    if (firebaseReady) {
      // ── Firebase path ──
      if (currentEditId) {
        status.textContent = 'Updating...';
        await fbMod.updateDoc(fbMod.doc(fbDb, 'posts', currentEditId), { title, tag, content });
        status.textContent = '✓ Post updated!';
      } else {
        status.textContent = 'Publishing...';
        await fbMod.addDoc(fbMod.collection(fbDb, 'posts'), {
          title, tag, content, createdAt: fbMod.serverTimestamp(),
        });
        status.textContent = '✓ Post published!';
      }
      // Reload from Firestore to get accurate server timestamp / order
      const q    = fbMod.query(fbMod.collection(fbDb, 'posts'), fbMod.orderBy('createdAt', 'desc'));
      const snap = await fbMod.getDocs(q);
      allPosts   = snap.docs.map(d => ({
        id: d.id, ...d.data(),
        date: d.data().createdAt?.toDate()
          .toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) || 'Draft',
      }));
      renderPosts(allPosts);
    } else {
      // ── localStorage path ──
      if (currentEditId) {
        status.textContent = 'Saving...';
        allPosts = ls.update(currentEditId, { title, tag, content });
        status.textContent = '✓ Post updated!';
      } else {
        status.textContent = 'Saving...';
        allPosts = ls.add({ title, tag, content });
        status.textContent = '✓ Post published!';
      }
      renderPosts(allPosts);
    }

    // Reset form & modal
    document.getElementById('post-title').value   = '';
    document.getElementById('post-tag').value     = '';
    document.getElementById('post-content').value = '';
    currentEditId = null;
    document.querySelector('#write-modal .modal-header h2').textContent = 'Write New Post';
    document.getElementById('publish-btn').textContent = 'Publish Post →';

    setTimeout(() => {
      writeModal.classList.remove('open');
      status.style.display = 'none';
    }, 1500);
  } catch (err) {
    status.textContent = '✕ Error: ' + err.message;
    status.style.color = '#ef4444';
  }
});

// ── FIREBASE (optional upgrade — switches storage to Firestore when configured) ──
window.addEventListener('firebase-ready', async () => {
  fbDb  = window._db;
  fbMod = window._fbModules;

  try {
    const q    = fbMod.query(fbMod.collection(fbDb, 'posts'), fbMod.orderBy('createdAt', 'desc'));
    const snap = await fbMod.getDocs(q);
    firebaseReady = true;
    allPosts = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date: d.data().createdAt
        ?.toDate()
        .toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
        || 'Draft',
    }));
    renderPosts(allPosts);
  } catch {
    // Firebase not configured or unreachable — localStorage mode stays active
    console.info('Firebase unavailable — blog running on localStorage.');
  }
});

// ── INITIAL RENDER (show localStorage posts right away, before Firebase resolves) ──
allPosts = ls.getAll();
renderPosts(allPosts);
