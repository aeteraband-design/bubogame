// Пустой сервис-воркер: нужен только чтобы браузер позволил установить игру как приложение. Ничего не кэширует — всегда свежая версия игры.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
