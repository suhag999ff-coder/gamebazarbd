// ═══════════ FIREBASE INIT ═══════════
const firebaseConfig = {
  apiKey: "AIzaSyDo5V1NPHTPupJ87bOB67ICuIZZuDaRh-U",
  authDomain: "app-market-329c6.firebaseapp.com",
  databaseURL: "https://app-market-329c6-default-rtdb.firebaseio.com",
  projectId: "app-market-329c6",
  storageBucket: "app-market-329c6.firebasestorage.app",
  messagingSenderId: "309471800390",
  appId: "1:309471800390:web:8648f2e0b274a49041ee47"
};
if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const DEFAULT_NUM = "01668885867";

let allDeps = [], allOrds = [], allUsrs = [];
let depFilter = 'all', ordFilter = 'all';
let currentUid = null, currentGid = null, activeChatId = null;
let chatThreadUnsub = null, chatRoomsUnsub = null;
let tgSet = { botToken: '', chatId1: '', chatId2: '' };

// ═══════════ AUTH ═══════════
function adminLogin(){
  const e = document.getElementById('adminEmail').value.trim();
  const p = document.getElementById('adminPass').value;
  if(!e || !p) return alert('Fill all fields');
  auth.signInWithEmailAndPassword(e, p).catch(err => alert('Login failed: ' + err.message));
}

function logout(){
  if(confirm('Logout?')) auth.signOut();
}

auth.onAuthStateChanged(u => {
  if(u){
    document.getElementById('loginSec').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    boot();
  } else {
    document.getElementById('loginSec').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
  }
});

function boot(){
  fetchDeps(); fetchOrds(); fetchUsrs(); loadChats();
  fetchCats(); fetchGames(); fetchBanners();
  loadSettings(); loadTG(); loadPayNums();
}

// ═══════════ NAV ═══════════
function nav(t){
  ['dashboard','deposits','orders','users','chat','categories','games','banners','settings'].forEach(v => {
    const el = document.getElementById('v-' + v);
    if(el) el.classList.add('hidden');
    const b = document.getElementById('nb-' + v);
    if(b) b.classList.remove('on');
  });
  const active = document.getElementById('v-' + t);
  if(active) active.classList.remove('hidden');
  const btn = document.getElementById('nb-' + t);
  if(btn) btn.classList.add('on');
  if(t !== 'games') closeMgr();
  if(t === 'chat') loadChats();
  window.scrollTo(0, 0);
}

function openDrawer(){ document.getElementById('drawer').classList.add('open'); document.getElementById('drawerOv').classList.add('open'); }
function closeDrawer(){ document.getElementById('drawer').classList.remove('open'); document.getElementById('drawerOv').classList.remove('open'); }

