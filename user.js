const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
let db, auth;

document.addEventListener('DOMContentLoaded', () => {
  db = window.__db;
  auth = window.__auth;
  initApp();
});

window.toggleAuth = function(v){ 
  if(v==='login'){ $('login-form').classList.remove('hidden'); $('register-form').classList.add('hidden'); $('btn-login-view').classList.add('on'); $('btn-reg-view').classList.remove('on'); } 
  else { $('login-form').classList.add('hidden'); $('register-form').classList.remove('hidden'); $('btn-reg-view').classList.add('on'); $('btn-login-view').classList.remove('on'); } 
};

window.handleRegister = async function(){
  const name=$('reg-name').value, email=$('reg-email').value, phone=$('reg-phone').value, pass=$('reg-pass').value;
  if(!name||!email||!pass) return Swal.fire('Error','Fill all fields','error');
  Swal.showLoading();
  try {
    const c = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection('users').doc(c.user.uid).set({name, email, phone, balance:0, totalSpend:0, createdAt:new Date()});
    if (window.__notify) window.__notify('new_user', null, auth);
    Swal.fire('Success','Account Created!','success');
  } catch(e){ Swal.fire('Error',e.message,'error'); }
};

window.handleLogin = async function(){
  const e=$('login-email').value, p=$('login-pass').value;
  if(!e||!p) return Swal.fire('Warning','Enter email & password','warning');
  Swal.showLoading();
  try {
    await auth.signInWithEmailAndPassword(e, p);
    if (window.__notify) window.__notify('user_login', null, auth);
  } catch(e){ Swal.fire('Login Failed',e.message,'error'); }
};

window.handleLogout = function(){ auth.signOut().then(() => location.reload()); };

window.showSec = function(id){
  document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nvi').forEach(n => n.classList.remove('on'));
  $(id+'-sec').classList.remove('hidden');
  $('nav-'+id).classList.add('on');
};

function initApp(){
  auth.onAuthStateChanged(user => {
    if(user){
      $('auth-sec').classList.add('hidden');
      $('app-content').classList.remove('hidden');
      // লোড ইউজার ডাটা
      db.collection('users').doc(user.uid).onSnapshot(doc => {
        if(doc.exists){
          const d = doc.data();
          setText('header-balance', d.balance || 0);
          setText('header-avatar', (d.name||'U').charAt(0));
          setText('acc-name', d.name);
          setText('acc-email', d.email);
        }
      });
      loadGames();
    } else {
      $('auth-sec').classList.remove('hidden');
      $('app-content').classList.add('hidden');
    }
  });
}

function loadGames() {
  db.collection('services').onSnapshot(snap => {
    const c = $('categories-container'); c.innerHTML = '';
    snap.forEach(doc => {
      const g = doc.data();
      c.innerHTML += `<div class="gcard"><img src="${g.image}" class="gimg"><div class="gname">${g.name}</div></div>`;
    });
  });
}
