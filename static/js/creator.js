// creator.js — Upload, manage, stats, delete
let _file=null,_delId=null;

function setupDrop(){
  const z=document.getElementById('drop-zone');if(!z)return;
  z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('drag-over');});
  z.addEventListener('dragleave',()=>z.classList.remove('drag-over'));
  z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))setFile(f);else showToast('Please drop a valid image','error');});
}
function handleFile(e){const f=e.target.files[0];if(f)setFile(f);}
function setFile(f){
  if(f.size>10*1024*1024){showToast('File too large (max 10MB)','error');return;}
  _file=f;const r=new FileReader();r.onload=e=>{const w=document.getElementById('preview-wrap');document.getElementById('preview-img').src=e.target.result;w.style.display='block';};r.readAsDataURL(f);
}

async function uploadPhoto(){
  clearMsg();
  const title=document.getElementById('u-title').value.trim();
  if(!_file)return showMsg('err','Please select a photo first.');
  if(!title)return showMsg('err','Title is required.');
  const btn=document.getElementById('upload-btn');
  document.getElementById('upload-btn-txt').style.display='none';
  document.getElementById('upload-ld').style.display='inline-block';
  btn.disabled=true;
  try{
    const fd=new FormData();
    fd.append('file',_file);fd.append('title',title);
    fd.append('caption',document.getElementById('u-caption').value.trim());
    fd.append('location',document.getElementById('u-location').value.trim());
    fd.append('people',document.getElementById('u-people').value.trim());
    const res=await fetch(`/photos/upload`,{method:'POST',headers:multipartHeaders(),body:fd});
    const data=await res.json();
    if(!res.ok)throw new Error(data.detail||'Upload failed');
    const tagsStr=(data.tags||[]).length?data.tags.join(', '):'none detected';
    showMsg('ok',`✓ Uploaded! AI tags: ${tagsStr}`);
    resetForm();loadStats();
  }catch(e){showMsg('err',e.message||'Upload failed.');}
  finally{document.getElementById('upload-btn-txt').style.display='inline';document.getElementById('upload-ld').style.display='none';btn.disabled=false;}
}

function resetForm(){
  ['u-title','u-caption','u-location','u-people'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('file-input').value='';
  document.getElementById('preview-wrap').style.display='none';_file=null;
}

async function loadMyPhotos(){
  document.getElementById('my-grid').innerHTML='';
  document.getElementById('my-loader').style.display='flex';
  document.getElementById('my-empty').style.display='none';
  try{
    const d=await api('GET','/photos/mine');const photos=d.photos||[];
    const tc=photos.reduce((a,p)=>a+(p.comment_count||0),0);
    const rated=photos.filter(p=>p.avg_rating>0);
    const avg=rated.length?(rated.reduce((a,p)=>a+p.avg_rating,0)/rated.length).toFixed(1):'—';
    document.getElementById('st-total').textContent=photos.length;
    document.getElementById('st-comments').textContent=tc;
    document.getElementById('st-avg').textContent=avg;
    if(!photos.length){document.getElementById('my-empty').style.display='block';return;}
    const grid=document.getElementById('my-grid');
    photos.forEach(p=>{
      const c=document.createElement('div');c.className='creator-card anim-in';
      c.innerHTML=`
        <div class="creator-card-img"><img src="${p.blob_url||'https://placehold.co/400x225/0C0C12/4F8EFF?text=Photo'}" alt="${esc(p.title)}" loading="lazy" onerror="this.src='https://placehold.co/400x225/0C0C12/4F8EFF?text=Photo'"/></div>
        <div class="creator-card-body">
          <div class="creator-card-title">${esc(p.title||'Untitled')}</div>
          <div class="creator-card-meta"><span>💬 ${p.comment_count||0}</span><span>★ ${parseFloat(p.avg_rating||0).toFixed(1)}</span><span>${fmtDate(p.uploaded_at)}</span></div>
          <div class="creator-card-actions">
            <button class="btn btn-outline btn-sm" onclick="window.open('/photo?id=${p.id}','_blank')">View</button>
            <button class="btn btn-danger btn-sm" onclick="openDel('${p.id}')">Delete</button>
          </div>
        </div>`;
      grid.appendChild(c);
    });
  }catch(e){showToast(e.message,'error');}
  finally{document.getElementById('my-loader').style.display='none';}
}

async function loadStats(){
  try{const d=await api('GET','/photos/mine');document.getElementById('sb-count').textContent=(d.photos||[]).length;}catch{}
}

function openDel(id){_delId=id;document.getElementById('del-modal').classList.add('open');}
function closeModal(){document.getElementById('del-modal').classList.remove('open');_delId=null;}
async function confirmDelete(){
  if(!_delId)return;
  document.getElementById('del-txt').style.display='none';document.getElementById('del-ld').style.display='inline-block';document.getElementById('del-confirm').disabled=true;
  try{await api('DELETE',`/photos/${_delId}`);closeModal();showToast('Photo deleted','success');loadMyPhotos();loadStats();}
  catch(e){showToast(e.message,'error');}
  finally{document.getElementById('del-txt').style.display='inline';document.getElementById('del-ld').style.display='none';document.getElementById('del-confirm').disabled=false;}
}

function showMsg(type,msg){const el=document.getElementById(type==='err'?'upload-err':'upload-ok');el.textContent=msg;el.style.display='block';}
function clearMsg(){['upload-err','upload-ok'].forEach(id=>document.getElementById(id).style.display='none');}
function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
