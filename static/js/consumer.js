// consumer.js — Browse, search, photo detail, comments
let _page=1, _query='', _hasMore=false;

async function loadPhotos(reset=true){
  if(reset){_page=1;_query='';_hasMore=false;}
  show('grid-loader',true);
  try{
    const d=await api('GET',`/photos/?page=${_page}&limit=12`);
    renderCards(d.photos,reset);_hasMore=d.has_more;updateLM();
  }catch(e){showToast(e.message,'error');}
  finally{show('grid-loader',false);}
}

async function doSearch(){
  const q=document.getElementById('search-input').value.trim();
  _query=q;_page=1;
  document.getElementById('photo-grid').innerHTML='';
  show('grid-loader',true);
  try{
    const path=q?`/photos/search?q=${encodeURIComponent(q)}&page=1&limit=12`:`/photos/?page=1&limit=12`;
    const d=await api('GET',path);
    renderCards(d.photos,true);_hasMore=d.has_more;updateLM();
    const lbl=document.getElementById('search-label');
    if(q){lbl.style.display='block';lbl.textContent=`Results for "${q}" — ${d.photos.length} found`;}
    else lbl.style.display='none';
  }catch(e){showToast(e.message,'error');}
  finally{show('grid-loader',false);}
}

function clearSearch(){
  document.getElementById('search-input').value='';
  document.getElementById('search-label').style.display='none';
  loadPhotos(true);
}

async function loadMore(){
  if(!_hasMore)return;_page++;
  const btn=document.getElementById('load-more-btn');btn.textContent='Loading…';btn.disabled=true;
  try{
    const path=_query?`/photos/search?q=${encodeURIComponent(_query)}&page=${_page}&limit=12`:`/photos/?page=${_page}&limit=12`;
    const d=await api('GET',path);renderCards(d.photos,false);_hasMore=d.has_more;updateLM();
  }catch(e){showToast(e.message,'error');}
  finally{btn.textContent='Load More';btn.disabled=false;}
}

function renderCards(photos,reset){
  const grid=document.getElementById('photo-grid');
  if(reset)grid.innerHTML='';
  document.getElementById('empty').style.display=(!photos.length&&reset)?'block':'none';
  photos.forEach((p,i)=>{
    const card=document.createElement('div');
    card.className='photo-card anim-in';
    card.style.animationDelay=(i%12*.05)+'s';
    const tags=(p.tags||[]).slice(0,2).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
    const rating=p.avg_rating?`<span style="color:var(--blue)">★ ${parseFloat(p.avg_rating).toFixed(1)}</span>`:'';
    card.innerHTML=`
      <div class="photo-card-img">
        <img src="${p.blob_url||ph()}" alt="${esc(p.title)}" loading="lazy" onerror="this.src='${ph()}'"/>
        <div class="photo-card-overlay"><div class="overlay-title">${esc(p.title||'Untitled')}</div></div>
      </div>
      <div class="photo-card-body">
        <div class="photo-card-title">${esc(p.title||'Untitled')}</div>
        <div class="photo-card-meta">
          ${p.location?`<span>📍 ${esc(p.location)}</span>`:''}
          ${rating}
          <span>${fmtDate(p.uploaded_at)}</span>
        </div>
        ${tags?`<div class="tags-row" style="margin-top:8px">${tags}</div>`:''}
      </div>`;
    card.onclick=()=>window.location.href=`/photo?id=${p.id}`;
    grid.appendChild(card);
  });
}

async function loadPhotoDetail(photoId){
  try{
    const p=await api('GET',`/photos/${photoId}`);fillDetail(p);
    await loadComments(photoId);
  }catch(e){showToast(e.message,'error');setTimeout(()=>window.location.href='/browse',2000);}
  finally{
    document.getElementById('page-loader').style.display='none';
    document.getElementById('photo-content').style.display='block';
  }
}

function fillDetail(p){
  document.title=`SnapVault — ${p.title}`;
  document.getElementById('photo-img').src=p.blob_url||ph();
  document.getElementById('photo-title').textContent=p.title||'Untitled';
  document.getElementById('photo-caption').textContent=p.caption||'—';
  document.getElementById('photo-location').textContent=p.location||'—';
  document.getElementById('photo-creator').textContent=p.creator_username||'—';
  document.getElementById('photo-date').textContent=fmtDate(p.uploaded_at);
  document.getElementById('photo-people').textContent=(p.people_present&&p.people_present.length)?p.people_present.join(', '):'—';
  const avg=parseFloat(p.avg_rating)||0;
  document.getElementById('avg-rating').textContent=avg.toFixed(1);
  document.getElementById('avg-stars').innerHTML=starsHTML(avg,18);
  document.getElementById('rating-count').textContent=`${p.rating_count||0} ratings`;
  if(p.tags&&p.tags.length){
    document.getElementById('ai-tags-wrap').style.display='block';
    document.getElementById('ai-tags').innerHTML=p.tags.map(t=>`<span class="tag">🤖 ${esc(t)}</span>`).join('');
  }
}

async function loadComments(photoId){
  const el=document.getElementById('comments-list');
  try{
    const d=await api('GET',`/comments/${photoId}`);
    if(!d.comments.length){el.innerHTML='<p style="font-size:12px;color:var(--text-3);padding:.5rem 0">No comments yet — be the first!</p>';return;}
    el.innerHTML=d.comments.map(c=>`
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-user">${esc(c.username||'user')}</span>
          ${c.rating?`<span class="comment-stars">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>`:''}
        </div>
        <div class="comment-text">${esc(c.text)}</div>
        <div class="comment-footer"><span class="comment-date">${fmtDate(c.created_at)}</span></div>
      </div>`).join('');
  }catch{el.innerHTML='<p style="font-size:12px;color:var(--text-3)">Could not load comments.</p>';}
}

async function submitComment(){
  const text=document.getElementById('comment-text').value.trim();
  if(!text){showToast('Comment cannot be empty','error');return;}
  const photoId=new URLSearchParams(window.location.search).get('id');
  const btn=document.getElementById('comment-btn');
  document.getElementById('comment-btn-txt').style.display='none';
  document.getElementById('comment-ld').style.display='inline-block';
  btn.disabled=true;
  try{
    await api('POST','/comments/',{photo_id:photoId,text,rating:selectedRating||null});
    document.getElementById('comment-text').value='';
    selectedRating=0;document.querySelectorAll('#star-input .star').forEach(s=>s.classList.remove('active'));
    showToast('Comment posted!','success');
    await loadComments(photoId);
    const ph2=await api('GET',`/photos/${photoId}`);
    document.getElementById('avg-rating').textContent=parseFloat(ph2.avg_rating||0).toFixed(1);
    document.getElementById('avg-stars').innerHTML=starsHTML(ph2.avg_rating||0,18);
    document.getElementById('rating-count').textContent=`${ph2.rating_count||0} ratings`;
  }catch(e){showToast(e.message,'error');}
  finally{document.getElementById('comment-btn-txt').style.display='inline';document.getElementById('comment-ld').style.display='none';btn.disabled=false;}
}

// Helpers
function show(id,v){const e=document.getElementById(id);if(e)e.style.display=v?'flex':'none';}
function updateLM(){const w=document.getElementById('load-more-wrap');if(w)w.style.display=_hasMore?'block':'none';}
function starsHTML(r,size=14){return[1,2,3,4,5].map(i=>`<span style="font-size:${size}px;color:${i<=Math.round(r)?'var(--blue)':'var(--text-3)'}">★</span>`).join('');}
function ph(){return'https://placehold.co/400x300/0C0C12/4F8EFF?text=SnapVault';}
function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
