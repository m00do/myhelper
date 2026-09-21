import { Router } from 'express';
import { wymagajRoli } from '../middleware.js';
import { pobierzLocals } from '../kontekst.js';
import { odczytajDane, zapiszDane, czyDaneWgrane, dataOstatniejAktualizacji } from '../../dane/dane_konwentu.js';
import { odczytajUzytkownikow, dodajUzytkownika, usunUzytkownika } from '../../dane/uzytkownicy.js';
import { hashujHaslo } from '../../dane/haslo.js';
import { TYPY_DANYCH, ROLE_DO_WYBORU, type TypDanych, type Rola } from '../../dane/typy.js';

const router = Router();

router.use(wymagajRoli('admin'));

function poprawnyTyp(typ: string): typ is TypDanych {
    return (TYPY_DANYCH as string[]).includes(typ);
}

// przegląd stanu wszystkich 4 plików danych (czy wgrane, kiedy ostatnio)
router.get('/stan', (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = Object.fromEntries(
        TYPY_DANYCH.map((typ) => [
            typ,
            {
                wgrane: czyDaneWgrane(slug, typ),
                aktualizacja: dataOstatniejAktualizacji(slug, typ),
            },
        ])
    );
    res.json(stan);
});

router.get('/dane/:typ', async (req, res) => {
    const { typ } = req.params;
    if (!poprawnyTyp(typ)) {
        res.status(404).json({ blad: 'Nieznany typ danych.' });
        return;
    }
    const { slug } = pobierzLocals(req);
    const dane = await odczytajDane(slug, typ);
    if (dane === null) {
        res.status(404).json({ blad: 'Brak wgranego pliku dla tego panelu.' });
        return;
    }
    res.json(dane);
});

router.post('/dane/:typ', async (req, res) => {
    const { typ } = req.params;
    if (!poprawnyTyp(typ)) {
        res.status(404).json({ blad: 'Nieznany typ danych.' });
        return;
    }
    if (req.body === undefined || req.body === null || typeof req.body !== 'object') {
        res.status(400).json({ blad: 'Nieprawidłowa zawartość pliku .json.' });
        return;
    }
    const { slug } = pobierzLocals(req);
    await zapiszDane(slug, typ, req.body);
    res.json({ ok: true });
});

// --- zarządzanie kontami ról (admin/program/kadry/magazyn/sklepik) z poziomu przeglądarki ---
// (to samo co Panel Konwentu -> Użytkownicy w TUI, tylko dostępne też przez panel administratora w sieci)

router.get('/uzytkownicy', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const lista = await odczytajUzytkownikow(slug);
    res.json(lista.map(({ Password_hash, ...reszta }) => reszta));
});

router.post('/uzytkownicy', async (req, res) => {
    const { login, haslo, rola, dzial } = (req.body ?? {}) as { login?: string; haslo?: string; rola?: Rola; dzial?: string };
    if (!login || !haslo || !rola) {
        res.status(400).json({ blad: 'Podaj login, hasło i rolę.' });
        return;
    }
    if (!(ROLE_DO_WYBORU as string[]).includes(rola)) {
        res.status(400).json({ blad: 'Nieznana rola.' });
        return;
    }
    const { slug } = pobierzLocals(req);
    const Password_hash = await hashujHaslo(haslo);
    const wynik = await dodajUzytkownika(slug, { login, Password_hash, rola, dzial: dzial || undefined });
    if (!wynik.ok) {
        res.status(409).json({ blad: wynik.blad });
        return;
    }
    res.json({ ok: true });
});

router.delete('/uzytkownicy/:login', async (req, res) => {
    const { slug } = pobierzLocals(req);
    await usunUzytkownika(slug, req.params.login);
    res.json({ ok: true });
});

export default router;
