// @ts-ignore
import CryptoJS from 'crypto-js';
// @ts-ignore
import { sm2 } from 'sm-crypto';


import {BaseCryptoService,DecryptParameters,SymmetricCryptoKey} from "./base.crypto.service";
import {CryptoUtils} from "./crypto.utils";

function echoResult(unit: string, result: boolean) {
    console.log(unit + (result ? '✓' : '✗'));
}
function toArrayBuffer(value: string | ArrayBuffer): ArrayBuffer {
    if (typeof value === "string") {
        const strUtf8 = unescape(encodeURIComponent(value));
        const arr = new Uint8Array(strUtf8.length);
        for (let i = 0; i < strUtf8.length; i++) {
            arr[i] = strUtf8.charCodeAt(i);
        }
        return arr.buffer as ArrayBuffer;
    }

    return value;
}
function makeStaticByteArray(length: number) {
    const arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        arr[i] = i;
    }
    return arr;
}

export class CryptoService implements BaseCryptoService {
    pbkdf2(password: string | ArrayBuffer, salt: string | ArrayBuffer, algorithm: "sha256" | "sha512",
           iterations: number): Promise<ArrayBuffer> {
        const len = algorithm === 'sha256' ? 8 : 16;
        const hasher = algorithm === 'sha256' ? CryptoJS.algo.SHA256 : CryptoJS.algo.SHA512;
        const cryptoJSPassword = this.toCryptoJSValue(password);
        const cryptoJSSalt = this.toCryptoJSValue(salt);
        const key = CryptoJS.PBKDF2(cryptoJSPassword, cryptoJSSalt, {
            keySize: len,
            hasher: hasher,
            iterations: iterations
        });

        return Promise.resolve(this.toArrayBuffer(key.toString(CryptoJS.enc.Base64)));
    }

    async hkdf(ikm: ArrayBuffer, salt: string | ArrayBuffer, info: string | ArrayBuffer,
         outputByteSize: number, algorithm: "sha256" | "sha512"): Promise<ArrayBuffer> {
        const saltBuf = this.toArrayBuffer(salt);
        const prk = await this.hmac(ikm, saltBuf, algorithm);
        return this.hkdfExpand(prk, info, outputByteSize, algorithm);
    }

    async hkdfExpand(prk: ArrayBuffer, info: string | ArrayBuffer, outputByteSize: number,
               algorithm: "sha256" | "sha512"): Promise<ArrayBuffer> {
        const hashLen = algorithm === 'sha256' ? 32 : 64;
        if (outputByteSize > 255 * hashLen) {
            throw new Error('outputByteSize is too large.');
        }
        const prkArr = new Uint8Array(prk);
        if (prkArr.length < hashLen) {
            throw new Error('prk is too small.');
        }
        const infoBuf = this.toArrayBuffer(info);
        const infoArr = new Uint8Array(infoBuf);
        let runningOkmLength = 0;
        let previousT = new Uint8Array(0);
        const n = Math.ceil(outputByteSize / hashLen);
        const okm = new Uint8Array(n * hashLen);
        for (let i = 0; i < n; i++) {
            const t = new Uint8Array(previousT.length + infoArr.length + 1);
            t.set(previousT);
            t.set(infoArr, previousT.length);
            t.set([i + 1], t.length - 1);
            previousT = new Uint8Array(await this.hmac(t.buffer as ArrayBuffer, prk, algorithm)) as Uint8Array;
            okm.set(previousT, runningOkmLength);
            runningOkmLength += previousT.length;
            if (runningOkmLength >= outputByteSize) {
                break;
            }
        }
        return okm.slice(0, outputByteSize).buffer as ArrayBuffer;
    }

    hash(value: string | ArrayBuffer, algorithm: "sha1" | "sha256" | "sha512" | "md5"): Promise<ArrayBuffer> {
        const cryptoJSValue = this.toCryptoJSValue(value);
        let hash : CryptoJS.lib.WordArray =  CryptoJS.lib.WordArray.create();
        switch (algorithm) {
            case "sha1":
                hash = CryptoJS.SHA1(cryptoJSValue);
                break;
            case "sha256":
                hash = CryptoJS.SHA256(cryptoJSValue);
                break;
            case "sha512":
                hash = CryptoJS.SHA512(cryptoJSValue);
                break;
            case "md5":
                hash = CryptoJS.MD5(cryptoJSValue);
                break
        }

        return Promise.resolve(this.fromWordArrayToArrayBuffer(hash));
    }

