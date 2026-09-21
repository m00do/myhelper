import { Router } from 'express';
import { wymagajRoli } from '../middleware.js';
import { pobierzLocals } from '../kontekst.js';
import { odczytajDane } from '../../dane/dane_konwentu.js';
import { obliczObecnePunkty, pelnyProgramZPodswietleniem } from '../logika/program.js';

const router = Router();

router.use(wymagajRoli('program'));

// surowe dane programu
router.get('/grafik', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'program');
    if (stan === null) {
        res.status(404).json({ blad: 'Administrator nie wgrał jeszcze pliku programu (program.json).' });
        return;
    }
    res.json(stan);
});

// punkty programu trwające w tej chwili, we wszystkich salach
router.get('/obecne', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'program');
    res.json(obliczObecnePunkty(stan));
});

// pełny program (bloki -> sale -> punkty) z flagą trwaTeraz przy każdym punkcie — gotowe do wyrenderowania w tabeli
router.get('/z-podswietleniem', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'program');
    res.json(pelnyProgramZPodswietleniem(stan));
});

export default router;
