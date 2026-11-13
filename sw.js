"use strict";
const VERSAO = "sem-misturar-v3";
const ESSENCIAIS = ["./", "./index.html", "./manifest.json", "./icon.svg"];
const ICONES = ["./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(VERSAO).then(function (guardado) {
      return guardado.addAll(ESSENCIAIS).then(function () {
        return Promise.all(ICONES.map(function (caminho) {
          return guardado.add(caminho).catch(function () {});
        }));
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (chaves) {
      return Promise.all(chaves.map(function (chave) {
        if (chave !== VERSAO && chave.indexOf("sem-misturar-") === 0) {
          return caches.delete(chave);
        }
        return undefined;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (evento) {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  let url;
  try { url = new URL(pedido.url); } catch (erro) { return; }
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).then(function (resposta) {
        const copia = resposta.clone();
        caches.open(VERSAO).then(function (guardado) {
          guardado.put(pedido, copia);
        });
        return resposta;
      }).catch(function () {
        return caches.match(pedido).then(function (achado) {
          return achado || caches.match("./index.html");
        });
      })
    );
    return;
  }

  evento.respondWith(
    caches.match(pedido).then(function (achado) {
      if (achado) return achado;
      return fetch(pedido).then(function (resposta) {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then(function (guardado) {
            guardado.put(pedido, copia);
          });
        }
        return resposta;
      });
    })
  );
});
