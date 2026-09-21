import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import type { ZalogowanyKontekst } from '../dane/typy.js';
import Panel_Publikacji from './Panel_Publikacji.js';
import Panel_Uzytkownikow from './Panel_Uzytkownikow.js';
import Panel_Stron from './Panel_Stron.js';

type Widok = 'menu' | 'publikacja' | 'uzytkownicy' | 'strony';

export default function Panel_Konwentu({
    kontekst,
    onWyloguj,
}: {
    kontekst: ZalogowanyKontekst;
    onWyloguj: () => void;
}) {
    const [widok, setWidok] = useState<Widok>('menu');
    const onBack = () => setWidok('menu');

    if (widok === 'publikacja') return <Panel_Publikacji kontekst={kontekst} onBack={onBack} />;
    if (widok === 'uzytkownicy') return <Panel_Uzytkownikow kontekst={kontekst} onBack={onBack} />;
    if (widok === 'strony') return <Panel_Stron kontekst={kontekst} onBack={onBack} />;

    return <Menu_Konwentu kontekst={kontekst} onWybierz={setWidok} onWyloguj={onWyloguj} />;
}

function Menu_Konwentu({
    kontekst,
    onWybierz,
    onWyloguj,
}: {
    kontekst: ZalogowanyKontekst;
    onWybierz: (widok: Widok) => void;
    onWyloguj: () => void;
}) {
    const [zaznaczony, setZaznaczony] = useState(0);

    const items: { label: string; cel: Widok | 'wyloguj' }[] = [
        { label: 'Publikacja (uruchom / zatrzymaj serwer WWW)', cel: 'publikacja' },
        { label: 'Użytkownicy (konta paneli: admin/program/kadry/magazyn/sklepik)', cel: 'uzytkownicy' },
        { label: 'Wgraj własne strony', cel: 'strony' },
        { label: 'Wyloguj / powrót do menu głównego', cel: 'wyloguj' },
    ];

    useInput((input, key) => {
        if (key.upArrow) setZaznaczony((i) => Math.max(0, i - 1));
        if (key.downArrow) setZaznaczony((i) => Math.min(items.length - 1, i + 1));
        if (key.return) {
            const wybor = items[zaznaczony];
            if (wybor.cel === 'wyloguj') onWyloguj();
            else onWybierz(wybor.cel);
        }
    });

    return (
        <Box flexDirection="column" width={'100%'}>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} justifyContent="center">
                <Gradient name="morning">
                    <BigText text={kontekst.nazwa.slice(0, 14)} />
                </Gradient>
            </Box>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} paddingX={1}>
                <Text dimColor>
                    Zalogowano jako: {kontekst.login} · rola: {kontekst.rola}
                    {kontekst.dzial ? ` · dział: ${kontekst.dzial}` : ''}
                </Text>
            </Box>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} justifyContent="center" flexDirection="column">
                {items.map((item, i) => (
                    <Box key={item.cel} justifyContent="center" flexDirection="row">
                        <Text color={i === zaznaczony ? 'green' : undefined}>
                            {i === zaznaczony ? '-> ' : '   '}
                            {item.label}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
