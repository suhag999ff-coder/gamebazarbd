# GAME BAZAR — UI/UX fixed project

## কী ঠিক করা হয়েছে
- `admin.html` এখন `css/admin.css`, `js/admin.js`, `js/firebase-config.js` ফাইলগুলো সঠিক জায়গায় পাবে।
- `index.html`-এর অনুপস্থিত `css/user.css` এবং `js/user.js` যোগ করা হয়েছে।
- Admin ও User panel-এর responsive styling, card, spacing, color, login screen এবং mobile layout উন্নত করা হয়েছে।
- User side-এ Firebase email/password login, register, profile balance display এবং `categories` collection থেকে category display-এর basic wiring যোগ করা হয়েছে।

## Folder structure
- `index.html` — User panel
- `admin.html` — Admin panel
- `css/admin.css`, `css/user.css`
- `js/admin.js`, `js/user.js`, `js/firebase-config.js`
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`

## গুরুত্বপূর্ণ সীমাবদ্ধতা
আপনার আপলোড করা `admin.html`-এ বর্তমানে শুধু dashboard-এর Total Revenue, Total Users, Pending Orders আছে। গেম add/edit/delete, deposit approve/reject, payment method management, order management ইত্যাদির UI ও logic এই source files-এ ছিল না—তাই এগুলোকে সম্পূর্ণ feature হিসেবে দাবি করা হচ্ছে না। User side-এও game click/order flow-এর পূর্ণ logic নেই; category card ক্লিক করলে সেটি জানিয়ে দেবে।

## Firebase ও নিরাপত্তা
1. `js/firebase-config.js`-এ আপনার Firebase web config রাখা হয়েছে। Firebase web config সাধারণত client-side-এ থাকে, কিন্তু Firestore Rules অবশ্যই সঠিক হতে হবে।
2. Admin login করার পর rules-এ যেই `admins/{uid}` document ও `enabled: true` চাওয়া হয়েছে, সেটি নিশ্চিত করুন। আপনার আগের admin document-এ `active: true` থাকলে rules-এর `enabled` শর্তের সঙ্গে mismatch হবে।
3. `api-notify.js`-এর জন্য `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` server environment variables লাগবে। এগুলো কখনো frontend-এ রাখবেন না।
4. Local preview-তে `file://` দিয়ে খুলবেন না। Firebase module import-এর জন্য Firebase Hosting বা অন্য local web server ব্যবহার করুন.
5. Deploy: `firebase deploy` (Firebase CLI দরকার)।
