import {CryptoUtils} from "./crypto.utils";

export enum EncryptionType {
    AesCbc256_B64 = 0,
    AesCbc128_HmacSha256_B64 = 1,
    AesCbc256_HmacSha256_B64 = 2,
    Rsa2048_OaepSha256_B64 = 3,
    Rsa2048_OaepSha1_B64 = 4,
    Rsa2048_OaepSha256_HmacSha256_B64 = 5,
    Rsa2048_OaepSha1_HmacSha256_B64 = 6,
}


export class SymmetricCryptoKey {
    key: ArrayBuffer|null;
    encKey?: ArrayBuffer|null;
    macKey?: ArrayBuffer|null;
    encType: EncryptionType|null;

    keyB64: string|null = null;
    encKeyB64: string|null = null;
    macKeyB64: string|null = null;

    meta: any;

    constructor(key: ArrayBuffer, encType?: EncryptionType) {
        if (key == null) {
            throw new Error('Must provide key');
        }

        if (encType == null) {
            if (key.byteLength === 32) {
                encType = EncryptionType.AesCbc256_B64;
            } else if (key.byteLength === 64) {
                encType = EncryptionType.AesCbc256_HmacSha256_B64;
            } else {
                throw new Error('Unable to determine encType.');
            }
        }

        this.key = key;
        this.encType = encType;

        if (encType === EncryptionType.AesCbc256_B64 && key.byteLength === 32) {
            this.encKey = key;
            this.macKey = null;
        } else if (encType === EncryptionType.AesCbc128_HmacSha256_B64 && key.byteLength === 32) {
            this.encKey = key.slice(0, 16);
            this.macKey = key.slice(16, 32);
        } else if (encType === EncryptionType.AesCbc256_HmacSha256_B64 && key.byteLength === 64) {
            this.encKey = key.slice(0, 32);
            this.macKey = key.slice(32, 64);
        } else {
            throw new Error('Unsupported encType/key length.');
        }

        if (this.key != null) {
            this.keyB64 = CryptoUtils.fromBufferToB64(this.key);
        }
        if (this.encKey != null) {
            this.encKeyB64 = CryptoUtils.fromBufferToB64(this.encKey);
        }
        if (this.macKey != null) {
            this.macKeyB64 = CryptoUtils.fromBufferToB64(this.macKey);
        }
    }
}

export class DecryptParameters<T> {
    encKey?: T |null;
    data?: T |null;
    iv?: T |null;
    macKey?: T|null;
    mac?: T|null;
    macData?: T|null;
}


export abstract class BaseCryptoService {
    abstract pbkdf2: (password: string | ArrayBuffer, salt: string | ArrayBuffer, algorithm: 'sha256' | 'sha512',
        iterations: number) => Promise<ArrayBuffer>;
    abstract hkdf: (ikm: ArrayBuffer, salt: string | ArrayBuffer, info: string | ArrayBuffer,
        outputByteSize: number, algorithm: 'sha256' | 'sha512') => Promise<ArrayBuffer>;
    abstract hkdfExpand: (prk: ArrayBuffer, info: string | ArrayBuffer, outputByteSize: number,
        algorithm: 'sha256' | 'sha512') => Promise<ArrayBuffer>;
    abstract hash: (value: string | ArrayBuffer, algorithm: 'sha1' | 'sha256' | 'sha512' | 'md5') => Promise<ArrayBuffer>;
    abstract hmac: (value: ArrayBuffer, key: ArrayBuffer, algorithm: 'sha1' | 'sha256' | 'sha512') => Promise<ArrayBuffer>;
    abstract compare: (a: ArrayBuffer, b: ArrayBuffer) => Promise<boolean>;
    abstract hmacFast: (value: ArrayBuffer | string, key: ArrayBuffer | string, algorithm: 'sha1' | 'sha256' | 'sha512') =>
        Promise<ArrayBuffer | string>;
    abstract compareFast: (a: ArrayBuffer | string, b: ArrayBuffer | string) => Promise<boolean>;
    abstract aesEncrypt: (data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer) => Promise<ArrayBuffer>;
    abstract aesDecryptFastParameters: (data: string, iv: string, mac: string, key: SymmetricCryptoKey) =>
        DecryptParameters<ArrayBuffer | string>;
    abstract aesDecryptFast: (parameters: DecryptParameters<ArrayBuffer | string>) => Promise<string>;
    abstract aesDecrypt: (data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer) => Promise<ArrayBuffer>;
    abstract rsaEncrypt: (data: ArrayBuffer, publicKey: ArrayBuffer, algorithm: 'sha1' | 'sha256') => Promise<ArrayBuffer|null>;
    abstract rsaDecrypt: (data: ArrayBuffer, privateKey: ArrayBuffer, algorithm: 'sha1' | 'sha256') => Promise<ArrayBuffer|null>;
    abstract rsaExtractPublicKey: (privateKey: ArrayBuffer) => Promise<ArrayBuffer|null>;
    abstract rsaGenerateKeyPair: (length: 1024 | 2048 | 4096) => Promise<[ArrayBuffer, ArrayBuffer]>;
    abstract randomBytes: (length: number) => Promise<ArrayBuffer>;
}
