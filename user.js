// ═══════════ FIREBASE ═══════════
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

let currentUser = null, userData = {}, userBalance = 0;
let selectedProduct = null, selectedGameId = null, selectedGameName = '', selectedGameType = 'uid';
let gamesData = {}, allGames = [], allCategories = [];
let currentAmount = 0, currentMethod = 'bkash', paymentNumbers = { bkash: '01668885867', nagad: '01668885867', rocket: '01668885867' };
let chatUnsub = null, userChatUnsub = null, chatMsgUnsub = null;
let allOrderCache = [], histFilter = 'all';
let telegramSet = { botToken: '', chatId1: '', chatId2: '' };
const METHODS = {
  bkash: { name: 'bKash', ussd: '*247#' },
  nagad: { name: 'Nagad', ussd: '*167#' },
  rocket: { name: 'Rocket', ussd: '*322#' }
};
const LOGOS = {
  bkash: 'https://i.ibb.co.com/9kCCTNsx/1656227518bkash-logo-png.png',
  nagad: 'https://i.ibb.co.com/VcqJTvpn/Nagad-Logo-horizontally-og.png',
  rocket: 'https://i.ibb.co.com/wFZkNM48/rocket-color-logo-mobile-banking-icon-free-png.png'
};

// ═══════════ TELEGRAM ═══════════
function watchTelegram(){
  db.collection('settings').doc('telegram').onSnapshot(doc => {
    if(!doc.exists) return;
    const x = doc.data();
    telegramSet = { botToken: x.botToken || '', chatId1: x.chatId1 || x.chatId || '', chatId2: x.chatId2 || '' };
  });
}

async function sendTG(title, body){
  try {
    let { botToken, chatId1, chatId2 } = telegramSet;
    if(!botToken){
      const doc = await db.collection('settings').doc('telegram').get();
      if(doc.exists){
        const d = doc.data();
        botToken = d.botToken || '';
        chatId1 = d.chatId1 || d.chatId || '';
        chatId2 = d.chatId2 || '';
        telegramSet = { botToken, chatId1, chatId2 };
      }
    }
    if(!botToken) return false;
    const now = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', hour12: true, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const msg = '🎮 <b>GAME BAZAR</b>\n━━━━━━━━━━━━━━━\n<b>' + title + '</b>\n\n' + body + '\n━━━━━━━━━━━━━━━\n⏰ <i>' + now + '</i>';
    const targets = [chatId1, chatId2].filter(Boolean);
    if(!targets.length) return false;
    const results = await Promise.allSettled(targets.map(cid =>
      fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cid, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
      }).then(r => r.json())
    ));
    return results.filter(r => r.status === 'fulfilled' && r.value.ok).length > 0;
  } catch(e){ console.error('TG:', e); return false; }
}

