/* ==================== GAME BAZAR USER JS ==================== */
const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCToUghMTET8xXEhKZlZOgrVCc46kg6FJU",
  authDomain: "tiger-topup-a5a57.firebaseapp.com",
  projectId: "tiger-topup-a5a57",
  storageBucket: "tiger-topup-a5a57.firebasestorage.app",
  messagingSenderId: "625064331537",
  appId: "1:625064331537:web:f91cb3e00ff6187a52a4b0"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Auth Toggle
window.toggleAuth = function(v){ 
  if(v==='login'){ 
    $('login-form').classList.remove('hidden'); 
    $('register-form').classList.add('hidden'); 
    $('btn-login-view').classList.add('on'); 
    $('btn-reg-view').classList.remove('on'); 
  } else { 
    $('login-form').classList.add('hidden'); 
    $('register-form').classList.remove('hidden'); 
    $('btn-reg-view').classList.add('on'); 
    $('btn-login-view').classList.remove('on'); 
  } 
};

// Register
window.handleRegister = async function(){
  const name=$('reg-name').value;
  const email=$('reg-email').value;
  const phone=$('reg-phone').value;
  const pass=$('reg-pass').value;
  
  if(!name || !email || !pass) return Swal.fire('Error','Fill all fields','error');
  Swal.showLoading();
  
  try {
    const c = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection('users').doc(c.user.uid).set({
      name: name, 
      email: email, 
      phone: phone, 
      balance: 0, 
      totalSpend: 0, 
      createdAt: new Date()
    });
    Swal.fire('Success','Account Created!','success');
  } catch(e){ 
    Swal.fire('Error', e.message, 'error'); 
  }
};

// Login
window.handleLogin = async function(){
  const e=$('login-email').value;
  const p=$('login-pass').value;
  
  if(!e || !p) return Swal.fire('Warning','Enter email & password','warning');
  Swal.showLoading();
  
  try {
    await auth.signInWithEmailAndPassword(e, p);
  } catch(e){ 
    Swal.fire('Login Failed', e.message, 'error'); 
  }
};

// Logout
window.handleLogout = function(){ 
  auth.signOut().then(() => location.reload()); 
};

// Navigation
window.showSec = function(id){
  document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nvi').forEach(n => n.classList.remove('on'));
  $(id+'-sec').classList.remove('hidden');
  $('nav-'+id).classList.add('on');
};

// App Init
auth.onAuthStateChanged(user => {
  if(user){
    $('auth-sec').classList.add('hidden');
    $('app-content').classList.remove('hidden');
    
    // Load User Data
    db.collection('users').doc(user.uid).onSnapshot(doc => {
      if(doc.exists){
        const d = doc.data();
        setText('header-balance', d.balance || 0);
        setText('header-avatar', (d.name||'U').charAt(0).toUpperCase());
        setText('acc-name', d.name);
        setText('acc-email', d.email);
      }
    });
    
    // Load Games
    db.collection('services').onSnapshot(snap => {
      const c = $('categories-container'); 
      c.innerHTML = '';
      snap.forEach(doc => {
        const g = doc.data();
        c.innerHTML += `<div class="gcard"><img src="${g.image}" class="gimg"><div class="gname">${g.name}</div></div>`;
      });
    });
    
  } else {
    $('auth-sec').classList.remove('hidden');
    $('app-content').classList.add('hidden');
  }
});