    hmac(value: ArrayBuffer, key: ArrayBuffer, algorithm: "sha1" | "sha256" | "sha512"): Promise<ArrayBuffer> {
        const cryptoJSValue = this.fromArrayBufferToWordArray(value);
        const cryptoJSKey = this.fromArrayBufferToWordArray(key);

        const hmac = CryptoJS.algo.HMAC.create(
            algorithm === "sha1" ? CryptoJS.algo.SHA1 : algorithm === "sha256" ? CryptoJS.algo.SHA256 : CryptoJS.algo.SHA512,
            cryptoJSKey
        );
        hmac.update(cryptoJSValue);

        return Promise.resolve(this.fromWordArrayToArrayBuffer(hmac.finalize()));
    }

    async compare(a: ArrayBuffer, b: ArrayBuffer): Promise<boolean> {
        const key = await this.randomBytes(32);
        const mac1 = await this.hmac(a, key, 'sha256');
        const mac2 = await this.hmac(b, key, 'sha256');
        if (mac1.byteLength !== mac2.byteLength) {
            return false;
        }

        const arr1 = new Uint8Array(mac1);
        const arr2 = new Uint8Array(mac2);
        for (let i = 0; i < arr2.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }

        return true;
    }

    // @ts-ignore
    hmacFast(value: ArrayBuffer, key: ArrayBuffer, algorithm: 'sha1' | 'sha256' | 'sha512'): Promise<ArrayBuffer|string> {
        return this.hmac(value, key, algorithm);
    }

    // @ts-ignore
    compareFast(a: ArrayBuffer, b: ArrayBuffer): Promise<boolean> {
        return this.compare(a, b);
    }

