import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashujHaslo(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function sprawdzHaslo(plain: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(plain, hash);
    } catch {
        return false;
    }
}
