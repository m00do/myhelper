import { Router } from 'express';
import { wymagajRoli } from '../middleware.js';
import { pobierzLocals } from '../kontekst.js';
import { odczytajDane } from '../../dane/dane_konwentu.js';

const router = Router();

router.use(wymagajRoli('magazyn'));

// stan początkowy magazynu — dowolna struktura JSON wgrana przez administratora.
// Jeśli plik ma kształt { przedmioty: [{ nazwa, ilosc, jednostka? }, ...] }, strona domyślna
// wyrenderuje go jako listę/tabelę; w przeciwnym razie pokaże sformatowany JSON.
router.get('/stan', async (req, res) => {
    const { slug } = pobierzLocals(req);
    const dane = await odczytajDane(slug, 'magazyn');
    if (dane === null) {
        res.status(404).json({ blad: 'Administrator nie wgrał jeszcze pliku stanu magazynu (magazyn.json).' });
        return;
    }
    res.json(dane);
});

export default router;
