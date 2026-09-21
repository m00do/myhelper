import { Router } from 'express';
import { wymagajRoli } from '../middleware.js';
import { pobierzLocals, pobierzZalogowanego } from '../kontekst.js';
import { odczytajDane } from '../../dane/dane_konwentu.js';
import { obliczObecneDyzury, rozpiskaDzialu, listaDzialow, listaDostepnychDni, tabliceNaDzien } from '../logika/kadry.js';

const router = Router();

router.use(wymagajRoli('kadry'));

// surowe dane grafiku (dla własnych, bardziej rozbudowanych widoków)
router.get('/grafik', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'kadry');
    if (stan === null) {
        res.status(404).json({ blad: 'Administrator nie wgrał jeszcze pliku grafiku (kadry.json).' });
        return;
    }
    res.json(stan);
});

// lista działów do wyboru
router.get('/dzialy', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'kadry');
    res.json(listaDzialow(stan));
});

// lista dostępnych dni (do selektora "wybierz dzień")
router.get('/dni', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'kadry');
    res.json(listaDostepnychDni(stan));
});

// tablica wszystkich działów na jeden dzień (widok "kolumn" dział obok działu)
router.get('/tablica/:data', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'kadry');
    res.json(tabliceNaDzien(stan, req.params.data));
});

// dyżury trwające w tej chwili (wszystkie działy, albo jeden przez ?dzial=id)
router.get('/obecne', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'kadry');
    const dzialId = typeof req.query.dzial === 'string' ? req.query.dzial : undefined;
    res.json(obliczObecneDyzury(stan, { dzialId }));
});

// pełna rozpiska jednego działu (domyślnie dzisiaj; ?data=YYYY-MM-DD dla innego dnia)
router.get('/rozpiska/:dzialId', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'kadry');
    const data = typeof req.query.data === 'string' ? req.query.data : undefined;
    const rozpiska = rozpiskaDzialu(stan, req.params.dzialId, { data });
    if (!rozpiska) {
        res.status(404).json({ blad: 'Nie znaleziono działu lub brak wgranych danych.' });
        return;
    }
    res.json(rozpiska);
});

// skrót: rozpiska działu przypisanego do zalogowanego konta (jeśli konto ma ustawiony `dzial`)
router.get('/moj-dzial', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const zalogowany = pobierzZalogowanego(req);
    if (!zalogowany?.dzial) {
        res.status(404).json({ blad: 'To konto nie ma przypisanego działu — wybierz dział ręcznie.' });
        return;
    }
    const stan = await odczytajDane(slug, 'kadry');
    const rozpiska = rozpiskaDzialu(stan, zalogowany.dzial);
    if (!rozpiska) {
        res.status(404).json({ blad: 'Nie znaleziono przypisanego działu w danych grafiku.' });
        return;
    }
    res.json(rozpiska);
});

export default router;
