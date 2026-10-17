export const firebaseConfig = {
  apiKey: "AIzaSyCToUghMTET8xXEhKZlZOgrVCc46kg6FJU",
  authDomain: "tiger-topup-a5a57.firebaseapp.com",
  databaseURL: "https://tiger-topup-a5a57-default-rtdb.firebaseio.com",
  projectId: "tiger-topup-a5a57",
  storageBucket: "tiger-topup-a5a57.firebasestorage.app",
  messagingSenderId: "625064331537",
  appId: "1:625064331537:web:f91cb3e00ff6187a52a4b0"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();
export const auth = firebase.auth();
