import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-rules-test',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', 'adminUid'), { uid: 'adminUid', role: 'admin', status: 'approved' });
  await setDoc(doc(db, 'users', 'aliceUid'), { uid: 'aliceUid', role: 'member', status: 'approved' });
  await setDoc(doc(db, 'users', 'bobUid'), { uid: 'bobUid', role: 'member', status: 'approved' });
  await setDoc(doc(db, 'saved_qrs', 'qr1'), { createdByUid: 'aliceUid', name: 'x' });
});

const anon = env.unauthenticatedContext().firestore();
const alice = env.authenticatedContext('aliceUid').firestore();
const bob = env.authenticatedContext('bobUid').firestore();
const admin = env.authenticatedContext('adminUid').firestore();

let passed = 0;
const check = async (name, fn) => {
  await fn();
  passed++;
  console.log('PASS', name);
};

await check('anon bị chặn đọc saved_qrs', () => assertFails(getDoc(doc(anon, 'saved_qrs', 'qr1'))));
await check('anon bị chặn ghi saved_qrs', () => assertFails(setDoc(doc(anon, 'saved_qrs', 'qr2'), { a: 1 })));
await check('anon bị chặn đọc users', () => assertFails(getDocs(collection(anon, 'users'))));
await check('member đọc được saved_qrs của team', () => assertSucceeds(getDoc(doc(bob, 'saved_qrs', 'qr1'))));
await check('member ghi được saved_qrs', () => assertSucceeds(setDoc(doc(bob, 'saved_qrs', 'qr2'), { a: 1 })));
await check('user đọc hồ sơ chính mình', () => assertSucceeds(getDoc(doc(alice, 'users', 'aliceUid'))));
await check('user không đọc hồ sơ người khác', () => assertFails(getDoc(doc(alice, 'users', 'bobUid'))));
await check('user không sửa hồ sơ người khác', () => assertFails(updateDoc(doc(alice, 'users', 'bobUid'), { role: 'admin' })));
await check('user không tự nâng role', () => assertFails(setDoc(doc(alice, 'users', 'aliceUid'), { role: 'admin' })));
await check('user sửa hồ sơ chính mình', () => assertSucceeds(updateDoc(doc(alice, 'users', 'aliceUid'), { username: 'alice2' })));
await check('admin đọc được danh sách users', () => assertSucceeds(getDocs(collection(admin, 'users'))));
await check('member không đọc được danh sách users', () => assertFails(getDocs(collection(bob, 'users'))));

await env.cleanup();
console.log(`\n${passed} kiểm tra đạt`);
