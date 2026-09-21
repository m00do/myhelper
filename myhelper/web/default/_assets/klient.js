// MyHelper — wspólny klient API/sesji, używany przez wszystkie strony paneli.
// Token sesji trzymany jest w localStorage tej witryny (każdy konwent działa na własnym
// porcie/adresie, więc sesje różnych konwentów nigdy się nie mieszają).
(function (global) {
  'use strict';
  const KLUCZ_SESJI = 'myhelper_sesja';

  function wczytajSesje() {
    try { return JSON.parse(localStorage.getItem(KLUCZ_SESJI) || 'null'); }
    catch (e) { return null; }
  }
  function zapiszSesje(sesja) {
    localStorage.setItem(KLUCZ_SESJI, JSON.stringify(sesja));
  }
  function wyczyscSesje() {
    localStorage.removeItem(KLUCZ_SESJI);
  }

  async function wywolajApi(sciezka, opcje) {
    const sesja = wczytajSesje();
    const naglowki = Object.assign({ 'Content-Type': 'application/json' }, (opcje && opcje.headers) || {});
    if (sesja && sesja.token) naglowki['Authorization'] = 'Bearer ' + sesja.token;
    const odpowiedz = await fetch(sciezka, Object.assign({}, opcje, { headers: naglowki }));
    let dane = null;
    try { dane = await odpowiedz.json(); } catch (e) { /* brak treści JSON */ }
    if (!odpowiedz.ok) {
      if (odpowiedz.status === 401) { wyczyscSesje(); global.location.href = '/'; }
      const blad = new Error((dane && dane.blad) || ('Błąd ' + odpowiedz.status));
      blad.status = odpowiedz.status;
      throw blad;
    }
    return dane;
  }

  /** Wywołaj na starcie każdej strony panelu. Przekierowuje na /, jeśli brak sesji lub zła rola. */
  function wymagajZalogowania(dozwoloneRole) {
    const sesja = wczytajSesje();
    if (!sesja || !sesja.token) { global.location.href = '/'; return null; }
    if (dozwoloneRole && sesja.rola !== 'root' && dozwoloneRole.indexOf(sesja.rola) === -1) {
      global.location.href = '/';
      return null;
    }
    return sesja;
  }

  async function wyloguj() {
    try { await wywolajApi('/api/auth/wyloguj', { method: 'POST' }); } catch (e) { /* ignorujemy błąd wylogowania */ }
    wyczyscSesje();
    global.location.href = '/';
  }

  /** Ustawia nagłówek strony (odznaka + nazwa konwentu) i podpina przycisk wylogowania. */
  function ustawNaglowek(sesja) {
    document.body.dataset.rola = sesja.rola;
    const noteEl = document.getElementById('konwentNote');
    if (noteEl) noteEl.textContent = sesja.nazwaKonwentu + ' · ' + sesja.login;
    const wylogujBtn = document.getElementById('btnWyloguj');
    if (wylogujBtn) wylogujBtn.addEventListener('click', wyloguj);
  }

  function toast(msg, kind) {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) { console.log(msg); return; }
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast-' + kind : '');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str == null ? '' : str);
    return d.innerHTML;
  }

  global.MyHelper = { wczytajSesje, zapiszSesje, wyczyscSesje, wywolajApi, wymagajZalogowania, wyloguj, ustawNaglowek, toast, esc };
})(window);
