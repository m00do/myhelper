// ogłaszanie adresu konwentu w sieci lokalnej jako `<slug>.local` przez mDNS (Bonjour/Zeroconf).
//
// UWAGA (ważne dla Publikacji): rozgłaszanie `.local` przez mDNS jest odbierane natywnie przez
// systemy macOS/iOS oraz większość dystrybucji Linuksa (Avahi). Windows z reguły wymaga
// zainstalowanej usługi Bonjour (np. razem z iTunes) lub Chrome/przeglądarki wspierającej mDNS —
// jeżeli urządzenie w sieci nie widzi `slug.local`, zawsze można połączyć się po adresie IP,
// który panel Publikacji pokazuje jako zapasowy adres.
import Bonjour from 'bonjour-service';

type UslugaOpublikowana = ReturnType<InstanceType<typeof Bonjour>['publish']>;

let instancja: InstanceType<typeof Bonjour> | null = null;
const opublikowane = new Map<string, UslugaOpublikowana>();

function pobierzInstancje(): InstanceType<typeof Bonjour> {
    if (!instancja) instancja = new Bonjour();
    return instancja;
}

export function ogłośDNS(slug: string, port: number): void {
    if (opublikowane.has(slug)) return;
    const usluga = pobierzInstancje().publish({
        name: slug,
        host: `${slug}.local`,
        type: 'http',
        port,
    });
    opublikowane.set(slug, usluga);
}

export function zatrzymajDNS(slug: string): void {
    const usluga = opublikowane.get(slug);
    if (!usluga) return;
    usluga.stop(() => {});
    opublikowane.delete(slug);
}

export function zatrzymajWszystkieDNS(): void {
    for (const slug of [...opublikowane.keys()]) zatrzymajDNS(slug);
    instancja?.destroy();
    instancja = null;
}
