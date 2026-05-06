// auth.js — uses relative URLs (same domain, no CORS)
const API = '';   // empty = same domain, works locally AND on Azure

function getToken()    { return localStorage.getItem('sv_token'); }
function getRole()     { return localStorage.getItem('sv_role'); }
function getUsername() { return localStorage.getItem('sv_username'); }

function saveSession(token, role, username) {
    localStorage.setItem('sv_token',    token);
    localStorage.setItem('sv_role',     role);
    localStorage.setItem('sv_username', username);
}

function clearSession() {
    ['sv_token','sv_role','sv_username'].forEach(k => localStorage.removeItem(k));
}

function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

function multipartHeaders() {
    return { 'Authorization': 'Bearer ' + getToken() };
}

function requireAuth(role) {
    if (!getToken()) { window.location.href = '/'; return false; }
    if (role && getRole() !== role) {
        window.location.href = getRole() === 'creator' ? '/studio' : '/browse';
        return false;
    }
    return true;
}

async function login(email, password) {
    const res  = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    saveSession(data.access_token, data.role, data.username);
    return data;
}

async function register(username, email, password) {
    const res  = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    return data;
}

function doLogout() {
    clearSession();
    window.location.href = '/';
}

async function api(method, path, body = null) {
    const opts = { method, headers: authHeaders() };
    if (body) opts.body = JSON.stringify(body);
    let res, data;
    try {
        res  = await fetch(path, opts);
        data = await res.json();
    } catch {
        throw new Error('Cannot reach server.');
    }
    if (res.status === 401) { clearSession(); window.location.href = '/'; return; }
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
}

function showToast(msg, type = 'info') {
    const wrap = document.getElementById('toast');
    const span = document.getElementById('toast-msg');
    if (!wrap || !span) return;
    span.textContent = msg;
    wrap.className   = `toast ${type} show`;
    setTimeout(() => wrap.classList.remove('show'), 3500);
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
