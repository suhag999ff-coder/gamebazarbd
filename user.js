
/* GAME BAZAR user panel — Firebase Auth + basic profile/category loading */
const byId = id => document.getElementById(id);
let auth, db, currentUser, stopCategories;

document.addEventListener('DOMContentLoaded', () => {
  auth = window.__auth || window.firebase?.auth?.();
  db = window.__db || window.firebase?.firestore?.();
  if (!auth || !db) {
    console.error('Firebase initialization not ready. Check js/firebase-config.js.');
    return;
  }
  auth.onAuthStateChanged(async user => {
    currentUser = user || null;
    byId('auth-sec')?.classList.toggle('hidden', !!user);
    byId('app-content')?.classList.toggle('hidden', !user);
    if (user) {
      await loadProfile(user);
      loadCategories();
    } else if (stopCategories) {
      stopCategories(); stopCategories = null;
    }
  });
});

window.toggleAuth = function(mode) {
  const login = mode === 'login';
  byId('login-form')?.classList.toggle('hidden', !login);
  byId('register-form')?.classList.toggle('hidden', login);
  byId('btn-login-view')?.classList.toggle('on', login);
  byId('btn-reg-view')?.classList.toggle('on', !login);
};

window.handleLogin = async function() {
  const email = byId('login-email')?.value.trim();
  const password = byId('login-pass')?.value;
  if (!email || !password) return alertBox('Email ও Password দিন');
  try { await auth.signInWithEmailAndPassword(email, password); }
  catch (e) { alertBox(firebaseError(e)); }
};

window.handleRegister = async function() {
  const name = byId('reg-name')?.value.trim();
  const email = byId('reg-email')?.value.trim();
  const phone = byId('reg-phone')?.value.trim();
  const password = byId('reg-pass')?.value;
  if (!name || !email || !password) return alertBox('নাম, Email ও Password দিন');
  if (password.length < 6) return alertBox('Password কমপক্ষে ৬ অক্ষরের হতে হবে');
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({displayName:name});
    await db.collection('users').doc(cred.user.uid).set({
      uid:cred.user.uid, name, email, phone, balance:0, createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});
  } catch(e) { alertBox(firebaseError(e)); }
};

window.handleLogout = async function() {
  try { await auth.signOut(); } catch(e) { alertBox(firebaseError(e)); }
};

window.showSec = function(name) {
  const home = name === 'home';
  byId('home-sec')?.classList.toggle('hidden', !home);
  byId('account-sec')?.classList.toggle('hidden', name !== 'account');
  byId('nav-home')?.classList.toggle('on', home);
  byId('nav-account')?.classList.toggle('on', name === 'account');
};

async function loadProfile(user) {
  const name = user.displayName || (user.email || 'User').split('@')[0];
  if (byId('acc-name')) byId('acc-name').textContent = name;
  if (byId('acc-email')) byId('acc-email').textContent = user.email || '';
  if (byId('header-avatar')) byId('header-avatar').textContent = name.slice(0,1).toUpperCase();
  try {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) await ref.set({uid:user.uid,name,email:user.email,balance:0}, {merge:true});
    const data = (await ref.get()).data() || {};
    if (byId('header-balance')) byId('header-balance').textContent = Number(data.balance || 0).toLocaleString('en-BD');
  } catch(e) { console.error('Profile load failed:',e); }
}

function loadCategories() {
  if (stopCategories) stopCategories();
  const target = byId('categories-container');
  if (!target) return;
  stopCategories = db.collection('categories').onSnapshot(snap => {
    target.innerHTML = '';
    if (snap.empty) {
      target.innerHTML = '<div class="col-span-3" style="grid-column:1/-1;background:white;padding:22px;border:1px solid #e1ebe6;border-radius:16px;text-align:center;color:#71827b"><div style="font-size:28px;margin-bottom:8px">🎮</div><b style="color:#174535">এখনো কোনো গেম যোগ করা হয়নি</b><p style="font-size:11px;margin:6px 0 0">Admin Panel থেকে গেম ক্যাটাগরি যোগ করুন</p></div>';
      return;
    }
    snap.forEach(doc => {
      const c = doc.data() || {};
      const card = document.createElement('button');
      card.className = 'category-card';
      const icon = document.createElement('img');
      icon.src = c.icon || c.image || 'https://placehold.co/100x100/006a4e/ffffff?text=GAME';
      icon.alt = c.name || 'Game';
      icon.onerror = () => { icon.src = 'https://placehold.co/100x100/006a4e/ffffff?text=GAME'; };
      const title = document.createElement('h3'); title.textContent = c.name || c.title || 'Game';
      card.append(icon,title);
      card.addEventListener('click', () => alertBox('এই গেমের অর্ডার/প্লে ফিচার এখনো এই আপলোড করা কোডে যুক্ত নেই।'));
      target.appendChild(card);
    });
  }, err => { console.error(err); target.innerHTML = '<p style="grid-column:1/-1;color:#b91c1c;font-size:12px">গেম লোড করা যায়নি। Firebase Rules ও Network চেক করুন।</p>'; });
}

function firebaseError(e) {
  const map = {'auth/invalid-credential':'Email বা Password সঠিক নয়।','auth/user-not-found':'এই Email দিয়ে অ্যাকাউন্ট পাওয়া যায়নি।','auth/email-already-in-use':'এই Email দিয়ে আগে থেকেই অ্যাকাউন্ট আছে.','auth/weak-password':'আরও শক্ত Password দিন।','auth/network-request-failed':'ইন্টারনেট সংযোগ চেক করুন।'};
  return map[e?.code] || e?.message || 'সমস্যা হয়েছে। আবার চেষ্টা করুন।';
}
function alertBox(message) {
  if (window.Swal) Swal.fire({icon:'info',text:message,confirmButtonColor:'#006a4e'});
  else alert(message);
}
