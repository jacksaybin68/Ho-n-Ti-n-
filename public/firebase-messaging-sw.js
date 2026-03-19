// firebase-messaging-sw.js
// Stub service worker - Firebase Messaging is mocked locally via mockFirebase.ts
// This file exists to prevent 404 errors when the browser looks for it.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {});
