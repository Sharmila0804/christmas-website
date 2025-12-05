const API_BASE = './api.php';
const LIKED_KEY = 'xmas_liked_v1';
let state = { comments: [] };
let likedSet = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));

const commentsList = document.getElementById('comments-list');
const wishForm = document.getElementById('wish-form');
const nameInput = document.getElementById('name');
const wishInput = document.getElementById('wish');
const anonymousCheckbox = document.getElementById('anonymous');
const top1 = document.getElementById('top1');
const top2 = document.getElementById('top2');
const top3 = document.getElementById('top3');
const clearStorageBtn = document.getElementById('clear-storage');

function uid() { return 'id_' + Math.random().toString(36).slice(2, 9); }
function now() { return Date.now(); }
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if(diff < 1) return 'just now';
    if(diff === 1) return '1 minute ago';
    if(diff < 60) return diff + ' minutes ago';
    const h = Math.floor(diff / 60);
    if(h === 1) return '1 hour ago';
    if(h < 24) return h + ' hours ago';
    const d = Math.floor(h / 24);
    return d === 1 ? '1 day ago' : d + ' days ago';
}

// ------------------------
// Load comments from server
// ------------------------
async function load() {
    try {
        const res = await fetch(`${API_BASE}?action=comments`);
        state.comments = await res.json();
        renderComments();
    } catch (e) {
        console.error('Failed to load comments', e);
        state.comments = [];
    }
}

// ------------------------
// Add comment (optimistic update)
// ------------------------
async function addComment(name, text) {
    const c = { id: uid(), name: name || 'Anonymous', text: text || '', likes: 0, timestamp: now() };
    
    // Immediately show in UI
    state.comments.unshift(c);
    renderComments();

    // Send to server
    try {
        const res = await fetch(`${API_BASE}?action=comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c)
        });
        const data = await res.json();
        if(!data.ok) {
            console.error(data.error);
            // Remove comment from UI if failed
            state.comments = state.comments.filter(x => x.id !== c.id);
            renderComments();
        }
    } catch(e) {
        console.error('Failed to add comment', e);
        state.comments = state.comments.filter(x => x.id !== c.id);
        renderComments();
    }
}

// ------------------------
// Handle likes
// ------------------------
async function handleLike(commentId) {
    const likedAlready = likedSet.has(commentId);
    try {
        await fetch(`${API_BASE}?action=like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: commentId, action: likedAlready ? 'unlike' : 'like' })
        });
        likedAlready ? likedSet.delete(commentId) : likedSet.add(commentId);
        localStorage.setItem(LIKED_KEY, JSON.stringify([...likedSet]));
        load();
    } catch(e) { console.error(e); }
}

// ------------------------
// Render comments & top 3
// ------------------------
function renderComments() {
    state.comments.sort((a, b) => b.likes - a.likes || b.timestamp - a.timestamp);
    commentsList.innerHTML = '';
    state.comments.forEach(comment => {
        const li = document.createElement('li');
        li.className = 'comment';
        li.dataset.id = comment.id;
        const likedAlready = likedSet.has(comment.id);
        li.innerHTML = `
        <div class="meta">
            <div>
                <div class="name">${escapeHTML(comment.name)}</div>
                <div class="time">${timeAgo(comment.timestamp)}</div>
            </div>
            <div class="score"><strong>${comment.likes}</strong></div>
        </div>
        <div class="text">${escapeHTML(comment.text)}</div>
        <div class="like-row">
            <button class="like-btn ${likedAlready ? 'liked' : ''}" data-id="${comment.id}">
                <span>${likedAlready ? '❤️' : '🤍'}</span> <span>${likedAlready ? 'Liked' : 'Like'}</span>
            </button>
        </div>`;
        commentsList.appendChild(li);
    });

    // Top 3 comments
    top1.textContent = state.comments[0]?.text || '';
    top2.textContent = state.comments[1]?.text || '';
    top3.textContent = state.comments[2]?.text || '';

    commentsList.scrollTop = commentsList.scrollHeight;
}

// ------------------------
// Event listeners
// ------------------------
wishForm.addEventListener('submit', e => {
    e.preventDefault();
    let name = nameInput.value.trim();
    if (anonymousCheckbox.checked) name = 'Anonymous';
    const text = wishInput.value.trim();
    if(!text) return wishInput.focus();
    addComment(name, text);
    wishForm.reset();
});

commentsList.addEventListener('click', e => {
    const btn = e.target.closest('.like-btn');
    if(!btn) return;
    handleLike(btn.dataset.id);
});

clearStorageBtn.addEventListener('click', () => {
    if(!confirm('Clear local likes?')) return;
    localStorage.removeItem(LIKED_KEY);
    likedSet.clear();
    renderComments();
});

window.addEventListener('DOMContentLoaded', () => { load(); });