// ═══════════ AUTH ═══════════
function switchAuth(tab){
  document.getElementById('btn-login').classList.toggle('on', tab === 'login');
  document.getElementById('btn-reg').classList.toggle('on', tab === 'register');
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

async function doLogin(){
  const e = document.getElementById('loginEmail').value.trim();
  const p = document.getElementById('loginPass').value;
  if(!e || !p) return alert('Fill all fields');
  try {
    await auth.signInWithEmailAndPassword(e, p);
  } catch(err){ alert('Login failed: ' + err.message); }
}

async function doRegister(){
  const n = document.getElementById('regName').value.trim();
  const e = document.getElementById('regEmail').value.trim();
  const ph = document.getElementById('regPhone').value.trim();
  const p = document.getElementById('regPass').value;
  if(!n || !e || !p) return alert('Fill required fields');
  if(p.length < 6) return alert('Password 6+ chars');
  try {
    const c = await auth.createUserWithEmailAndPassword(e, p);
    await db.collection('users').doc(c.user.uid).set({
      name: n, email: e, phone: ph || '', balance: 0, totalSpent: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await sendTG('🆕 NEW USER', '👤 ' + n + '\n📧 <code>' + e + '</code>\n🆔 <code>' + c.user.uid + '</code>');
  } catch(err){ alert('Register failed: ' + err.message); }
}

function doLogout(){
  if(!confirm('Logout?')) return;
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  if(user){
    currentUser = user;
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadUser(user.uid);
    startListeners();
    sendTG('🔐 USER LOGIN', '📧 <code>' + user.email + '</code>');
  } else {
    currentUser = null;
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
});

// ═══════════ USER DATA ═══════════
function loadUser(uid){
  db.collection('users').doc(uid).onSnapshot(doc => {
    if(!doc.exists) return;
    userData = doc.data();
    userBalance = userData.balance || 0;
    document.getElementById('headerBalance').innerText = userBalance;
    document.getElementById('sideBalance').innerText = userBalance;
    document.getElementById('sideName').innerText = userData.name || 'User';
    document.getElementById('sideEmail').innerText = userData.email || '';
    document.getElementById('profileName').innerText = userData.name || 'ব্যবহারকারী';
    document.getElementById('profileEmail').innerText = userData.email || '';
    document.getElementById('profileBalance').innerText = userBalance;
  });
  db.collection('orders').where('userId', '==', uid).get().then(snap => {
    let total = 0, spent = 0;
    snap.forEach(d => {
      total++;
      const st = (d.data().status || '').toLowerCase();
      if(['success', 'complete', 'completed'].includes(st)) spent += parseInt(d.data().price || 0);
    });
    document.getElementById('profileOrders').innerText = total;
    document.getElementById('profileSpent').innerText = spent;
  });
}

// ═══════════ START LISTENERS ═══════════
function startListeners(){
  // General settings
  db.collection('settings').doc('general').onSnapshot(doc => {
    if(!doc.exists) return;
    const d = doc.data();
    if(d.notice) document.getElementById('noticeText').innerText = d.notice;
    if(d.siteName){
      document.getElementById('appTitle').innerText = d.siteName;
      document.title = d.siteName;
    }
  });
  // Payment numbers
  db.collection('admin').doc('payment').onSnapshot(doc => {
    if(doc.exists){
      const d = doc.data();
      paymentNumbers = { bkash: d.bkash || '01668885867', nagad: d.nagad || '01668885867', rocket: d.rocket || '01668885867' };
    }
  });
  // Games
  db.collection('categories').orderBy('slot').onSnapshot(() => loadGames());
  db.collection('services').onSnapshot(snap => {
    gamesData = {};
    allGames = [];
    snap.forEach(doc => {
      const d = doc.data();
      gamesData[doc.id] = d;
      allGames.push({ id: doc.id, ...d });
    });
    loadGames();
  });
  // Banners
  db.collection('banners').onSnapshot(snap => {
    const w = document.getElementById('sliderWrapper');
    let html = '';
    snap.forEach(doc => {
      const d = doc.data();
      if(d.image) html += '<img src="' + d.image + '" onerror="this.src=\'https://placehold.co/600x300/6366f1/FFF?text=GAME+BAZAR\'">';
    });
    if(html){ w.innerHTML = html; startSlider(); }
  });
  // Chat
  startUserChatListener();
}

// ═══════════ LOAD GAMES ═══════════
async function loadGames(){
  const c = document.getElementById('servicesList');
  try {
    const cS = await db.collection('categories').orderBy('slot').get();
    let cats = {};
    cS.forEach(d => cats[d.id] = { ...d.data(), games: [] });
    let uncat = [];
    allGames.forEach(g => {
      if(g.categoryId && cats[g.categoryId]) cats[g.categoryId].games.push(g);
      else uncat.push(g);
    });
    let html = '';
    for(const cid in cats){
      const cat = cats[cid];
      if(!cat.games.length) continue;
      html += '<h3 class="cat-title">' + cat.name + '</h3><div class="games-grid">';
      cat.games.forEach(g => {
        html += '<div class="game-card" onclick="openTopUp(\'' + g.id + '\',\'' + (g.name || '').replace(/'/g, "\\'") + '\',\'' + (g.image || '') + '\')">'
          + '<img src="' + (g.image || 'https://placehold.co/200/6366f1/FFF?text=G') + '" onerror="this.src=\'https://placehold.co/200/6366f1/FFF?text=G\'">'
          + '<div class="name">' + g.name + '</div></div>';
      });
      html += '</div>';
    }
    if(uncat.length){
      html += '<h3 class="cat-title">অন্যান্য</h3><div class="games-grid">';
      uncat.forEach(g => {
        html += '<div class="game-card" onclick="openTopUp(\'' + g.id + '\',\'' + (g.name || '').replace(/'/g, "\\'") + '\',\'' + (g.image || '') + '\')">'
          + '<img src="' + (g.image || 'https://placehold.co/200/94a3b8/FFF?text=G') + '">'
          + '<div class="name">' + g.name + '</div></div>';
      });
      html += '</div>';
    }
    if(!html) html = '<div class="empty-state"><i class="fas fa-gamepad"></i><p>কোন গেম নেই</p></div>';
    c.innerHTML = html;
  } catch(e){ c.innerHTML = '<p class="text-center text-muted">লোড ব্যর্থ</p>'; }
}

// ═══════════ SLIDER ═══════════
let sliderInterval;
function startSlider(){
  clearInterval(sliderInterval);
  const w = document.getElementById('sliderWrapper');
  const dots = document.getElementById('sliderDots');
  const n = w.children.length;
  if(n < 2){ dots.innerHTML = ''; return; }
  dots.innerHTML = '';
  for(let k = 0; k < n; k++) dots.innerHTML += '<span class="' + (k === 0 ? 'on' : '') + '"></span>';
  let i = 0;
  sliderInterval = setInterval(() => {
    i = (i + 1) % n;
    w.style.transform = 'translateX(-' + (i * 100) + '%)';
    dots.querySelectorAll('span').forEach((s, k) => s.classList.toggle('on', k === i));
  }, 3500);
}

// ═══════════ TOPUP ═══════════
function openTopUp(gid, gname, gimg){
  if(!currentUser) return;
  selectedGameId = gid;
  selectedGameName = gname;
  selectedProduct = null;
  selectedGameType = gamesData[gid]?.type || 'uid';
  document.getElementById('totalPrice').innerText = '0';
  document.getElementById('selectedPackageName').innerText = 'None';
  document.getElementById('gamePlayerId').value = '';
  document.getElementById('topupGameTitle').innerText = gname;
  document.getElementById('topupSubTitle').innerText = gname;
  document.getElementById('topupGameImg').src = gimg || 'https://placehold.co/200/6366f1/FFF?text=G';
  const typeLabel = selectedGameType === 'code' ? 'ভাউচার' : selectedGameType === 'auto-topup' ? 'অটো' : 'UID টপআপ';
  document.getElementById('topupGameType').innerText = typeLabel;
  document.getElementById('playerIdSection').classList.toggle('hidden', selectedGameType === 'code');
  if(gamesData[gid]?.rules){
    document.getElementById('gameRulesText').innerText = gamesData[gid].rules;
    document.getElementById('gameRulesBox').classList.remove('hidden');
  } else document.getElementById('gameRulesBox').classList.add('hidden');
  showSec('topup');
  const grid = document.getElementById('productsGrid');
  const loader = document.getElementById('productLoader');
  grid.innerHTML = '';
  loader.classList.remove('hidden');
  db.collection('services').doc(gid).collection('products').orderBy('price', 'asc').get().then(snap => {
    loader.classList.add('hidden');
    if(snap.empty){ grid.innerHTML = '<p class="text-xs text-muted" style="grid-column:span 2;text-align:center;padding:20px">No packages</p>'; return; }
    snap.forEach(doc => {
      const p = doc.data();
      const inS = p.stockCount === undefined || p.stockCount > 0;
      const card = document.createElement('div');
      card.className = 'pkg-card';
      card.innerHTML = '<div class="pkg-name">' + p.name + '</div><div class="pkg-price">৳' + p.price + '</div>';
      if(inS) card.onclick = () => selectProduct(card, p.name, p.price, doc.id);
      else card.style.opacity = '.5';
      grid.appendChild(card);
    });
  }).catch(() => { loader.classList.add('hidden'); });
}

function selectProduct(el, name, price, id){
  document.querySelectorAll('.pkg-card').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  selectedProduct = { id, name, price: parseInt(price) };
  document.getElementById('totalPrice').innerText = selectedProduct.price;
  document.getElementById('selectedPackageName').innerText = selectedProduct.name;
}

async function processOrder(){
  let playerId = 'N/A';
  if(selectedGameType === 'uid' || selectedGameType === 'auto-topup'){
    playerId = document.getElementById('gamePlayerId').value.trim();
    if(!playerId) return alert('Player ID required');
  }
  if(!selectedProduct) return alert('Select a package');
  if(userBalance < selectedProduct.price) return alert('Insufficient balance. Current: ৳' + userBalance);
  if(!confirm('Confirm order?\nGame: ' + selectedGameName + '\nPackage: ' + selectedProduct.name + '\nPrice: ৳' + selectedProduct.price + '\nPlayer: ' + playerId)) return;

  try {
    if(selectedGameType === 'code'){
      // Voucher flow
      const stockRef = db.collection('services').doc(selectedGameId).collection('products').doc(selectedProduct.id).collection('stock');
      const snap = await stockRef.where('status', '==', 'available').limit(1).get();
      if(snap.empty) return alert('Out of stock');
      const sd = snap.docs[0];
      const code = sd.data().code;
      const uRef = db.collection('users').doc(currentUser.uid);
      await db.runTransaction(async t => {
        const u = await t.get(uRef);
        const nb = (u.data().balance || 0) - selectedProduct.price;
        if(nb < 0) throw new Error('Balance');
        t.update(uRef, { balance: nb });
        t.delete(sd.ref);
        t.update(db.collection('services').doc(selectedGameId).collection('products').doc(selectedProduct.id), { stockCount: firebase.firestore.FieldValue.increment(-1) });
      });
      await db.collection('orders').add({ userId: currentUser.uid, userName: currentUser.email, gameName: selectedGameName, gameId: selectedGameId, productName: selectedProduct.name, price: selectedProduct.price, playerId: 'ভাউচার', type: 'code', status: 'success', redeemCode: code, date: firebase.firestore.FieldValue.serverTimestamp() });
      await sendTG('🎟️ VOUCHER', '🎮 ' + selectedGameName + '\n📦 ' + selectedProduct.name + '\n💰 ৳' + selectedProduct.price + '\n🔑 <code>' + code + '</code>');
      alert('Order success! Code: ' + code);
    } else {
      const uRef = db.collection('users').doc(currentUser.uid);
      const u = await uRef.get();
      const nb = (u.data().balance || 0) - selectedProduct.price;
      await uRef.update({ balance: nb });
      await db.collection('orders').add({ userId: currentUser.uid, userName: currentUser.email, gameName: selectedGameName, gameId: selectedGameId, playerId: playerId, productName: selectedProduct.name, price: selectedProduct.price, type: 'uid', status: 'pending', date: firebase.firestore.FieldValue.serverTimestamp() });
      await sendTG('🛒 NEW ORDER', '🎮 ' + selectedGameName + '\n📦 ' + selectedProduct.name + '\n💰 ৳' + selectedProduct.price + '\n🆔 <code>' + playerId + '</code>\n👤 ' + currentUser.email);
      alert('Order placed! Admin will verify.');
    }
    showSec('home');
  } catch(e){ alert('Error: ' + e.message); }
}

// ═══════════ ADD MONEY ═══════════
function setQuickAmt(a){ document.getElementById('newAmount').value = a; }
function goToMethodStep(){
  const v = parseInt(document.getElementById('newAmount').value);
  if(!v || v < 10) return alert('Minimum ৳10');
  currentAmount = v;
  document.getElementById('am-step-1').classList.add('hidden');
  document.getElementById('am-step-2').classList.remove('hidden');
  renderPaymentMethods();
}
function backToAmount(){
  document.getElementById('am-step-2').classList.add('hidden');
  document.getElementById('am-step-1').classList.remove('hidden');
  document.getElementById('selectedMethodInfo').classList.add('hidden');
  document.getElementById('payTrxInput').value = '';
  currentMethod = 'bkash';
}
function renderPaymentMethods(){
  const box = document.getElementById('paymentMethodsList');
  box.innerHTML = '';
  ['bkash', 'nagad', 'rocket'].forEach(k => {
    const div = document.createElement('div');
    div.className = 'pay-method' + (k === 'bkash' ? ' on' : '');
    div.dataset.method = k;
    div.onclick = () => selectMethod(k);
    div.innerHTML = '<img src="' + LOGOS[k] + '"><div class="name">' + METHODS[k].name + '</div>';
    box.appendChild(div);
  });
  selectMethod('bkash');
}
function selectMethod(k){
  currentMethod = k;
  document.querySelectorAll('.pay-method').forEach(el => el.classList.toggle('on', el.dataset.method === k));
  document.getElementById('selectedMethodInfo').classList.remove('hidden');
  document.getElementById('payNumber').innerText = paymentNumbers[k] || '01XXXXXXXXX';
  document.getElementById('ussdLine').innerHTML = '<i class="fas fa-phone"></i> ' + METHODS[k].ussd + ' ডায়াল করে ' + METHODS[k].name + ' সিলেক্ট করুন → Send Money → ৳' + currentAmount;
  document.getElementById('payTrxInput').value = '';
}
function copyPayNum(){
  navigator.clipboard.writeText(document.getElementById('payNumber').innerText);
  alert('Copied!');
}
async function submitDeposit(){
  const trx = document.getElementById('payTrxInput').value.trim().toUpperCase();
  if(!trx || trx.length < 4) return alert('Enter valid TrxID');
  try {
    await db.collection('deposits').add({
      userId: currentUser.uid, userEmail: currentUser.email, amount: currentAmount, trxId: trx, method: METHODS[currentMethod].name, status: 'pending', date: firebase.firestore.FieldValue.serverTimestamp()
    });
    await sendTG('💰 NEW DEPOSIT', '💵 ৳' + currentAmount + '\n👤 ' + currentUser.email + '\n💳 ' + METHODS[currentMethod].name + '\n🔖 <code>' + trx + '</code>');
    alert('Deposit request sent! Admin will verify.');
    backToAmount();
    loadDepositHistory();
  } catch(e){ alert('Failed: ' + e.message); }
}
function loadDepositHistory(){
  if(!currentUser) return;
  db.collection('deposits').where('userId', '==', currentUser.uid).get().then(snap => {
    const list = document.getElementById('depositHistory');
    if(snap.empty){ list.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>কোন ডিপোজিট নেই</p></div>'; return; }
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    arr.sort((a, b) => {
      const ta = a.date?.toDate?.() || new Date(0);
      const tb = b.date?.toDate?.() || new Date(0);
      return tb - ta;
    });
    list.innerHTML = '';
    arr.slice(0, 20).forEach(d => {
      const st = (d.status || 'pending').toLowerCase();
      const cls = st === 'approved' || st === 'success' ? 'st-s' : st === 'rejected' ? 'st-r' : 'st-p';
      list.innerHTML += '<div class="order-card"><div class="order-head"><div><h4>৳' + d.amount + '</h4><p class="date">TrxID: ' + d.trxId + '</p></div><span class="st ' + cls + '">' + st + '</span></div><div class="order-info"><span>' + (d.method || 'Manual') + '</span><span style="font-size:10px;color:var(--tm)">' + (d.date?.toDate?.().toLocaleString() || '') + '</span></div></div>';
    });
  });
}

// ═══════════ HISTORY ═══════════
function filterHist(f){
  histFilter = f;
  ['all', 'pending', 'success'].forEach(x => document.getElementById('hf-' + x).classList.toggle('on', x === f));
  renderHistory();
}
function renderHistory(){
  const list = document.getElementById('historyList');
  let arr = allOrderCache;
  if(histFilter !== 'all'){
    arr = arr.filter(o => {
      const st = (o.status || 'pending').toLowerCase();
      if(histFilter === 'success') return ['success', 'complete', 'completed'].includes(st);
      return st === histFilter;
    });
  }
  if(!arr.length){ list.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-basket"></i><p>কোন অর্ডার নেই</p></div>'; return; }
  list.innerHTML = '';
  arr.forEach(d => {
    const st = (d.status || 'pending').toLowerCase();
    let cls = 'st-p', cardCls = '';
    if(['success', 'complete', 'completed'].includes(st)){ cls = 'st-s'; cardCls = 'success'; }
    else if(['refunded', 'rejected'].includes(st)){ cls = 'st-r'; cardCls = 'refunded'; }
    const dt = d.date?.toDate?.()?.toLocaleString() || '';
    let extra = '';
    if(d.redeemCode) extra = '<div class="voucher-code"><p>Voucher Code</p><p>' + d.redeemCode + '</p></div>';
    else if(d.playerId && d.playerId !== 'ভাউচার') extra = '<p class="text-xs text-muted" style="margin-top:6px"><i class="fas fa-id-card"></i> UID: <span style="font-family:monospace;color:var(--tp);font-weight:700">' + d.playerId + '</span></p>';
    list.innerHTML += '<div class="order-card ' + cardCls + '"><div class="order-head"><div><h4>' + (d.gameName || 'Game') + '</h4><p class="date">' + dt + '</p></div><div class="price">৳' + d.price + '</div></div><div class="order-info"><span class="pkg-name">' + (d.productName || '') + '</span><span class="st ' + cls + '">' + st + '</span></div>' + extra + '</div>';
  });
}

// ═══════════ ACCOUNT LOADING ═══════════
async function loadMyOrders(){
  if(!currentUser) return;
  const snap = await db.collection('orders').where('userId', '==', currentUser.uid).limit(200).get();
  allOrderCache = [];
  snap.forEach(d => allOrderCache.push({ id: d.id, ...d.data() }));
  allOrderCache.sort((a, b) => {
    const ta = a.date?.toDate?.() || new Date(0);
    const tb = b.date?.toDate?.() || new Date(0);
    return tb - ta;
  });
  renderHistory();
}

// ═══════════ LIVE CHAT ═══════════
function startUserChatListener(){
  if(!currentUser) return;
  if(userChatUnsub) userChatUnsub();
  userChatUnsub = db.collection('chats').doc(currentUser.uid).onSnapshot(doc => {
    if(doc.exists && doc.data().unreadUser > 0){
      // could update badge
    }
  });
}
function openLiveChat(){
  if(!currentUser) return;
  document.getElementById('liveChatPanel').classList.remove('hidden');
  db.collection('chats').doc(currentUser.uid).set({
    userEmail: currentUser.email,
    userName: userData.name || currentUser.email,
    lastTime: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(() => {
    db.collection('chats').doc(currentUser.uid).update({ unreadUser: 0 }).catch(() => {});
  });
  if(chatMsgUnsub) chatMsgUnsub();
  chatMsgUnsub = db.collection('chats').doc(currentUser.uid).collection('messages').orderBy('time', 'asc').limit(200).onSnapshot(snap => {
    const box = document.getElementById('chatMessages');
    box.innerHTML = '';
    if(snap.empty){ box.innerHTML = '<p class="text-xs text-muted" style="text-align:center;padding:30px">Send a message to start</p>'; return; }
    snap.forEach(doc => {
      const m = doc.data();
      const isAdmin = m.sender === 'admin';
      const t = m.time?.toDate?.().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '';
      box.innerHTML += '<div class="cmsg ' + (isAdmin ? 'cmsg-admin' : 'cmsg-user') + '">' + escapeH(m.text) + '<div class="cmsg-time">' + t + '</div></div>';
    });
    box.scrollTop = box.scrollHeight;
  });
}
function closeLiveChat(){
  document.getElementById('liveChatPanel').classList.add('hidden');
  if(chatMsgUnsub){ chatMsgUnsub(); chatMsgUnsub = null; }
}
async function sendUserMsg(){
  if(!currentUser) return;
  const inp = document.getElementById('userChatInput');
  const txt = inp.value.trim();
  if(!txt) return;
  inp.value = '';
  const name = userData.name || currentUser.email || 'User';
  await db.collection('chats').doc(currentUser.uid).set({
    userEmail: currentUser.email, userName: name,
    lastMessage: txt.slice(0, 80),
    lastTime: firebase.firestore.FieldValue.serverTimestamp(),
    unreadAdmin: firebase.firestore.FieldValue.increment(1)
  }, { merge: true });
  await db.collection('chats').doc(currentUser.uid).collection('messages').add({ text: txt, sender: 'user', time: firebase.firestore.FieldValue.serverTimestamp() });
  await sendTG('💬 CHAT', '👤 ' + name + '\n📧 ' + currentUser.email + '\n💬 "' + txt.slice(0, 200) + '"');
}
function escapeH(s){ return (s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ═══════════ NAVIGATION ═══════════
function showSec(id){
  document.querySelectorAll('.sec').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('on'));
  const sec = document.getElementById('sec-' + id);
  if(sec) sec.classList.remove('hidden');
  const nav = document.getElementById('nav-' + id);
  if(nav) nav.classList.add('on');
  if(id === 'addmoney'){
    document.getElementById('am-step-1').classList.remove('hidden');
    document.getElementById('am-step-2').classList.add('hidden');
    loadDepositHistory();
  }
  if(id === 'history') loadMyOrders();
  window.scrollTo(0, 0);
}

function openSideMenu(){
  document.getElementById('sideMenu').classList.add('open');
  document.getElementById('sideMenuOv').classList.add('open');
}
function closeSideMenu(){
  document.getElementById('sideMenu').classList.remove('open');
  document.getElementById('sideMenuOv').classList.remove('open');
}

// ═══════════ INIT ═══════════
window.addEventListener('load', () => {
  watchTelegram();
});

// Prevent double tap zoom
let lastTouch = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if(now - lastTouch <= 300) e.preventDefault();
  lastTouch = now;
}, false);