// ═══════════ DEPOSITS ═══════════
function fetchDeps(){
  db.collection('deposits').orderBy('date', 'desc').limit(200).onSnapshot(snap => {
    allDeps = [];
    snap.forEach(d => allDeps.push({ id: d.id, ...d.data() }));
    document.getElementById('s-dep').innerText = allDeps.filter(d => (d.status || 'pending') === 'pending').length;
    renderDeps();
  });
}
function filterDep(f){
  depFilter = f;
  ['all','pending','approved','rejected'].forEach(x => {
    const b = document.getElementById('df-' + x);
    if(b){ if(x === f) b.classList.add('on'); else b.classList.remove('on'); }
  });
  renderDeps();
}
function renderDeps(){
  const l = document.getElementById('depList');
  let arr = depFilter === 'all' ? allDeps : allDeps.filter(d => (d.status || 'pending') === depFilter);
  if(!arr.length){ l.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:30px 0;">No deposits</p>'; return; }
  l.innerHTML = '';
  arr.slice(0, 100).forEach(d => {
    const st = (d.status || 'pending').toLowerCase();
    const cls = st === 'approved' ? 'st-s' : (st === 'rejected' ? 'st-r' : 'st-p');
    const dt = d.date && d.date.toDate ? d.date.toDate().toLocaleString('en-BD', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'N/A';
    const actions = st === 'pending' ? `
      <div class="grid-2 mt-3">
        <button onclick="rejDep('${d.id}')" class="btn-danger">Reject</button>
        <button onclick="apprDep('${d.id}','${d.userId}',${d.amount})" class="btn-primary">Approve</button>
      </div>` : `<div style="text-align:center;margin-top:12px"><span class="st ${cls}">${st}</span></div>`;
    l.innerHTML += `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div><p class="text-xs text-muted">${d.method || 'Manual'}</p><h4 style="font-size:22px;font-weight:900;color:#fff">৳${d.amount}</h4></div>
        <span class="font-mono text-xs" style="padding:4px 8px;border-radius:6px;background:var(--input);border:1px solid var(--border);color:var(--primary-l)">${d.trxId || 'N/A'}</span>
      </div>
      <p class="text-xs" style="color:#94a3b8"><i class="fas fa-user-circle"></i> ${d.userEmail || d.userId}</p>
      <p class="text-xs text-muted" style="margin-top:4px"><i class="fas fa-clock"></i> ${dt}</p>
      ${actions}
    </div>`;
  });
}
function apprDep(id, uid, amt){
  if(!confirm('Add ৳' + amt + ' to user?')) return;
  db.runTransaction(async t => {
    const ref = db.collection('users').doc(uid);
    const doc = await t.get(ref);
    const b = doc.exists ? (doc.data().balance || 0) : 0;
    t.update(ref, { balance: b + parseInt(amt) });
    t.update(db.collection('deposits').doc(id), { status: 'approved', approvedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }).catch(e => alert(e.message));
}
function rejDep(id){
  if(confirm('Reject this deposit?')) db.collection('deposits').doc(id).update({ status: 'rejected', rejectedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

// ═══════════ ORDERS ═══════════
function fetchOrds(){
  db.collection('orders').orderBy('date', 'desc').limit(200).onSnapshot(snap => {
    allOrds = [];
    snap.forEach(d => allOrds.push({ id: d.id, ...d.data() }));
    document.getElementById('s-ord').innerText = allOrds.filter(o => (o.status || 'pending') === 'pending').length;
    renderOrds();
  });
}
function filterOrd(f){
  ordFilter = f;
  ['all','pending','success','refunded'].forEach(x => {
    const b = document.getElementById('of-' + x);
    if(b){ if(x === f) b.classList.add('on'); else b.classList.remove('on'); }
  });
  renderOrds();
}
function renderOrds(){
  const l = document.getElementById('ordList');
  let arr = allOrds;
  if(ordFilter !== 'all'){
    arr = arr.filter(o => {
      const st = (o.status || 'pending').toLowerCase();
      if(ordFilter === 'success') return ['success','complete','completed'].includes(st);
      return st === ordFilter;
    });
  }
  if(!arr.length){ l.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:30px 0;">No orders</p>'; return; }
  l.innerHTML = '';
  arr.slice(0, 100).forEach(d => {
    const st = (d.status || 'pending').toLowerCase();
    let bc = '#f59e0b';
    if(['success','complete','completed'].includes(st)) bc = '#10b981';
    else if(['refunded','rejected'].includes(st)) bc = '#ef4444';
    const dt = d.date && d.date.toDate ? d.date.toDate().toLocaleString('en-BD', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'N/A';
    let extra = '';
    if(d.type === 'code' && d.redeemCode) extra = `<div style="background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:8px;padding:8px;margin-top:8px;text-align:center"><p class="text-xs" style="color:#c4b5fd;font-weight:800">Voucher</p><p class="font-mono" style="color:#fff;font-size:13px;font-weight:800;margin-top:3px">${d.redeemCode}</p></div>`;
    else if(d.playerId) extra = `<div style="background:var(--input);border:1px solid var(--border);border-radius:8px;padding:8px;margin-top:8px"><p class="text-xs text-muted">Player ID</p><p class="font-mono" style="color:var(--primary-l);font-size:13px;font-weight:800">${d.playerId}</p></div>`;
    const ctrl = st === 'pending' ? `
      <div class="grid-2 mt-3">
        <button onclick="refOrd('${d.id}','${d.userId}',${d.price})" class="btn-danger">Refund</button>
        <button onclick="compOrd('${d.id}')" class="btn-primary">Complete</button>
      </div>` : `<div style="text-align:center;margin-top:8px"><span class="st ${['success','complete','completed'].includes(st)?'st-s':'st-r'}">${st}</span></div>`;
    l.innerHTML += `<div class="card" style="border-left:4px solid ${bc}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="min-width:0;flex:1"><h4 style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.productName || 'Product'}</h4><p class="text-xs text-muted" style="margin-top:2px">${d.gameName || 'Game'} · ${(d.type || 'uid').toUpperCase()}</p></div>
        <span style="font-weight:900;color:var(--primary-l);font-size:15px;flex-shrink:0;margin-left:8px">৳${d.price}</span>
      </div>
      <p class="text-xs text-muted" style="margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fas fa-user"></i> ${d.userName || d.userId}</p>
      <p class="text-xs text-muted" style="margin-top:2px;font-size:10px">${dt}</p>
      ${extra}
      ${ctrl}
    </div>`;
  });
}
function compOrd(id){ if(confirm('Mark as complete?')) db.collection('orders').doc(id).update({ status: 'success', completedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
function refOrd(id, uid, amt){
  if(!confirm('Refund ৳' + amt + '?')) return;
  db.runTransaction(async t => {
    const ref = db.collection('users').doc(uid);
    const d = await t.get(ref);
    const b = d.exists ? (d.data().balance || 0) : 0;
    t.update(ref, { balance: b + parseInt(amt) });
    t.update(db.collection('orders').doc(id), { status: 'refunded', refundedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }).catch(e => alert(e.message));
}

// ═══════════ USERS ═══════════
function fetchUsrs(){
  db.collection('users').onSnapshot(snap => {
    allUsrs = [];
    snap.forEach(d => allUsrs.push({ id: d.id, ...d.data() }));
    document.getElementById('s-usr').innerText = allUsrs.length;
    renderUsrs(allUsrs);
  });
}
function renderUsrs(arr){
  const l = document.getElementById('usrList');
  if(!arr.length){ l.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:30px 0;">No users</p>'; return; }
  l.innerHTML = '';
  arr.slice(0, 200).forEach(u => {
    const init = (u.name || u.email || 'U')[0].toUpperCase();
    l.innerHTML += `<div class="card" style="padding:12px;display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;flex-shrink:0">${init}</div>
      <div style="flex:1;min-width:0">
        <p style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.email || 'No email'}</p>
        <p style="font-size:12px;font-weight:900;color:var(--primary-l)">৳${u.balance || 0}</p>
      </div>
      <button onclick="viewUsr('${u.id}')" style="padding:6px 12px;border-radius:8px;background:var(--card2);color:var(--ts);border:none;cursor:pointer;font-size:10px;font-weight:700"><i class="fas fa-chevron-right"></i></button>
    </div>`;
  });
}
function searchUser(){
  const q = document.getElementById('userSearch').value.toLowerCase().trim();
  if(!q) return renderUsrs(allUsrs);
  renderUsrs(allUsrs.filter(u => (u.email || '').toLowerCase().includes(q) || (u.id || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q) || (u.phone || '').includes(q)));
}
function viewUsr(id){
  currentUid = id;
  const u = allUsrs.find(x => x.id === id);
  if(!u) return;
  document.getElementById('mEmail').innerText = u.email || 'No Email';
  document.getElementById('mUid').innerText = id;
  document.getElementById('mBal').innerText = u.balance || 0;
  document.getElementById('mOrd').innerText = '...';
  document.getElementById('userModal').classList.remove('hidden');
  db.collection('orders').where('userId', '==', id).get().then(s => {
    const done = s.docs.filter(d => ['success','complete'].includes((d.data().status || '').toLowerCase())).length;
    document.getElementById('mOrd').innerText = done;
  });
}
function closeUserModal(){ document.getElementById('userModal').classList.add('hidden'); currentUid = null; }
function updateBal(){
  const amt = parseInt(document.getElementById('balAmt').value);
  if(!amt || !currentUid) return alert('Enter valid amount');
  db.runTransaction(async t => {
    const ref = db.collection('users').doc(currentUid);
    const d = await t.get(ref);
    const b = d.exists ? (d.data().balance || 0) : 0;
    t.update(ref, { balance: b + amt });
  }).then(() => {
    document.getElementById('balAmt').value = '';
    const old = parseInt(document.getElementById('mBal').innerText);
    document.getElementById('mBal').innerText = old + amt;
  }).catch(e => alert(e.message));
}

// ═══════════ CHAT ═══════════
function loadChats(){
  if(chatRoomsUnsub) chatRoomsUnsub();
  chatRoomsUnsub = db.collection('chats').orderBy('lastTime', 'desc').onSnapshot(snap => {
    const list = document.getElementById('chatRooms');
    let unread = 0;
    list.innerHTML = '';
    if(snap.empty){ list.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:30px 0;">No chats</p>'; document.getElementById('s-chat').innerText = 0; return; }
    snap.forEach(doc => {
      const d = doc.data();
      if(d.unreadAdmin > 0) unread++;
      const time = d.lastTime && d.lastTime.toDate ? d.lastTime.toDate().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'}) : '';
      const un = d.unreadAdmin > 0;
      const init = (d.userName || d.userEmail || 'U')[0].toUpperCase();
      list.innerHTML += `<div class="chat-row ${un ? 'un' : ''}" onclick="openChatThread('${doc.id}')">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar">${init}</div>
          <div class="content">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <p class="name">${d.userName || d.userEmail || 'User'}</p>
              <span class="time">${time}</span>
            </div>
            <p class="msg">${d.lastMessage || 'No messages'}</p>
          </div>
          ${un ? `<span class="unread">${d.unreadAdmin}</span>` : ''}
        </div>
      </div>`;
    });
    document.getElementById('s-chat').innerText = unread;
    const badge = document.getElementById('chatBadge');
    if(unread > 0){ badge.textContent = unread > 99 ? '99+' : unread; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  });
}
function openChatThread(uid){
  activeChatId = uid;
  document.getElementById('chatListView').classList.add('hidden');
  document.getElementById('chatThreadView').classList.remove('hidden');
  db.collection('chats').doc(uid).get().then(d => {
    if(d.exists){
      const x = d.data();
      document.getElementById('chatName').innerText = x.userName || 'User';
      document.getElementById('chatEmail').innerText = x.userEmail || uid;
    }
    db.collection('chats').doc(uid).update({ unreadAdmin: 0 }).catch(() => {});
  });
  if(chatThreadUnsub) chatThreadUnsub();
  chatThreadUnsub = db.collection('chats').doc(uid).collection('messages').orderBy('time', 'asc').limit(200).onSnapshot(snap => {
    const box = document.getElementById('chatMessages');
    box.innerHTML = '';
    if(snap.empty){ box.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:30px 0;">No messages yet</p>'; return; }
    snap.forEach(doc => {
      const m = doc.data();
      const isAdmin = m.sender === 'admin';
      const time = m.time && m.time.toDate ? m.time.toDate().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'}) : '';
      box.innerHTML += `<div class="msg ${isAdmin ? 'msg-a' : 'msg-u'}">${escapeH(m.text || '')}<div class="msg-t">${time}</div></div>`;
    });
    box.scrollTop = box.scrollHeight;
  });
}
function closeChatThread(){
  if(chatThreadUnsub){ chatThreadUnsub(); chatThreadUnsub = null; }
  activeChatId = null;
  document.getElementById('chatListView').classList.remove('hidden');
  document.getElementById('chatThreadView').classList.add('hidden');
  loadChats();
}
async function sendAdminMsg(){
  const inp = document.getElementById('chatInput');
  const txt = inp.value.trim();
  if(!txt || !activeChatId) return;
  inp.value = '';
  try {
    await db.collection('chats').doc(activeChatId).collection('messages').add({ text: txt, sender: 'admin', time: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('chats').doc(activeChatId).set({ lastMessage: txt.slice(0, 80), lastTime: firebase.firestore.FieldValue.serverTimestamp(), unreadUser: firebase.firestore.FieldValue.increment(1) }, { merge: true });
  } catch(e){ console.error(e); }
}
function escapeH(s){ return (s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ═══════════ CATEGORIES ═══════════
function fetchCats(){
  db.collection('categories').orderBy('slot').onSnapshot(snap => {
    const list = document.getElementById('catList');
    const sel = document.getElementById('newGameCat');
    list.innerHTML = '';
    sel.innerHTML = '<option value="">Select Category</option>';
    if(snap.empty){ list.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:20px 0;">No categories</p>'; return; }
    snap.forEach(doc => {
      const d = doc.data();
      list.innerHTML += `<div class="card" style="padding:12px;display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(99,102,241,.15);color:var(--primary-l);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-layer-group"></i></div>
        <div style="flex:1;min-width:0"><h4 style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</h4><p class="text-xs text-muted">Slot ${d.slot}</p></div>
        <button onclick="delCat('${doc.id}')" style="width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,.1);color:#f87171;border:none;cursor:pointer;flex-shrink:0"><i class="fas fa-trash"></i></button>
      </div>`;
      sel.innerHTML += `<option value="${doc.id}">${d.name}</option>`;
    });
  });
}
function addCat(){
  const n = document.getElementById('newCatName').value.trim();
  const s = parseInt(document.getElementById('newCatSlot').value);
  if(!n || isNaN(s)) return alert('Fill name and slot');
  db.collection('categories').add({ name: n, slot: s, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatSlot').value = '';
  });
}
function delCat(id){ if(confirm('Delete category?')) db.collection('categories').doc(id).delete(); }

// ═══════════ GAMES ═══════════
async function fetchGames(){
  const grid = document.getElementById('gamesGrid');
  if(!grid) return;
  grid.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:20px 0;">Loading...</p>';
  try {
    const [cS, gS] = await Promise.all([db.collection('categories').orderBy('slot').get(), db.collection('services').get()]);
    let cats = {};
    cS.forEach(d => cats[d.id] = { ...d.data(), games: [] });
    let uncat = [];
    gS.forEach(d => {
      const g = { id: d.id, ...d.data() };
      if(g.categoryId && cats[g.categoryId]) cats[g.categoryId].games.push(g);
      else uncat.push(g);
    });
    grid.innerHTML = '';
    for(const cid in cats){
      const c = cats[cid];
      if(!c.games.length) continue;
      let html = '';
      c.games.forEach(g => {
        const ti = g.type === 'code' ? 'fa-ticket' : (g.type === 'auto-topup' ? 'fa-bolt' : 'fa-gamepad');
        html += `<div class="prod-row">
          <img src="${g.image || 'https://placehold.co/48/6366f1/FFF?text=G'}" onerror="this.src='https://placehold.co/48/6366f1/FFF?text=G'">
          <div class="info"><p class="name">${g.name}</p><span class="st st-s" style="font-size:8px;padding:2px 6px;margin-top:2px"><i class="fas ${ti}"></i> ${(g.type || 'uid').toUpperCase()}</span></div>
          <button onclick="managePkg('${g.id}','${(g.name || '').replace(/'/g,'&#39;')}','${g.type || 'uid'}')" style="padding:6px 10px;border-radius:8px;background:rgba(99,102,241,.2);color:var(--primary-l);border:none;cursor:pointer;font-size:10px;font-weight:800">Manage</button>
          <button onclick="delGame('${g.id}')" style="width:32px;height:32px;border-radius:8px;background:rgba(239,68,68,.1);color:#f87171;border:none;cursor:pointer;flex-shrink:0"><i class="fas fa-times"></i></button>
        </div>`;
      });
      grid.innerHTML += `<div style="margin-bottom:16px"><h3 style="font-size:12px;font-weight:800;color:#fff;border-left:4px solid var(--primary);padding-left:10px;margin-bottom:10px">${c.name}</h3>${html}</div>`;
    }
    if(uncat.length){
      let html = '';
      uncat.forEach(g => {
        html += `<div class="prod-row">
          <img src="${g.image || 'https://placehold.co/48/6366f1/FFF?text=G'}">
          <div class="info"><p class="name">${g.name}</p></div>
          <button onclick="managePkg('${g.id}','${(g.name || '').replace(/'/g,'&#39;')}','${g.type || 'uid'}')" style="padding:6px 10px;border-radius:8px;background:rgba(99,102,241,.2);color:var(--primary-l);border:none;cursor:pointer;font-size:10px;font-weight:800">Manage</button>
        </div>`;
      });
      grid.innerHTML += `<div><h3 style="font-size:12px;font-weight:800;color:#94a3b8;border-left:4px solid #4b5563;padding-left:10px;margin-bottom:10px">Uncategorized</h3>${html}</div>`;
    }
    if(!grid.innerHTML.trim()) grid.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:20px 0;">No games yet</p>';
  } catch(e){ grid.innerHTML = '<p class="text-xs" style="text-align:center;color:#ef4444;padding:20px 0;">Error loading</p>'; }
}
function addGame(){
  const n = document.getElementById('newGameName').value.trim();
  const t = document.getElementById('newGameType').value;
  const c = document.getElementById('newGameCat').value;
  const i = document.getElementById('newGameImg').value.trim();
  const r = document.getElementById('newGameRules').value.trim();
  if(!n || !i || !c) return alert('Name, Category & Image required');
  db.collection('services').add({ name: n, type: t, categoryId: c, image: i, rules: r || '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
    document.getElementById('newGameName').value = '';
    document.getElementById('newGameImg').value = '';
    document.getElementById('newGameRules').value = '';
    fetchGames();
  });
}
function delGame(id){ if(confirm('Delete game and all products?')) db.collection('services').doc(id).delete().then(() => fetchGames()); }
function managePkg(gid, gname, gtype){
  currentGid = gid;
  document.getElementById('gamesMain').classList.add('hidden');
  document.getElementById('productsMgr').classList.remove('hidden');
  document.getElementById('pmTitle').innerText = gname;
  document.getElementById('pmType').innerText = (gtype === 'code' || gtype === 'auto-topup') ? 'STOCK MANAGEMENT' : 'PACKAGES';
  if(gtype === 'code' || gtype === 'auto-topup') document.getElementById('voucherSec').classList.remove('hidden');
  else document.getElementById('voucherSec').classList.add('hidden');
  loadPkgs(gid);
}
function closeMgr(){
  currentGid = null;
  document.getElementById('productsMgr').classList.add('hidden');
  document.getElementById('gamesMain').classList.remove('hidden');
}
function loadPkgs(gid){
  db.collection('services').doc(gid).collection('products').onSnapshot(snap => {
    const list = document.getElementById('pkgList');
    const sel = document.getElementById('vPkgTarget');
    list.innerHTML = '';
    sel.innerHTML = '<option value="">Select Product</option>';
    if(snap.empty){ list.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:20px 0;">No packages</p>'; return; }
    snap.forEach(doc => {
      const p = doc.data();
      const inS = p.stockCount === undefined || p.stockCount > 0;
      sel.innerHTML += `<option value="${doc.id}">${p.name}</option>`;
      list.innerHTML += `<div class="prod-row">
        <div style="min-width:0;flex:1"><p class="name">${p.name}</p><p class="price">৳${p.price}</p><span class="st ${inS ? 'st-s' : 'st-r'}" style="margin-top:4px">${inS ? 'In' : 'Out'}</span></div>
        <button onclick="togStock('${gid}','${doc.id}',${p.stockCount ?? 1})" style="padding:6px 10px;border-radius:8px;background:var(--card2);color:var(--ts);border:none;cursor:pointer;font-size:10px;font-weight:800;flex-shrink:0">${inS ? 'Out' : 'In'}</button>
        <button onclick="delPkg('${gid}','${doc.id}')" style="width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,.1);color:#f87171;border:none;cursor:pointer;flex-shrink:0"><i class="fas fa-trash"></i></button>
      </div>`;
    });
  });
}
function togStock(g, pid, cur){
  const n = (cur === undefined || cur > 0) ? 0 : 1;
  db.collection('services').doc(g).collection('products').doc(pid).update({ stockCount: n });
}
function addPkg(){
  if(!currentGid) return;
  const n = document.getElementById('pkgName').value.trim();
  const p = document.getElementById('pkgPrice').value;
  if(!n || !p) return alert('Fill all');
  db.collection('services').doc(currentGid).collection('products').add({ name: n, price: parseInt(p), stockCount: 1, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
    document.getElementById('pkgName').value = '';
    document.getElementById('pkgPrice').value = '';
  });
}
function delPkg(g, pid){ if(confirm('Delete package?')) db.collection('services').doc(g).collection('products').doc(pid).delete(); }
async function uploadVouchers(){
  const pid = document.getElementById('vPkgTarget').value;
  const raw = document.getElementById('vCodes').value.trim();
  if(!pid || !raw) return alert('Select product & enter codes');
  const codes = raw.split(/[\n,]+/).map(c => c.trim()).filter(c => c);
  if(!codes.length) return alert('No valid codes');
  try {
    const batch = db.batch();
    const sRef = db.collection('services').doc(currentGid).collection('products').doc(pid).collection('stock');
    codes.forEach(c => { batch.set(sRef.doc(), { code: c, status: 'available', addedAt: firebase.firestore.FieldValue.serverTimestamp() }); });
    await batch.commit();
    await db.collection('services').doc(currentGid).collection('products').doc(pid).update({ stockCount: firebase.firestore.FieldValue.increment(codes.length) });
    alert(codes.length + ' codes uploaded!');
    document.getElementById('vCodes').value = '';
  } catch(e){ alert(e.message); }
}

// ═══════════ BANNERS ═══════════
function fetchBanners(){
  db.collection('banners').onSnapshot(snap => {
    const list = document.getElementById('bannerList');
    list.innerHTML = '';
    if(snap.empty){ list.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:20px 0;">No banners</p>'; return; }
    snap.forEach(doc => {
      const d = doc.data();
      list.innerHTML += `<div class="card" style="padding:0;overflow:hidden">
        <img src="${d.image}" style="width:100%;height:100px;object-fit:cover" onerror="this.src='https://placehold.co/400x100/6366f1/FFF?text=Banner'">
        <div style="padding:10px;display:flex;justify-content:space-between;align-items:center">
          <p class="text-xs text-muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><i class="fas fa-link"></i> ${d.link || 'No link'}</p>
          <button onclick="delBanner('${doc.id}')" style="width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,.1);color:#f87171;border:none;cursor:pointer;flex-shrink:0"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    });
  });
}
function addBanner(){
  const u = document.getElementById('bannerUrl').value.trim();
  const l = document.getElementById('bannerLink').value.trim();
  if(!u) return alert('Image URL required');
  db.collection('banners').add({ image: u, link: l || '', createdAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => {
    document.getElementById('bannerUrl').value = '';
    document.getElementById('bannerLink').value = '';
  });
}
function delBanner(id){ if(confirm('Delete?')) db.collection('banners').doc(id).delete(); }

// ═══════════ SETTINGS ═══════════
function loadSettings(){
  db.collection('settings').doc('general').onSnapshot(doc => {
    if(!doc.exists) return;
    const x = doc.data();
    document.getElementById('setSiteName').value = x.siteName || 'GAME BAZAR';
    document.getElementById('setLogo').value = x.logoUrl || '';
    document.getElementById('setNotice').value = x.notice || '';
    document.getElementById('setTelegram').value = x.telegram || '';
    document.getElementById('setWhatsapp').value = x.whatsapp || '';
    document.getElementById('setFb').value = x.facebook || '';
    document.getElementById('setInsta').value = x.instagram || '';
    document.getElementById('setYt').value = x.youtube || '';
    document.getElementById('offlineMsg').value = x.offlineMessage || 'We are upgrading. Please come back soon!';
    const online = x.appOnline !== false;
    document.getElementById('onlineTog').checked = online;
    document.getElementById('onlineTxt').innerText = online ? 'Online' : 'Offline';
    document.getElementById('onlineTxt').style.color = online ? '#4ade80' : '#f87171';
  });
}
function toggleOnline(){
  const c = document.getElementById('onlineTog').checked;
  db.collection('settings').doc('general').set({ appOnline: c }, { merge: true });
}
function saveOfflineMsg(){
  db.collection('settings').doc('general').set({ offlineMessage: document.getElementById('offlineMsg').value }, { merge: true }).then(() => alert('Saved'));
}
function saveConfig(){
  db.collection('settings').doc('general').set({
    siteName: document.getElementById('setSiteName').value,
    logoUrl: document.getElementById('setLogo').value,
    notice: document.getElementById('setNotice').value,
    telegram: document.getElementById('setTelegram').value,
    whatsapp: document.getElementById('setWhatsapp').value,
    facebook: document.getElementById('setFb').value,
    instagram: document.getElementById('setInsta').value,
    youtube: document.getElementById('setYt').value
  }, { merge: true }).then(() => alert('Saved'));
}
function loadPayNums(){
  db.collection('admin').doc('payment').onSnapshot(d => {
    const data = d.exists ? d.data() : {};
    document.getElementById('setBkash').value = data.bkash || DEFAULT_NUM;
    document.getElementById('setNagad').value = data.nagad || DEFAULT_NUM;
    document.getElementById('setRocket').value = data.rocket || DEFAULT_NUM;
  });
}
function saveNumbers(){
  const b = document.getElementById('setBkash').value.trim() || DEFAULT_NUM;
  const n = document.getElementById('setNagad').value.trim() || DEFAULT_NUM;
  const r = document.getElementById('setRocket').value.trim() || DEFAULT_NUM;
  db.collection('admin').doc('payment').set({ bkash: b, nagad: n, rocket: r, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(() => alert('Saved'));
}

// ═══════════════════════════════════════════
//   TELEGRAM DUAL ALERTS
// ═══════════════════════════════════════════
function toggleTgToken(){
  const inp = document.getElementById('setTgToken');
  const eye = document.getElementById('tgEye');
  if(inp.type === 'password'){ inp.type = 'text'; eye.className = 'fas fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fas fa-eye'; }
}
function loadTG(){
  db.collection('settings').doc('telegram').onSnapshot(doc => {
    const configured = doc.exists && doc.data().botToken;
    const data = configured ? doc.data() : {};
    tgSet = { botToken: data.botToken || '', chatId1: data.chatId1 || data.chatId || '', chatId2: data.chatId2 || '' };
    document.getElementById('setTgToken').value = tgSet.botToken;
    document.getElementById('setTgChat1').value = tgSet.chatId1;
    document.getElementById('setTgChat2').value = tgSet.chatId2;
    const badge = document.getElementById('tgBadge');
    const status = document.getElementById('tgTokenStatus');
    if(configured){
      badge.className = 'badge-ok';
      badge.innerHTML = '✓ Connected';
      status.innerHTML = '<i class="fas fa-circle" style="color:#22c55e"></i> <span style="color:#4ade80">Bot Token saved</span>';
    } else {
      badge.className = 'badge-off';
      badge.innerHTML = 'Not Configured';
      status.innerHTML = '<i class="fas fa-circle"></i> Token status: যাচাই হয়নি';
    }
  });
}
async function saveTelegram(){
  const t = document.getElementById('setTgToken').value.trim();
  const c1 = document.getElementById('setTgChat1').value.trim();
  const c2 = document.getElementById('setTgChat2').value.trim();
  if(!t) return alert('Bot Token required');
  if(!c1 && !c2) return alert('At least one Chat ID required');
  if(!/^\d+:[A-Za-z0-9_-]+$/.test(t)) return alert('Invalid token format');
  try {
    await db.collection('settings').doc('telegram').set({
      botToken: t, chatId1: c1, chatId2: c2,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    alert('Saved! Now click Test 1 to verify.');
  } catch(e){ alert('Failed: ' + e.message); }
}
async function testTelegram(target){
  let token = document.getElementById('setTgToken').value.trim();
  const c1 = document.getElementById('setTgChat1').value.trim();
  const c2 = document.getElementById('setTgChat2').value.trim();
  if(!token && tgSet.botToken) token = tgSet.botToken;
  if(!token) return alert('Enter Bot Token first');
  const chatId = target === 'chat1' ? c1 : c2;
  const label = target === 'chat1' ? 'Chat 1 (Admin)' : 'Chat 2 (Group)';
  if(!chatId) return alert(label + ' is empty');
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', hour12: true, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const msg = '🎮 <b>GAME BAZAR — TEST</b>\n━━━━━━━━━━━━━━━\n✅ <b>Connection Successful!</b>\n\n🎯 <b>Target:</b> ' + label + '\n📱 <b>Chat ID:</b> <code>' + chatId + '</code>\n⏰ <b>Time:</b> ' + now + '\n━━━━━━━━━━━━━━━\n<i>Notifications system is now active ✓</i>';
  try {
    const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    const result = await res.json();
    if(res.ok && result.ok) alert('✅ Test sent to ' + label + '!\n\nCheck Telegram.');
    else throw new Error(result.description || 'Telegram error');
  } catch(e){ alert('❌ Failed: ' + e.message + '\n\nCheck:\n✓ Token\n✓ Chat ID\n✓ Bot has /start\n✓ Bot is in group'); }
}
