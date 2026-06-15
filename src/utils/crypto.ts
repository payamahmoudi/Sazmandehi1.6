// ━━━━━━━━ Backup Encryption ━━━━━━━━
// Each user's data encrypted with their own key
// Master admin can decrypt ALL users' files

const MASTER_SALT = 'SamanEdu#1406!PayaMahmoudi@Secure';
const MASTER_ADMIN_ID = 'admin-master-paya';

function deriveKey(userId: string): number[] {
  const raw = MASTER_SALT + userId + MASTER_SALT;
  const key: number[] = [];
  for (let i = 0; i < 32; i++) {
    let h = 0;
    for (let j = i; j < raw.length; j += 32) {
      h = ((h << 5) - h + raw.charCodeAt(j)) & 0xffffffff;
    }
    key.push(Math.abs(h) % 256);
  }
  return key;
}

// Safe btoa for large data
function safeB64Encode(bytes: number[]): string {
  const chunkSize = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return btoa(result);
}

function safeB64Decode(b64: string): number[] {
  const binary = atob(b64);
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
  return bytes;
}

function encrypt(data: string, key: number[]): string {
  const bytes: number[] = [];
  // Random prefix (16 bytes for extra security)
  for (let i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256));
  const utf8 = new TextEncoder().encode(data);
  for (let i = 0; i < utf8.length; i++) {
    bytes.push(utf8[i] ^ key[i % key.length] ^ bytes[(bytes.length - 1) % bytes.length]);
  }
  return safeB64Encode(bytes);
}

function decrypt(b64: string, key: number[]): string | null {
  try {
    const bytes = safeB64Decode(b64);
    const decrypted: number[] = [];
    for (let i = 16; i < bytes.length; i++) {
      decrypted.push(bytes[i] ^ key[(i - 16) % key.length] ^ bytes[(i - 1) % bytes.length]);
    }
    return new TextDecoder().decode(new Uint8Array(decrypted));
  } catch { return null; }
}

// Encrypt: stores both user-key and master-key versions
export function encryptData(data: string, userId: string): string {
  const userKey = deriveKey(userId);
  const masterKey = deriveKey(MASTER_ADMIN_ID);
  const userEnc = encrypt(data, userKey);
  const masterEnc = encrypt(data, masterKey);
  return `SAMAN_ENC_V3:${userId}:${userEnc}:${masterEnc}`;
}

// Decrypt: works with user's own key OR master admin key
export function decryptData(encrypted: string, userId: string): string | null {
  try {
    // V3
    if (encrypted.startsWith('SAMAN_ENC_V3:') || encrypted.startsWith('SAMAN_ENC_V2:')) {
      const prefix = encrypted.startsWith('SAMAN_ENC_V3:') ? 'SAMAN_ENC_V3:' : 'SAMAN_ENC_V2:';
      const rest = encrypted.substring(prefix.length);
      const firstColon = rest.indexOf(':');
      const secondColon = rest.indexOf(':', firstColon + 1);
      if (firstColon < 0 || secondColon < 0) return null;

      const ownerUserId = rest.substring(0, firstColon);
      const userEnc = rest.substring(firstColon + 1, secondColon);
      const masterEnc = rest.substring(secondColon + 1);

      if (userId === ownerUserId) return decrypt(userEnc, deriveKey(userId));
      if (userId === MASTER_ADMIN_ID) return decrypt(masterEnc, deriveKey(MASTER_ADMIN_ID));
      return null;
    }
    // V1 fallback
    if (encrypted.startsWith('SAMAN_ENC_V1:')) {
      const b64 = encrypted.substring('SAMAN_ENC_V1:'.length);
      return decrypt(b64, deriveKey(userId));
    }
    return null;
  } catch { return null; }
}

export function exportEncryptedBackup(userId: string, userName?: string, userLogin?: string): void {
  try {
    // Collect all localStorage data for this user
    const allData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(userId) || key.includes('saman-edu-data') || key.includes('saman-edu-history'))) {
        allData[key] = localStorage.getItem(key) || '';
      }
    }

    if (Object.keys(allData).length === 0) {
      alert('داده‌ای برای پشتیبان‌گیری یافت نشد.');
      return;
    }

    const json = JSON.stringify(allData);
    const encrypted = encryptData(json, userId);

    const dateStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
    const ownerName = userName || userId;
    const ext = userLogin ? `.${userLogin}` : '.saman';
    const fileName = `پشتیبان_${ownerName}_${dateStr}${ext}`;

    const blob = new Blob([encrypted], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('خطا در پشتیبان‌گیری: ' + (err as Error).message);
  }
}

export function importEncryptedBackup(file: File, userId: string, _userLogin?: string): Promise<{ ok: boolean; message: string }> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const encrypted = reader.result as string;
        if (!encrypted || encrypted.length < 20) {
          resolve({ ok: false, message: 'فایل خالی یا خراب است.' });
          return;
        }
        const decrypted = decryptData(encrypted, userId);
        if (!decrypted) {
          if (userId === MASTER_ADMIN_ID) {
            resolve({ ok: false, message: 'فایل خراب شده یا معتبر نیست.' });
          } else {
            resolve({ ok: false, message: 'رمزگشایی ناموفق. این فایل متعلق به شما نیست.' });
          }
          return;
        }
        const allData = JSON.parse(decrypted);
        for (const [key, value] of Object.entries(allData)) {
          localStorage.setItem(key, value as string);
        }
        resolve({ ok: true, message: 'بازیابی با موفقیت انجام شد. صفحه بارگذاری مجدد می‌شود...' });
      } catch {
        resolve({ ok: false, message: 'فایل معتبر نیست.' });
      }
    };
    reader.onerror = () => resolve({ ok: false, message: 'خطا در خواندن فایل.' });
    reader.readAsText(file);
  });
}
