/* ===========================================
   Backend API
   =========================================== */
const API_BASE = 'http://localhost:5000/api';
const LIKED_KEY = 'xmas_liked_v1';

/* ------------------------
   Helpers
   ------------------------ */
function uid() { return 'id_' + Math.random().toString(36).slice(2, 9); }
function now() { return Date.now(); }
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}
function timeAgo(ts){
  const diff = Math.floor((Date.now() - ts)/60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 minute ago';
  if (diff < 60) return `${diff} minutes ago`;
  const h = Math.floor(diff/60);
  if (h === 1) return '1 hour ago';
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h/24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

/* ------------------------
   App state
   ------------------------ */
let state = { comments: [] };
let likedSet = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));

/* ------------------------
   DOM references
   ------------------------ */
const commentsList = document.getElementById('comments-list');
const wishForm = document.getElementById('wish-form');
const nameInput = document.getElementById('name');
const wishInput = document.getElementById('wish');
const anonymousCheckbox = document.getElementById('anonymous');
const top1 = document.getElementById('top1');
const top2 = document.getElementById('top2');
const top3 = document.getElementById('top3');
const clearStorageBtn = document.getElementById('clear-storage');
const music = document.getElementById('christmas-music');
const toggleSnowBtn = document.getElementById('toggle-snow');
const snowContainer = document.getElementById('snow-container');

/* ===========================================
   Backend API functions
   =========================================== */
async function load() {
    try {
        const res = await fetch(`${API_BASE}/comments`);
        state.comments = await res.json();
        renderComments();
    } catch (e) {
        console.error("Load error", e);
        state.comments = [];
        renderComments();
    }
}

async function addComment(name, text) {
    const c = { id: uid(), name, text, timestamp: now() };
    try {
        await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c)
        });
        await load();
    } catch (e) { console.error("Add error", e); }
}

async function handleLike(commentId) {
    if (likedSet.has(commentId)) return;
    try {
        await fetch(`${API_BASE}/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: commentId })
        });
        likedSet.add(commentId);
        localStorage.setItem(LIKED_KEY, JSON.stringify([...likedSet]));
        await load();
    } catch (e) { console.error("Like error", e); }
}

/* ------------------------
   Render comments & top3
   ------------------------ */
function renderComments() {
    state.comments.sort((a,b) => b.likes - a.likes || b.timestamp - a.timestamp);
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
            <div class="time" aria-hidden="true">${timeAgo(comment.timestamp)}</div>
          </div>
          <div class="score"><strong>${comment.likes}</strong></div>
        </div>
        <div class="text">${escapeHTML(comment.text)}</div>
        <div class="like-row">
          <button class="like-btn ${likedAlready ? 'liked' : ''}" aria-pressed="${likedAlready ? 'true' : 'false'}" data-id="${comment.id}">
            <span class="icon">${likedAlready ? '❤️' : '🤍'}</span>
            <span class="label">${likedAlready ? 'Liked' : 'Like'}</span>
          </button>
          <div class="time-small" aria-hidden="true">${timeAgo(comment.timestamp)}</div>
        </div>
        `;
        commentsList.appendChild(li);
    });

    // Top 3 wishes
    top1.textContent = state.comments[0]?.text || '';
    top2.textContent = state.comments[1]?.text || '';
    top3.textContent = state.comments[2]?.text || '';
}

/* ------------------------
   Form and buttons
   ------------------------ */
wishForm.addEventListener('submit', e=>{
    e.preventDefault();
    let name = nameInput.value.trim();
    if (anonymousCheckbox.checked) name='Anonymous';
    const text = wishInput.value.trim();
    if(!text){wishInput.focus(); return;}
    addComment(name, text);
    wishForm.reset();
    nameInput.focus();
});

commentsList.addEventListener('click', e=>{
    const btn = e.target.closest('.like-btn');
    if(!btn) return;
    handleLike(btn.dataset.id);
});

clearStorageBtn.addEventListener('click', ()=>{
    if(!confirm('Clear local likes?')) return;
    localStorage.removeItem(LIKED_KEY);
    likedSet.clear();
    renderComments();
});

/* ------------------------
   Music setup
   ------------------------ */
function setupMusic(){
    music.play().catch(()=>{
        const startMusic = ()=>{ music.play().catch(()=>{}); };
        window.addEventListener('click', startMusic, {once:true});
        window.addEventListener('touchstart', startMusic, {once:true});
    });
}

/* ------------------------
   Snow animation
   ------------------------ */
let snowInterval=null, snowOn=true;
function createSnowflake(){
    const el=document.createElement('div');
    el.className='snowflake';
    el.style.position='absolute';
    el.style.top='-10vh';
    el.style.left=(Math.random()*100)+'vw';
    const size=8+Math.random()*28; el.style.fontSize=size+'px';
    el.style.pointerEvents='none'; el.textContent='❄️';
    el.style.opacity=(0.2+Math.random()*0.9).toString();
    const duration=6+Math.random()*12;
    snowContainer.appendChild(el);
    const endX=(Math.random()*40-20);
    el.animate([{transform:'translate3d(0,0,0)'},{transform:`translate3d(${endX}vw,${100+Math.random()*20}vh,0)`}],
      {duration:duration*1000,easing:'linear',iterations:1,fill:'forwards'});
    setTimeout(()=>el.remove(),duration*1000+200);
}
function startSnow(){if(snowInterval)return;snowInterval=setInterval(createSnowflake,150);snowOn=true;toggleSnowBtn.textContent='Toggle Snow';}
function stopSnow(){clearInterval(snowInterval);snowInterval=null;snowOn=false;toggleSnowBtn.textContent='Snow off';}
toggleSnowBtn.addEventListener('click',()=>{if(snowOn) stopSnow(); else startSnow();});

/* ------------------------
   Boot
   ------------------------ */
function boot(){
    load();
    setupMusic();
    startSnow();
}
window.addEventListener('DOMContentLoaded', boot);

/* ------------------------
   Refresh timestamps every minute
   ------------------------ */
setInterval(()=>{ renderComments(); }, 60000);
