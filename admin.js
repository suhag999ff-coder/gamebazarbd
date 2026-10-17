const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
let db, auth;

document.addEventListener('DOMContentLoaded', () => {
  db = window.__db;
  auth = window.__auth;
  auth.onAuthStateChanged(user => {
    if(user){
      $('login-sec').classList.add('hidden');
      $('admin-app').classList.remove('hidden');
      loadDashboard();
    } else {
      $('login-sec').classList.remove('hidden');
      $('admin-app').classList.add('hidden');
    }
  });
});

window.adminLogin = function(){
  const e = $('admin-email').value, p = $('admin-pass').value;
  Swal.showLoading();
  auth.signInWithEmailAndPassword(e, p).catch(err => Swal.fire('Error', err.message, 'error'));
};

window.adminLogout = function(){
  auth.signOut().then(() => location.reload());
};

function loadDashboard(){
  db.collection('users').onSnapshot(snap => setText('dash-users', snap.size));
  db.collection('orders').onSnapshot(snap => {
    let pending = 0, revenue = 0;
    snap.forEach(doc => {
      const o = doc.data();
      if(o.status === 'pending') pending++;
      if(o.status === 'success') revenue += parseInt(o.price||0);
    });
    setText('dash-orders', pending);
    setText('dash-revenue', '৳ ' + revenue);
  });
}
