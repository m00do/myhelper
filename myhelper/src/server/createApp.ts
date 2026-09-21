import express, { type Express } from 'express';
import path from 'node:path';
import { __Folder_Stron_Domyslnych, folderStron, ROLE_STRON } from '../dane/sciezki.js';
import { utworzMagazynSesji } from './sesje.js';
import type { LocalsAplikacji } from './kontekst.js';

import trasyAuth from './routes/auth.js';
import trasyAdmin from './routes/admin.js';
import trasyKadry from './routes/kadry.js';
import trasyProgram from './routes/program.js';
import trasyMagazyn from './routes/magazyn.js';
import trasySklepik from './routes/sklepik.js';

export function utworzAplikacjeKonwentu(slug: string, nazwaKonwentu: string): Express {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '20mb' }));

    const locals: LocalsAplikacji = { slug, nazwaKonwentu, sesje: utworzMagazynSesji() };
    app.locals = Object.assign(app.locals, locals);

    app.use('/api/auth', trasyAuth);
    app.use('/api/admin', trasyAdmin);
    app.use('/api/kadry', trasyKadry);
    app.use('/api/program', trasyProgram);
    app.use('/api/magazyn', trasyMagazyn);
    app.use('/api/sklepik', trasySklepik);

    // wspólne CSS/JS używane przez domyślne szablony stron (nie podlega nadpisywaniu per-konwent)
    app.use('/assets', express.static(path.join(__Folder_Stron_Domyslnych, '_assets')));

    // serwowanie stron: najpierw wersja własna wgrana przez administratora (Konwenty/<slug>/WWW/<rola>),
    // a jeśli jej nie ma (albo brak w niej danego pliku) — domyślny szablon z web/default/<rola>.
    // Strona logowania jest na `/`, pozostałe panele pod `/panel/<rola>/`.
    for (const rola of ROLE_STRON) {
        const trasa = rola === 'login' ? '/' : `/panel/${rola}`;
        app.use(trasa, express.static(path.join(folderStron(slug), rola)));
        app.use(trasa, express.static(path.join(__Folder_Stron_Domyslnych, rola)));
    }

    app.use((req, res) => {
        res.status(404).json({ blad: 'Nie znaleziono.' });
    });

    return app;
}
