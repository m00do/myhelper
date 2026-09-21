import { Router } from 'express';
import { sprawdzHaslo } from '../../dane/haslo.js';
import { odczytajKonwent } from '../../dane/konwent.js';
import { znajdzUzytkownika } from '../../dane/uzytkownicy.js';
import { pobierzLocals } from '../kontekst.js';

const router = Router();

router.post('/login', async (req, res) => {
    const { login, haslo } = (req.body ?? {}) as { login?: string; haslo?: string };
    const { slug } = pobierzLocals(req);

    if (!login || !haslo) {
        res.status(400).json({ blad: 'Podaj login i hasło.' });
        return;
    }

    const konwent = await odczytajKonwent(slug);
    if (!konwent) {
        res.status(500).json({ blad: 'Nie znaleziono konfiguracji konwentu na serwerze.' });
        return;
    }

    // konto root (właściciel konwentu)
    if (login === konwent.Login_root) {
        const ok = await sprawdzHaslo(haslo, konwent.Password_root);
        if (!ok) {
            res.status(401).json({ blad: 'Nieprawidłowy login lub hasło.' });
            return;
        }
        const { sesje } = pobierzLocals(req);
        const token = sesje.utworz({ slug, nazwa: konwent.nazwa, login, rola: 'root' });
        res.json({ token, rola: 'root', login, nazwaKonwentu: konwent.nazwa });
        return;
    }

    // konta ról (admin/program/kadry/magazyn/sklepik)
    const uzytkownik = await znajdzUzytkownika(slug, login);
    if (!uzytkownik || !(await sprawdzHaslo(haslo, uzytkownik.Password_hash))) {
        res.status(401).json({ blad: 'Nieprawidłowy login lub hasło.' });
        return;
    }

    const { sesje } = pobierzLocals(req);
    const token = sesje.utworz({
        slug,
        nazwa: konwent.nazwa,
        login: uzytkownik.login,
        rola: uzytkownik.rola,
        dzial: uzytkownik.dzial,
    });
    res.json({ token, rola: uzytkownik.rola, login: uzytkownik.login, dzial: uzytkownik.dzial, nazwaKonwentu: konwent.nazwa });
});

router.post('/wyloguj', (req, res) => {
    const naglowek = req.headers.authorization || '';
    const token = naglowek.startsWith('Bearer ') ? naglowek.slice(7) : undefined;
    if (token) pobierzLocals(req).sesje.usun(token);
    res.json({ ok: true });
});

export default router;
