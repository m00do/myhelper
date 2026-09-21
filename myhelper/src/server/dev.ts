// Punkt wejścia TYLKO do lokalnego testowania serwera bez uruchamiania TUI.
// Tworzy przykładowy konwent testowy (jeśli nie istnieje) i publikuje go bez DNS (samo IP/localhost).
import { inicjalizujFoldery } from '../dane/status.js';
import { inicjalizujSpisKonwentow } from '../dane/spis.js';
import { zapiszKonwent, odczytajKonwent, czyKonwentIstnieje, generujSlug } from '../dane/konwent.js';
import { hashujHaslo } from '../dane/haslo.js';
import { uruchomKonwent } from './manager.js';

const NAZWA_TESTOWA = 'Konwent Testowy';
const SLUG_TESTOWY = generujSlug(NAZWA_TESTOWA);

async function main() {
    await inicjalizujFoldery();
    await inicjalizujSpisKonwentow();

    if (!(await czyKonwentIstnieje(SLUG_TESTOWY))) {
        await zapiszKonwent({
            nazwa: NAZWA_TESTOWA,
            Login_root: 'root',
            Password_root: await hashujHaslo('root1234'),
            LAN_DNS_enable: false,
            KADRY: true,
            PROGRAM: true,
            MAGAZYN: true,
            SKLEPIK: true,
            slug: SLUG_TESTOWY,
        });
        console.log(`Utworzono konwent testowy "${NAZWA_TESTOWA}" (slug: ${SLUG_TESTOWY}), login: root / root1234`);
    }

    const konwent = await odczytajKonwent(SLUG_TESTOWY);
    if (!konwent) throw new Error('Nie udało się odczytać konwentu testowego.');

    const status = await uruchomKonwent(konwent.slug, konwent.nazwa, konwent.LAN_DNS_enable);
    console.log('Serwer uruchomiony:', status);
}

main().catch((blad) => {
    console.error(blad);
    process.exit(1);
});
