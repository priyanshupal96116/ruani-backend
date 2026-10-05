importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "gym-ai-manager.firebaseapp.com",
  projectId: "gym-ai-manager",
  storageBucket: "gym-ai-manager.firebasestorage.app",
  messagingSenderId: "177339795101",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "RUANI";
  const body =
    payload.notification?.body ||
    "RUANI mein naya alert hai.";

  self.registration.showNotification(title, {
    body: body,
    icon: "/icon.png",
    badge: "/icon.png"
  });
});