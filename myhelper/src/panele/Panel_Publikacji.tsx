import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import type { ZalogowanyKontekst, StatusPublikacji } from '../dane/typy.js';
import { odczytajKonwent } from '../dane/konwent.js';
import { uruchomKonwent, zatrzymajKonwent, statusKonwentu } from '../server/manager.js';

export default function Panel_Publikacji({
    kontekst,
    onBack,
}: {
    kontekst: ZalogowanyKontekst;
    onBack: () => void;
}) {
    const [status, setStatus] = useState<StatusPublikacji>(() => statusKonwentu(kontekst.slug));
    const [przetwarzanie, setPrzetwarzanie] = useState(false);
    const [blad, setBlad] = useState<string | null>(null);

    useInput((input, key) => {
        if (key.escape) {
            onBack();
            return;
        }
        if (przetwarzanie) return;
        if (input === 's' || input === 'S') void przelacz();
    });

    async function przelacz() {
        setBlad(null);
        setPrzetwarzanie(true);
        try {
            if (status.dziala) {
                await zatrzymajKonwent(kontekst.slug);
            } else {
                const konwent = await odczytajKonwent(kontekst.slug);
                if (!konwent) throw new Error('Nie udało się odczytać konfiguracji konwentu.');
                await uruchomKonwent(kontekst.slug, konwent.nazwa, konwent.LAN_DNS_enable);
            }
        } catch (e) {
            setBlad(e instanceof Error ? e.message : String(e));
        } finally {
            setStatus(statusKonwentu(kontekst.slug));
            setPrzetwarzanie(false);
        }
    }

    return (
        <Box flexDirection="column" width={'100%'}>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} flexDirection="column" padding={1}>
                <Text bold>Publikacja: {kontekst.nazwa}</Text>
                <Text> </Text>
                <Text>
                    Status: <Text color={status.dziala ? 'green' : 'red'}>{status.dziala ? 'DZIAŁA' : 'ZATRZYMANY'}</Text>
                </Text>
                {status.dziala && status.url && (
                    <Text>
                        Adres: <Text color="cyan">{status.url}</Text>
                    </Text>
                )}
                {status.dziala && status.dns === false && (
                    <Text dimColor>(DNS lokalny wyłączony lub niedostępny — dostępne tylko po adresie IP)</Text>
                )}
                {status.dziala && status.dns === true && (
                    <Text dimColor>
                        (rozgłaszane też jako adres IP, na wypadek gdyby urządzenie w sieci nie obsługiwało mDNS/.local)
                    </Text>
                )}
                {blad && <Text color="red">Błąd: {blad}</Text>}
                <Text> </Text>
                <Text dimColor>
                    {przetwarzanie
                        ? 'Przetwarzanie…'
                        : `[S] = ${status.dziala ? 'zatrzymaj serwer' : 'uruchom serwer'}   [Esc] = powrót`}
                </Text>
            </Box>
        </Box>
    );
}
