/** RSA-OAEP (SHA-256) encrypt `{ usr, pwd }` with the backend's public key. */

const pemToArrayBuffer = (pem) => {
    const b64 = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
};

const bytesToBase64 = (bytes) => {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
};

export const encryptZymmrCredentials = async (publicKeyPem, usr, pwd) => {
    if (!window.crypto?.subtle) {
        throw new Error('This browser cannot encrypt credentials. Use HTTPS or localhost.');
    }
    const key = await window.crypto.subtle.importKey(
        'spki',
        pemToArrayBuffer(publicKeyPem),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt'],
    );
    const encoded = new TextEncoder().encode(JSON.stringify({ usr, pwd }));
    const cipher = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
    return bytesToBase64(new Uint8Array(cipher));
};
