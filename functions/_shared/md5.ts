// Minimal dependency-free MD5, needed only because the OK.ru REST API still
// requires MD5 request signatures and the Web Crypto API does not implement MD5.
// Not used for anything security-sensitive — OK treats it as a request checksum.

const rotateLeft = (value: number, shift: number) => (value << shift) | (value >>> (32 - shift));

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const md5Hex = (input: string): string => {
  const messageBytes = new TextEncoder().encode(input);
  const originalLengthBits = messageBytes.length * 8;

  const paddingLength = ((messageBytes.length + 8) >> 6 << 6) + 64 - messageBytes.length;
  const padded = new Uint8Array(messageBytes.length + paddingLength);
  padded.set(messageBytes);
  padded[messageBytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, originalLengthBits >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(originalLengthBits / 0x100000000), true);

  const K = new Int32Array([
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983,
    1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329,
    -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734,
    -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640,
    681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799,
    1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551,
  ]);
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

  let a0 = 0x67452301, b0 = -0x10325477, c0 = -0x67452302, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    const M = new Int32Array(16);
    for (let index = 0; index < 16; index += 1) M[index] = view.getInt32(chunkStart + index * 4, true);

    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let index = 0; index < 64; index += 1) {
      let f: number; let g: number;
      if (index < 16) { f = (b & c) | (~b & d); g = index; } else if (index < 32) {
        f = (d & b) | (~d & c); g = (5 * index + 1) % 16;
      } else if (index < 48) { f = b ^ c ^ d; g = (3 * index + 5) % 16; } else { f = c ^ (b | ~d); g = (7 * index) % 16; }
      const temp = d;
      d = c; c = b;
      b = (b + rotateLeft((a + f + K[index] + M[g]) | 0, S[index])) | 0;
      a = temp;
    }
    a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
  }

  const output = new Uint8Array(16);
  const outView = new DataView(output.buffer);
  outView.setInt32(0, a0, true); outView.setInt32(4, b0, true);
  outView.setInt32(8, c0, true); outView.setInt32(12, d0, true);
  return toHex(output);
};
