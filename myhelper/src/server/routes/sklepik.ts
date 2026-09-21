import { Router } from 'express';
import { wymagajRoli } from '../middleware.js';
import { pobierzLocals } from '../kontekst.js';
import { odczytajDane, zapiszDane, czyDaneWgrane } from '../../dane/dane_konwentu.js';

const router = Router();

router.use(wymagajRoli('sklepik'));

const PUSTY_STAN = () => ({
    config: { shopName: 'Mój Sklepik', specialValue: 0.5 },
    products: [],
    transactions: [],
});

// pełny stan sklepiku (config + produkty + historia transakcji) — jeden dokument,
// tak samo jak w oryginalnym sklepik.html (tam trzymany w window.storage/localStorage).
router.get('/stan', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const stan = await odczytajDane(slug, 'sklepik');
    res.json(stan ?? PUSTY_STAN());
});

// zapisuje cały stan na raz (panel sklepiku wysyła to po każdej zmianie, jak dawniej robił z localStorage)
router.post('/stan', async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({ blad: 'Nieprawidłowe dane.' });
        return;
    }
    const { slug } = pobierzLocals(req);
    await zapiszDane(slug, 'sklepik', req.body);
    res.json({ ok: true });
});

router.get('/czy-skonfigurowany', (req, res) => {
    const { slug } = pobierzLocals(req);
    res.json({ skonfigurowany: czyDaneWgrane(slug, 'sklepik') });
});

export default router;
