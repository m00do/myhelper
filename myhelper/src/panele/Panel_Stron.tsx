import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import { Form, FormProps } from 'ink-form';
import type { ZalogowanyKontekst } from '../dane/typy.js';
import { ROLE_STRON } from '../dane/sciezki.js';
import { wgrajStrone, czyStronaWlasna, przywrocDomyslnaStrone, type RolaStrony } from '../dane/strony.js';

const ETYKIETY_ROL: Record<RolaStrony, string> = {
    login: 'Strona logowania (/)',
    admin: 'Panel administratora',
    kadry: 'Panel kadr',
    program: 'Panel programu',
    magazyn: 'Panel magazynowy',
    sklepik: 'Panel sklepikowy',
};

type Widok = 'lista' | 'wgraj';

export default function Panel_Stron({ kontekst, onBack }: { kontekst: ZalogowanyKontekst; onBack: () => void }) {
    const [widok, setWidok] = useState<Widok>('lista');
    const [zaznaczony, setZaznaczony] = useState(0);
    const [wlasne, setWlasne] = useState<Record<string, boolean>>({});
    const [ladowanie, setLadowanie] = useState(true);
    const [info, setInfo] = useState<string | null>(null);

    async function odswiez() {
        setLadowanie(true);
        const wpisy = await Promise.all(ROLE_STRON.map(async (rola) => [rola, await czyStronaWlasna(kontekst.slug, rola)] as const));
        setWlasne(Object.fromEntries(wpisy));
        setLadowanie(false);
    }

    useEffect(() => {
        void odswiez();
    }, []);

    useInput((input, key) => {
        if (widok !== 'lista') return;
        if (key.escape) {
            onBack();
            return;
        }
        if (key.upArrow) setZaznaczony((i) => Math.max(0, i - 1));
        if (key.downArrow) setZaznaczony((i) => Math.min(ROLE_STRON.length - 1, i + 1));
        if (input === 'w' || input === 'W') {
            setInfo(null);
            setWidok('wgraj');
        }
        if ((input === 'r' || input === 'R') && wlasne[ROLE_STRON[zaznaczony]]) {
            const rola = ROLE_STRON[zaznaczony];
            void (async () => {
                await przywrocDomyslnaStrone(kontekst.slug, rola);
                setInfo(`Przywrócono domyślną stronę dla: ${ETYKIETY_ROL[rola]}`);
                await odswiez();
            })();
        }
    });

    if (widok === 'wgraj') {
        return (
            <Formularz_Wgraj_Strone
                kontekst={kontekst}
                rolaDomyslna={ROLE_STRON[zaznaczony]}
                onAnuluj={() => setWidok('lista')}
                onWgrano={async (wiadomosc) => {
                    setInfo(wiadomosc);
                    setWidok('lista');
                    await odswiez();
                }}
            />
        );
    }

    return (
        <Box flexDirection="column" width={'100%'}>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} flexDirection="column" padding={1}>
                <Text bold>Własne strony: {kontekst.nazwa}</Text>
                <Text dimColor>Wskaż lokalny plik .html albo folder ze stroną (html/css/js) — zastąpi domyślny szablon danego panelu.</Text>
                <Text> </Text>
                {ladowanie && <Text dimColor>Wczytywanie…</Text>}
                {!ladowanie &&
                    ROLE_STRON.map((rola, i) => (
                        <Text key={rola} color={i === zaznaczony ? 'green' : undefined}>
                            {i === zaznaczony ? '-> ' : '   '}
                            {ETYKIETY_ROL[rola].padEnd(28, ' ')}
                            {wlasne[rola] ? '[własna strona]' : '[domyślny szablon]'}
                        </Text>
                    ))}
                {info && <Text color="yellow">{info}</Text>}
                <Text> </Text>
                <Text dimColor>[W] = wgraj nową dla zaznaczonej   [R] = przywróć domyślną   [Esc] = powrót</Text>
            </Box>
        </Box>
    );
}

function Formularz_Wgraj_Strone({
    kontekst,
    rolaDomyslna,
    onAnuluj,
    onWgrano,
}: {
    kontekst: ZalogowanyKontekst;
    rolaDomyslna: RolaStrony;
    onAnuluj: () => void;
    onWgrano: (wiadomosc: string) => void;
}) {
    const [blad, setBlad] = useState<string | null>(null);

    useInput((input, key) => {
        if (key.escape) onAnuluj();
    });

    const form: FormProps['form'] = {
        title: 'Wgraj własną stronę',
        sections: [
            {
                title: 'Plik / folder',
                fields: [
                    {
                        type: 'select',
                        name: 'rola',
                        label: 'Panel do podmiany',
                        options: ROLE_STRON.map((r) => ({ label: ETYKIETY_ROL[r], value: r })),
                        initialValue: rolaDomyslna,
                        required: true,
                    },
                    {
                        type: 'string',
                        name: 'sciezka',
                        label: 'Ścieżka lokalna (np. /home/user/moja-strona lub ./index.html)',
                        required: true,
                    },
                ],
            },
        ],
    };

    const handleSubmit = async (value: object) => {
        const { rola, sciezka } = value as { rola: RolaStrony; sciezka: string };
        setBlad(null);

        const wynik = await wgrajStrone(kontekst.slug, rola, sciezka);
        if (!wynik.ok) {
            setBlad(wynik.blad);
            return;
        }

        onWgrano(`Wgrano nową stronę dla: ${ETYKIETY_ROL[rola]}`);
    };

    return (
        <Box flexDirection="column" width={'100%'}>
            {blad && <Text color="red">{blad}</Text>}
            <Form form={form} onSubmit={handleSubmit}></Form>
            <Text dimColor>(Esc = anuluj)</Text>
        </Box>
    );
}