    aesEncrypt(data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer): Promise<ArrayBuffer> {
        const cryptoJSData = this.toCryptoJSValue(data);
        const cryptoJSIv = this.fromArrayBufferToWordArray(iv);
        const cryptoJSKey = this.fromArrayBufferToWordArray(key);
        const cipher = CryptoJS.AES.encrypt(cryptoJSData, cryptoJSKey, {
            iv: cryptoJSIv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        return Promise.resolve(this.toArrayBuffer(cipher.toString()));
    }

    aesDecryptFastParameters(data: string, iv: string, mac: string, key: SymmetricCryptoKey):
        DecryptParameters<ArrayBuffer> {
        const p = new DecryptParameters<ArrayBuffer>();
        p.encKey = key.encKey;
        p.data = CryptoUtils.fromB64ToArray(data).buffer as ArrayBuffer;
        p.iv = CryptoUtils.fromB64ToArray(iv).buffer as ArrayBuffer;

        const macData = new Uint8Array(p.iv.byteLength + p.data.byteLength);
        macData.set(new Uint8Array(p.iv), 0);
        macData.set(new Uint8Array(p.data), p.iv.byteLength);
        p.macData = macData.buffer as ArrayBuffer;

        if (key.macKey != null) {
            p.macKey = key.macKey;
        }
        if (mac != null) {
            p.mac = CryptoUtils.fromB64ToArray(mac).buffer as ArrayBuffer;
        }

        return p;
    }

    // @ts-ignore
    async aesDecryptFast(parameters: DecryptParameters<ArrayBuffer>): Promise<string> {
        const decBuf = await this.aesDecrypt(parameters.data, parameters.iv, parameters.encKey);
        return CryptoUtils.fromBufferToUtf8(decBuf);
    }

    aesDecrypt(data: ArrayBuffer | null | undefined, iv: ArrayBuffer | null | undefined, key: ArrayBuffer | null | undefined): Promise<ArrayBuffer> {
        const cryptoJSData = this.fromArrayBufferToWordArray(data);
        const cryptoJSIv = this.fromArrayBufferToWordArray(iv);
        const cryptoJSKey = this.fromArrayBufferToWordArray(key);

        const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: cryptoJSData });

        const decBuf = CryptoJS.AES.decrypt(cipherParams, cryptoJSKey, {
            iv: cryptoJSIv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        return Promise.resolve(this.fromWordArrayToArrayBuffer(decBuf));
    }

    randomBytes(length: number): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const byteWords = CryptoJS.lib.WordArray.random(length);
            console.log('byteword', byteWords);
            resolve(this.fromWordArrayToArrayBuffer(byteWords));
        });
    }

    rsaDecrypt(data: ArrayBuffer, privateKey: ArrayBuffer, algorithm: "sha1" | "sha256"): Promise<ArrayBuffer|null> {
        return Promise.resolve(null);
    }

    rsaEncrypt(data: ArrayBuffer, publicKey: ArrayBuffer, algorithm: "sha1" | "sha256"): Promise<ArrayBuffer|null> {
        return Promise.resolve(null);
    }

    rsaExtractPublicKey(privateKey: ArrayBuffer): Promise<ArrayBuffer|null> {
        sm2.generateKeyPairHex()
        return Promise.resolve(null);
    }

    rsaGenerateKeyPair(length: 1024 | 2048 | 4096): Promise<[ArrayBuffer, ArrayBuffer]> {
        const keyPair = sm2.generateKeyPairHex();
        const publicKey = CryptoUtils.fromHexToArray(keyPair.publicKey);
        const privateKey = CryptoUtils.fromHexToArray(keyPair.privateKey);

        return Promise.resolve([publicKey.buffer as ArrayBuffer, privateKey.buffer as ArrayBuffer] as [ArrayBuffer, ArrayBuffer]);
    }

    private toCryptoJSValue(value: string | ArrayBuffer): string | CryptoJS.lib.WordArray {
        let cryptoJSValue: string | CryptoJS.lib.WordArray;
        if (typeof (value) === 'string') {
            cryptoJSValue = value;
        } else {
            cryptoJSValue = this.fromArrayBufferToWordArray(value);
        }

        return cryptoJSValue;
    }

    private toArrayBuffer(value: string | ArrayBuffer): ArrayBuffer {
        let buf: ArrayBuffer;
        if (typeof (value) === 'string') {
            const strUtf8 = unescape(encodeURIComponent(value));
            const uint8Array = new Uint8Array(strUtf8.length);
            for (let i = 0; i < strUtf8.length; i++) {
                uint8Array[i] = strUtf8.charCodeAt(i);
            }
            buf = uint8Array.buffer as ArrayBuffer;
        } else {
            buf = new Uint8Array(value).buffer as ArrayBuffer;
        }

        return buf;
    }

    private fromArrayBufferToWordArray(value: ArrayBuffer | null | undefined): CryptoJS.lib.WordArray {
        const uint8Array = new Uint8Array(value as ArrayBuffer);
        const uint8ArrayLen = uint8Array.byteLength;
        const wordLen = Math.ceil(uint8ArrayLen / 4);   // The array of 32-bit words.
        let numberArray: number[] = new Array(wordLen);
        let index = 0;
        for (; index < wordLen - 1; index++) {
            let uint8ArrayIndex = index * 4;
            numberArray[index] =    (uint8Array[uint8ArrayIndex ++].valueOf() << 24) +
                                    (uint8Array[uint8ArrayIndex ++].valueOf() << 16) +
                                    (uint8Array[uint8ArrayIndex ++].valueOf() <<  8) +
                                    (uint8Array[uint8ArrayIndex ++].valueOf() <<  0);
        }

        let uint8ArrayIndex = index * 4;
        numberArray[index] =    (uint8ArrayLen > uint8ArrayIndex ? (uint8Array[uint8ArrayIndex ++].valueOf() << 24) : 0) +
                                (uint8ArrayLen > uint8ArrayIndex ? (uint8Array[uint8ArrayIndex ++].valueOf() << 16) : 0) +
                                (uint8ArrayLen > uint8ArrayIndex ? (uint8Array[uint8ArrayIndex ++].valueOf() <<  8) : 0) +
                                (uint8ArrayLen > uint8ArrayIndex ? (uint8Array[uint8ArrayIndex ++].valueOf() <<  0) : 0);

        return CryptoJS.lib.WordArray.create(numberArray, uint8ArrayLen);
    }

    private fromWordArrayToArrayBuffer(value: CryptoJS.lib.WordArray): ArrayBuffer {
        const wordLen = value.words.length;
        let uint8ArrayIndex = 0;
        const uint8Array = new Uint8Array(value.sigBytes);
        let index = 0;
        for (; index < wordLen - 1; index++) {
            let rightShit = 3 * 8;  // The array of 32-bit words.
            const word = value.words[index];
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff; rightShit -= 8;
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff; rightShit -= 8;
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff; rightShit -= 8;
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff;
        }

        let rightShit = 3 * 8;  // The array of 32-bit words.
        const word = value.words[index];
        if (uint8ArrayIndex < uint8Array.length)
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff; rightShit -= 8;
        if (uint8ArrayIndex < uint8Array.length)
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff; rightShit -= 8;
        if (uint8ArrayIndex < uint8Array.length)
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff; rightShit -= 8;
        if (uint8ArrayIndex < uint8Array.length)
            uint8Array[uint8ArrayIndex ++] = (word >> rightShit) & 0xff;

        return uint8Array.buffer as ArrayBuffer;
    }

    static async test()
    {
        const cryptoService: CryptoService = new CryptoService();

        /* ============================================== Test PBKDF2 ============================================== */
        const regular256Key = 'pj9prw/OHPleXI6bRdmlaD+saJS4awrMiQsQiDjeu2I=';
        const utf8256Key = 'yqvoFXgMRmHR3QPYr5pyR4uVuoHkltv9aHUP63p8n7I=';
        const unicode256Key = 'ZdeOata6xoRpB4DLp8zHhXz5kLmkWtX5pd+TdRH8w8w=';

        const regular512Key = 'liTi/Ke8LPU1Qv+Vl7NGEVt/XMbsBVJ2kQxtVG/Z1/JFHFKQW3ZkI81qVlwTiCpb+cFXzs+57' +
            'eyhhx5wfKo5Cg==';
        const utf8512Key = 'df0KdvIBeCzD/kyXptwQohaqUa4e7IyFUyhFQjXCANu5T+scq55hCcE4dG4T/MhAk2exw8j7ixRN' +
            'zXANiVZpnw==';
        const unicode512Key = 'FE+AnUJaxv8jh+zUDtZz4mjjcYk0/PZDZm+SLJe3XtxtnpdqqpblX6JjuMZt/dYYNMOrb2+mD' +
            'L3FiQDTROh1lg==';

        const regularEmail = 'user@example.com';
        const utf8Email = 'üser@example.com';

        const regularPassword = 'password';
        const utf8Password = 'pǻssword';
        const unicodePassword = '😀password🙏';

        const pbkdf2Key = await cryptoService.pbkdf2(regularPassword, regularEmail, 'sha256', 5000);
        echoResult('Test PBKDF2 ', CryptoUtils.fromBufferToUtf8(pbkdf2Key) === regular256Key);


        /* ============================================== Test hkdf ============================================== */
        {
            const regular256Key = 'qBUmEYtwTwwGPuw/z6bs/qYXXYNUlocFlyAuuANI8Pw=';
            const utf8256Key = '6DfJwW1R3txgiZKkIFTvVAb7qVlG7lKcmJGJoxR2GBU=';
            const unicode256Key = 'gejGI82xthA+nKtKmIh82kjw+ttHr+ODsUoGdu5sf0A=';

            const regular512Key = 'xe5cIG6ZfwGmb1FvsOedM0XKOm21myZkjL/eDeKIqqM=';
            const utf8512Key = 'XQMVBnxVEhlvjSFDQc77j5GDE9aorvbS0vKnjhRg0LY=';
            const unicode512Key = '148GImrTbrjaGAe/iWEpclINM8Ehhko+9lB14+52lqc=';

            echoResult('Test hkdf - sha256', await testHkdf('sha256', regular256Key, utf8256Key, unicode256Key));
            echoResult('Test hkdf - sha512', await testHkdf('sha512', regular512Key, utf8512Key, unicode512Key));

            async function testHkdf(algorithm: 'sha256' | 'sha512', regularKey: string, utf8Key: string, unicodeKey: string): Promise<boolean> {
                const ikm = CryptoUtils.fromB64ToArray('criAmKtfzxanbgea5/kelQ==');

                const regularSalt:string = 'salt';
                const utf8Salt:string  = 'üser_salt';
                const unicodeSalt:string  = '😀salt🙏';

                const regularInfo:string  = 'info';
                const utf8Info:string  = 'üser_info';
                const unicodeInfo:string  = '😀info🙏';

                const key1 = await cryptoService.hkdf(ikm.buffer as ArrayBuffer, regularSalt , regularInfo , 32, algorithm);
                if (CryptoUtils.fromBufferToB64(key1) !== regularKey) return false;

                const key2 = await cryptoService.hkdf(ikm.buffer as ArrayBuffer, utf8Salt  , utf8Info , 32, algorithm);
                if (CryptoUtils.fromBufferToB64(key2) !== utf8Key) return false;

                const key3 = await cryptoService.hkdf(ikm.buffer as ArrayBuffer, unicodeSalt , unicodeInfo , 32, algorithm);
                if (CryptoUtils.fromBufferToB64(key3) !== unicodeKey) return false;

                const key4 = await cryptoService.hkdf(ikm.buffer as ArrayBuffer, CryptoUtils.fromUtf8ToArray(regularSalt).buffer as ArrayBuffer,
                    CryptoUtils.fromUtf8ToArray(regularInfo).buffer as ArrayBuffer, 32, algorithm);
                if (CryptoUtils.fromBufferToB64(key4) !== regularKey) return false;

                return true;
            }
        }

        /* ============================================== Test Hmac (fast) ============================================== */
        const Sha1Mac = '4d4c223f95dc577b665ec4ccbcb680b80a397038';
        const Sha256Mac = '6be3caa84922e12aaaaa2f16c40d44433bb081ef323db584eb616333ab4e874f';
        const Sha512Mac = '21910e341fa12106ca35758a2285374509326c9fbe0bd64e7b99c898f841dc948c58ce66d3504d8883c' +
            '5ea7817a0b7c5d4d9b00364ccd214669131fc17fe4aca';
        const value = toArrayBuffer('SignMe!!');
        const key = toArrayBuffer('secretkey');
        const computedMacSha1 = await cryptoService.hmac(value, key, 'sha1');
        const computedMacSha256 = await cryptoService.hmac(value, key, 'sha256');
        const computedMacSha512 = await cryptoService.hmac(value, key, 'sha512');
        echoResult('Test hmac - sha1 ', CryptoUtils.fromBufferToHex(computedMacSha1) === Sha1Mac);
        echoResult('Test hmac - sha256', CryptoUtils.fromBufferToHex(computedMacSha256) === Sha256Mac);
        echoResult('Test hmac - sha512', CryptoUtils.fromBufferToHex(computedMacSha512) === Sha512Mac);

        const computedMacSha1Fast = await cryptoService.hmacFast(value, key, 'sha1');
        const computedMacSha256Fast = await cryptoService.hmacFast(value, key, 'sha256');
        const computedMacSha512Fast = await cryptoService.hmacFast(value, key, 'sha512');
        echoResult('Test hmac - sha1   - fast', CryptoUtils.fromBufferToHex(computedMacSha1Fast as ArrayBuffer) === Sha1Mac);
        echoResult('Test hmac - sha256 - fast', CryptoUtils.fromBufferToHex(computedMacSha256Fast as ArrayBuffer) === Sha256Mac);
        echoResult('Test hmac - sha512 - fast', CryptoUtils.fromBufferToHex(computedMacSha512Fast as ArrayBuffer) === Sha512Mac);

        /* ============================================== Test hkdfExpand ============================================== */
        const prk16Byte = 'criAmKtfzxanbgea5/kelQ==';
        const prk32Byte = 'F5h4KdYQnIVH4rKH0P9CZb1GrR4n16/sJrS0PsQEn0Y=';
        const prk64Byte = 'ssBK0mRG17VHdtsgt8yo4v25CRNpauH+0r2fwY/E9rLyaFBAOMbIeTry+' +
            'gUJ28p8y+hFh3EI9pcrEWaNvFYonQ==';

        const okm32BSha256 = 'BnIqJlfnHm0e/2iB/15cbHyR19ARPIcWRp4oNS22CD8=';

        const info = 'info';
        const okm = await cryptoService.hkdfExpand(CryptoUtils.fromB64ToArray(prk32Byte).buffer as ArrayBuffer, info, 32, "sha256");
        echoResult('Test hkdfExpand - 32 bytes - sha256', CryptoUtils.fromBufferToB64(okm) === okm32BSha256);


        {
            /* ============================================== Test hash ============================================== */
            const regular1Hash = '2a241604fb921fad12bf877282457268e1dccb70';
            const utf81Hash = '85672798dc5831e96d6c48655d3d39365a9c88b6';
            const unicode1Hash = '39c975935054a3efc805a9709b60763a823a6ad4';

            const regular256Hash = '2b8e96031d352a8655d733d7a930b5ffbea69dc25cf65c7bca7dd946278908b2';
            const utf8256Hash = '25fe8440f5b01ed113b0a0e38e721b126d2f3f77a67518c4a04fcde4e33eeb9d';
            const unicode256Hash = 'adc1c0c2afd6e92cefdf703f9b6eb2c38e0d6d1a040c83f8505c561fea58852e';

            const regular512Hash = 'c15cf11d43bde333647e3f559ec4193bb2edeaa0e8b902772f514cdf3f785a3f49a6e02a4b87b3' +
                'b47523271ad45b7e0aebb5cdcc1bc54815d256eb5dcb80da9d';
            const utf8512Hash = '035c31a877a291af09ed2d3a1a293e69c3e079ea2cecc00211f35e6bce10474ca3ad6e30b59e26118' +
                '37463f20969c5bc95282965a051a88f8cdf2e166549fcdd';
            const unicode512Hash = '2b16a5561af8ad6fe414cc103fc8036492e1fc6d9aabe1b655497054f760fe0e34c5d100ac773d' +
                '9f3030438284f22dbfa20cb2e9b019f2c98dfe38ce1ef41bae';

            const regularMd5 = '5eceffa53a5fd58c44134211e2c5f522';
            const utf8Md5 = '3abc9433c09551b939c80aa0aa3174e1';
            const unicodeMd5 = '85ae134072c8d81257933f7045ba17ca';

            echoResult('Test Hash - sha1', await testHash( 'sha1', regular1Hash, utf81Hash, unicode1Hash));
            echoResult('Test Hash - sha256', await testHash('sha256', regular256Hash, utf8256Hash, unicode256Hash));
            echoResult('Test Hash - sha512', await testHash('sha512', regular512Hash, utf8512Hash, unicode512Hash));
            echoResult('Test Hash - md5', await testHash('md5', regularMd5, utf8Md5, unicodeMd5));

            async function testHash(algorithm: 'sha1' | 'sha256' | 'sha512' | 'md5', regularHash: string,
                                    utf8Hash: string, unicodeHash: string): Promise<boolean> {
                const regularValue = 'HashMe!!';
                const utf8Value = 'HǻshMe!!';
                const unicodeValue = '😀HashMe!!!🙏';

                const hash1 = await cryptoService.hash(regularValue, algorithm);
                if (CryptoUtils.fromBufferToHex(hash1) !== regularHash) return false;

                const hash2 = await cryptoService.hash(utf8Value, algorithm);
                if (CryptoUtils.fromBufferToHex(hash2) !== utf8Hash) return false;

                const hash3 = await cryptoService.hash(unicodeValue, algorithm);
                if (CryptoUtils.fromBufferToHex(hash3) !== unicodeHash) return false;


                const hash4 = await cryptoService.hash(CryptoUtils.fromUtf8ToArray(regularValue).buffer as ArrayBuffer , algorithm);
                if (CryptoUtils.fromBufferToHex(hash4) !== regularHash) return false;

                return true;
            }

        }
        /* ============================================== Test compare (fast) ============================================== */
        {
            echoResult('Test compare', await testCompare(false));
            echoResult('Test compare - fast', await testCompare(true));
            async function testCompare(fast = false): Promise<boolean> {
                const a1 = new Uint8Array(2);
                a1[0] = 1;
                a1[1] = 2;
                const equal1 = fast ? await cryptoService.compareFast(a1.buffer as ArrayBuffer, a1.buffer as ArrayBuffer) :
                    await cryptoService.compare(a1.buffer as ArrayBuffer, a1.buffer as ArrayBuffer);

                const a2 = new Uint8Array(2);
                a2[0] = 1;
                a2[1] = 2;
                const b2 = new Uint8Array(2);
                b2[0] = 3;
                b2[1] = 4;
                const equal2 = fast ? await cryptoService.compareFast(a2.buffer as ArrayBuffer, b2.buffer as ArrayBuffer) :
                    await cryptoService.compare(a2.buffer as ArrayBuffer, b2.buffer as ArrayBuffer);

                const a3 = new Uint8Array(2);
                a3[0] = 1;
                a3[1] = 2;
                const b3 = new Uint8Array(2);
                b3[0] = 3;
                const equal3 = fast ? await cryptoService.compareFast(a3.buffer as ArrayBuffer, b3.buffer as ArrayBuffer) :
                    await cryptoService.compare(a3.buffer as ArrayBuffer, b3.buffer as ArrayBuffer);

                return equal1 && !equal2 && !equal3;
            }


            /* ============================================== Test AES Encrypt ============================================== */
            {
                const cipher = await cryptoService.aesEncrypt(
                    toArrayBuffer('EncryptMe!'),
                    makeStaticByteArray(16).buffer as ArrayBuffer,
                    makeStaticByteArray(32).buffer as ArrayBuffer
                );
                echoResult('Test aesEncrypt ', CryptoUtils.fromBufferToUtf8(cipher) === 'ByUF8vhyX4ddU9gcooznwA==');
            }

            /* ============================================== Test AES Decrypt (fast) ============================================== */
            {
                const iv = makeStaticByteArray(16);
                const key = makeStaticByteArray(32);
                const data = CryptoUtils.fromB64ToArray('ByUF8vhyX4ddU9gcooznwA==');
                const decValue = await cryptoService.aesDecrypt(data.buffer as ArrayBuffer, iv.buffer as ArrayBuffer , key.buffer as ArrayBuffer);
                echoResult('Test aesDecrypt', CryptoUtils.fromBufferToUtf8(decValue) === 'EncryptMe!');
            }
            {
                const iv = CryptoUtils.fromBufferToB64(makeStaticByteArray(16).buffer as ArrayBuffer);
                const symKey = new SymmetricCryptoKey(makeStaticByteArray(32).buffer as ArrayBuffer);
                const data = 'ByUF8vhyX4ddU9gcooznwA==';
                // @ts-ignore
                const params = cryptoService.aesDecryptFastParameters(data, iv, null, symKey);
                const decValue = await cryptoService.aesDecryptFast(params);
                echoResult('Test aesDecrypt - fast', decValue === 'EncryptMe!');
            }

            /* ============================================== Test randomBytes ============================================== */
            {
                const randomData1 = await cryptoService.randomBytes(16);
                const rLength = randomData1.byteLength == 16;

                const randomData2 = await cryptoService.randomBytes(16);
                const randomData3 = await cryptoService.randomBytes(16);
                const rRandom = randomData2.byteLength === randomData3.byteLength && randomData2 !== randomData3;
                echoResult('Test randomBytes', rLength && rRandom);
            }

            /* ============================================== Test rsaGenerateKeyPair ============================================== */
            // {
            //     const keyPair = await cryptoFunctionService.rsaGenerateKeyPair(1024);
            //
            //     expect(keyPair[0] == null || keyPair[1] == null).toBe(false);
            //     const publicKey = await cryptoFunctionService.rsaExtractPublicKey(keyPair[1]);
            //     expect(Utils.fromBufferToB64(keyPair[0])).toBe(Utils.fromBufferToB64(publicKey));
            // }

        }






    }
}
