import net from 'node:net';

/** Szuka pierwszego wolnego portu TCP zaczynając od `start` (przeszukuje kolejne numery). */
export function znajdzWolnyPort(start: number, limit = 200): Promise<number> {
    return new Promise((resolve, reject) => {
        const probuj = (port: number, proby: number) => {
            if (proby > limit) {
                reject(new Error('Nie znaleziono wolnego portu.'));
                return;
            }
            const tester = net.createServer();
            tester.once('error', (blad: NodeJS.ErrnoException) => {
                if (blad.code === 'EADDRINUSE') {
                    probuj(port + 1, proby + 1);
                } else {
                    reject(blad);
                }
            });
            tester.once('listening', () => {
                tester.close(() => resolve(port));
            });
            tester.listen(port, '0.0.0.0');
        };
        probuj(start, 0);
    });
}
