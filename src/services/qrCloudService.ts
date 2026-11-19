import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SavedQR, QROptions, QRType, AttachedDocument } from '../types';

const COLLECTION_NAME = 'saved_qrs';

const DEFAULT_OPTIONS: QROptions = {
  darkColor: '#000000',
  lightColor: '#ffffff',
  transparentBg: false,
  errorCorrectionLevel: 'M',
  size: 512,
  margin: 2,
  logoScale: 0.2,
  logoShape: 'circle',
};

// Quota limit tracking & event emitter
export let isFirestoreQuotaExceeded = false;
type QuotaListener = (exceeded: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();

export const onFirestoreQuotaStatusChange = (cb: QuotaListener): (() => void) => {
  quotaListeners.add(cb);
  cb(isFirestoreQuotaExceeded);
  return () => {
    quotaListeners.delete(cb);
  };
};

const notifyQuotaStatus = (exceeded: boolean) => {
  if (isFirestoreQuotaExceeded !== exceeded) {
    isFirestoreQuotaExceeded = exceeded;
    quotaListeners.forEach((cb) => cb(exceeded));
  }
};

const isQuotaError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('quota') ||
    msg.includes('daily read units') ||
    msg.includes('free tier') ||
    msg.includes('exceeded')
  );
};

// Sanitize attached documents to ensure lightweight URLs in Firestore
const sanitizeAttachedDocuments = (docs?: AttachedDocument[]): AttachedDocument[] => {
  if (!docs || !Array.isArray(docs)) return [];
  return docs.slice(0, 10).map((d) => ({
    id: d.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: d.name || 'Tài liệu đính kèm',
    size: typeof d.size === 'number' ? d.size : 0,
    type: d.type || 'application/pdf',
    url: d.url || '',
    uploadedAt: d.uploadedAt || Date.now(),
  }));
};

// Clean and optimize attached images to prevent exceeding Firestore's 1MB document limit
const MAX_TOTAL_IMAGE_CHARS = 700000; // ~525KB, well below Firestore 1MB limit

const sanitizeAttachedImages = (images?: string[]): string[] => {
  if (!images || !Array.isArray(images)) return [];
  const valid = images
    .slice(0, 5)
    .filter((img) => typeof img === 'string' && img.startsWith('data:image/'));

  if (valid.length === 0) return [];

  let totalChars = valid.reduce((sum, img) => sum + img.length, 0);
  if (totalChars <= MAX_TOTAL_IMAGE_CHARS) {
    return valid;
  }

  const budgetList: string[] = [];
  let currentTotal = 0;
  for (const img of valid) {
    if (currentTotal + img.length <= MAX_TOTAL_IMAGE_CHARS) {
      budgetList.push(img);
      currentTotal += img.length;
    }
  }

  return budgetList.length > 0 ? budgetList : [valid[0].slice(0, 400000)];
};

// Helper to safely parse any Firestore timestamp/date into a millisecond timestamp
const toNumericTimestamp = (val: any): number => {
  if (!val) return Date.now();
  if (typeof val === 'number') return isNaN(val) ? Date.now() : val;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? Date.now() : parsed;
  }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val.seconds === 'number') return val.seconds * 1000;
  }
  return Date.now();
};

/**
 * Server-Side Cloud Sync APIs (Fallback when Firestore Quota is exceeded or offline)
 */
const fetchFromServerCloud = async (): Promise<SavedQR[]> => {
  try {
    const res = await fetch('/api/cloud-qrs');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items)) {
        return data.items.map((item: any) => ({
          ...item,
          options: { ...DEFAULT_OPTIONS, ...(item.options || {}) },
          createdAt: toNumericTimestamp(item.createdAt),
        }));
      }
    }
  } catch (e) {
    console.warn('Fetch from server cloud failed:', e);
  }
  return [];
};

const saveToServerCloud = async (item: any): Promise<void> => {
  try {
    await fetch('/api/cloud-qrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (e) {
    console.warn('Save to server cloud error:', e);
  }
};

const deleteFromServerCloud = async (id: string): Promise<void> => {
  try {
    await fetch(`/api/cloud-qrs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Delete from server cloud error:', e);
  }
};

// Subscribe to real-time changes in Cloud (Firestore with auto fallback to Server Cloud Polling)
export const subscribeToSavedQRs = (
  onUpdate: (items: SavedQR[]) => void,
  onError?: (err: Error) => void
) => {
  let isCancelled = false;
  let pollingTimer: NodeJS.Timeout | null = null;

  // Function to poll server-side cloud
  const startServerPolling = () => {
    if (pollingTimer) return;
    const poll = async () => {
      if (isCancelled) return;
      const items = await fetchFromServerCloud();
      if (!isCancelled && items.length > 0) {
        onUpdate(items);
      }
    };
    poll();
    pollingTimer = setInterval(poll, 6000);
  };

  // Limit Firestore query to recent 60 documents to conserve daily quota read units
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(60));

  let unsubscribeFirestore = () => {};

  try {
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        notifyQuotaStatus(false);
        const items: SavedQR[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const mergedOptions: QROptions = {
            ...DEFAULT_OPTIONS,
            ...(data.options || {}),
          };
          return {
            id: docSnap.id,
            title: data.title || 'Mã QR đã lưu',
            rawString: data.rawString || '',
            type: (data.type as QRType) || 'url',
            options: mergedOptions,
            createdAt: toNumericTimestamp(data.createdAt),
            createdByUid: data.createdByUid || undefined,
            creatorName: data.creatorName || undefined,
            isPublic: data.isPublic ?? false,
            marketValue: data.marketValue || undefined,
            attachedImages: Array.isArray(data.attachedImages) ? data.attachedImages : undefined,
            attachedDocuments: Array.isArray(data.attachedDocuments) ? data.attachedDocuments : undefined,
            coordinates: data.coordinates || undefined,
            actionType: data.actionType || (data.lastExportedAt ? 'export_pdf' : 'save'),
            lastExportedAt: data.lastExportedAt ? toNumericTimestamp(data.lastExportedAt) : undefined,
            reportCode: data.reportCode || undefined,
          };
        });
        onUpdate(items);

        // Also sync copy to server cloud quietly in the background
        if (items.length > 0) {
          fetch('/api/cloud-qrs/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          }).catch(() => {});
        }
      },
      (err) => {
        console.warn('Firestore snapshot listener warning/error:', err);
        if (isQuotaError(err)) {
          notifyQuotaStatus(true);
        }
        if (onError) onError(err);
        // Start server cloud polling as seamless fallback
        startServerPolling();
      }
    );
  } catch (err: any) {
    console.warn('Firestore snapshot attach failed:', err);
    if (isQuotaError(err)) {
      notifyQuotaStatus(true);
    }
    startServerPolling();
  }

  return () => {
    isCancelled = true;
    if (pollingTimer) clearInterval(pollingTimer);
    try {
      unsubscribeFirestore();
    } catch {}
  };
};

// Fetch all QRs directly once from Cloud (Firestore with server cloud fallback)
export const fetchAllQRsFromCloud = async (): Promise<SavedQR[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    notifyQuotaStatus(false);
    const items: SavedQR[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const mergedOptions: QROptions = {
        ...DEFAULT_OPTIONS,
        ...(data.options || {}),
      };
      return {
        id: docSnap.id,
        title: data.title || 'Mã QR đã lưu',
        rawString: data.rawString || '',
        type: (data.type as QRType) || 'url',
        options: mergedOptions,
        createdAt: toNumericTimestamp(data.createdAt),
        createdByUid: data.createdByUid || undefined,
        creatorName: data.creatorName || undefined,
        isPublic: data.isPublic ?? false,
        marketValue: data.marketValue || undefined,
        attachedImages: Array.isArray(data.attachedImages) ? data.attachedImages : undefined,
        attachedDocuments: Array.isArray(data.attachedDocuments) ? data.attachedDocuments : undefined,
        coordinates: data.coordinates || undefined,
        actionType: data.actionType || (data.lastExportedAt ? 'export_pdf' : 'save'),
        lastExportedAt: data.lastExportedAt ? toNumericTimestamp(data.lastExportedAt) : undefined,
        reportCode: data.reportCode || undefined,
      };
    });

    if (items.length > 0) {
      // Background backup to server cloud
      fetch('/api/cloud-qrs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).catch(() => {});
      return items;
    }
  } catch (err: any) {
    console.warn('Firestore fetchAllQRsFromCloud failed, switching to Server Cloud:', err);
    if (isQuotaError(err)) {
      notifyQuotaStatus(true);
    }
  }

  // Fallback to Server Cloud
  return fetchFromServerCloud();
};

// Add or save new QR to Cloud (Firestore + Server Cloud dual save)
export const saveQRToCloud = async (item: Omit<SavedQR, 'id'> & { id?: string }): Promise<string> => {
  const docId = item.id || Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
  const cleanOptions = JSON.parse(JSON.stringify(item.options || DEFAULT_OPTIONS));
  const sanitizedImages = sanitizeAttachedImages(item.attachedImages);
  const sanitizedDocs = sanitizeAttachedDocuments(item.attachedDocuments);

  const docPayload: any = {
    id: docId,
    title: item.title || 'Mã QR đã lưu',
    rawString: item.rawString || '',
    type: item.type || 'url',
    options: cleanOptions,
    createdAt: item.createdAt || Date.now(),
    createdByUid: item.createdByUid || null,
    creatorName: item.creatorName || null,
    isPublic: item.isPublic ?? false,
    marketValue: item.marketValue || null,
    attachedImages: sanitizedImages,
    attachedDocuments: sanitizedDocs,
    coordinates: item.coordinates || null,
    actionType: item.actionType || 'save',
  };

  if (item.lastExportedAt) {
    docPayload.lastExportedAt = item.lastExportedAt;
  }
  if (item.reportCode) {
    docPayload.reportCode = item.reportCode;
  }

  // Always save to Server Cloud immediately so data is permanently persisted on the server
  await saveToServerCloud(docPayload);

  // Attempt Firestore write
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, docPayload, { merge: true });
    notifyQuotaStatus(false);
  } catch (err: any) {
    console.warn('Firestore saveQRToCloud warning:', err);
    if (isQuotaError(err)) {
      notifyQuotaStatus(true);
    }
    // If oversized image, retry with 1 image
    if (docPayload.attachedImages && docPayload.attachedImages.length > 1) {
      try {
        const fallbackPayload = { ...docPayload, attachedImages: docPayload.attachedImages.slice(0, 1) };
        const docRef = doc(db, COLLECTION_NAME, docId);
        await setDoc(docRef, fallbackPayload, { merge: true });
      } catch (e2: any) {
        if (isQuotaError(e2)) notifyQuotaStatus(true);
      }
    }
  }

  return docId;
};

// Record/Log an exported PDF report action to Cloud
export const recordExportPdfAction = async (data: {
  id?: string;
  title: string;
  rawString: string;
  type: QRType;
  options: QROptions;
  marketValue?: string;
  attachedImages?: string[];
  attachedDocuments?: AttachedDocument[];
  coordinates?: string;
  reportCode?: string;
  createdByUid?: string;
  creatorName?: string;
}): Promise<string> => {
  const docId = data.id || 'export_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const docPayload: any = {
    id: docId,
    title: data.title || 'Báo cáo định giá PDF',
    rawString: data.rawString || '',
    type: data.type || 'url',
    options: JSON.parse(JSON.stringify(data.options)),
    createdAt: Date.now(),
    lastExportedAt: Date.now(),
    createdByUid: data.createdByUid || null,
    creatorName: data.creatorName || 'Chuyên viên',
    isPublic: false,
    marketValue: data.marketValue || null,
    attachedImages: sanitizeAttachedImages(data.attachedImages),
    attachedDocuments: sanitizeAttachedDocuments(data.attachedDocuments),
    coordinates: data.coordinates || null,
    actionType: 'export_pdf',
    reportCode: data.reportCode || `HDG-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  // Save to Server Cloud
  await saveToServerCloud(docPayload);

  // Save to Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, docPayload, { merge: true });
    notifyQuotaStatus(false);
  } catch (err: any) {
    console.warn('Firestore recordExportPdfAction warning:', err);
    if (isQuotaError(err)) {
      notifyQuotaStatus(true);
    }
  }

  return docId;
};

// Toggle public sharing permission for QR
export const toggleQRPublicInCloud = async (id: string, isPublic: boolean): Promise<void> => {
  // Update Server Cloud
  try {
    const current = await fetchFromServerCloud();
    const item = current.find((i) => i.id === id);
    if (item) {
      await saveToServerCloud({ ...item, isPublic });
    }
  } catch {}

  // Update Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isPublic });
  } catch (err: any) {
    if (isQuotaError(err)) notifyQuotaStatus(true);
  }
};

// Update QR title in Cloud
export const updateQRTitleInCloud = async (id: string, newTitle: string): Promise<void> => {
  // Update Server Cloud
  try {
    const current = await fetchFromServerCloud();
    const item = current.find((i) => i.id === id);
    if (item) {
      await saveToServerCloud({ ...item, title: newTitle });
    }
  } catch {}

  // Update Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { title: newTitle });
  } catch (err: any) {
    if (isQuotaError(err)) notifyQuotaStatus(true);
  }
};

// Delete QR from Cloud
export const deleteQRFromCloud = async (id: string): Promise<void> => {
  // Delete from Server Cloud
  await deleteFromServerCloud(id);

  // Delete from Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (isQuotaError(err)) notifyQuotaStatus(true);
  }
};

// Clear all QRs from Cloud
export const clearAllQRsInCloud = async (): Promise<void> => {
  // Clear Server Cloud
  try {
    const current = await fetchFromServerCloud();
    await Promise.all(current.map((i) => deleteFromServerCloud(i.id)));
  } catch {}

  // Clear Firestore
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err: any) {
    if (isQuotaError(err)) notifyQuotaStatus(true);
  }
};

// Import batch QRs to Cloud
export const importQRsToCloud = async (items: SavedQR[]): Promise<void> => {
  // Sync to Server Cloud
  try {
    await fetch('/api/cloud-qrs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  } catch {}

  // Sync to Firestore
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docId = item.id || Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
      const docRef = doc(db, COLLECTION_NAME, docId);
      batch.set(
        docRef,
        {
          title: item.title,
          rawString: item.rawString,
          type: item.type,
          options: JSON.parse(JSON.stringify(item.options || DEFAULT_OPTIONS)),
          createdAt: item.createdAt || Date.now(),
          createdByUid: item.createdByUid || null,
          creatorName: item.creatorName || null,
          isPublic: item.isPublic ?? false,
          marketValue: item.marketValue || null,
          attachedImages: sanitizeAttachedImages(item.attachedImages),
          attachedDocuments: sanitizeAttachedDocuments(item.attachedDocuments),
          coordinates: item.coordinates || null,
        },
        { merge: true }
      );
    });
    await batch.commit();
  } catch (err: any) {
    if (isQuotaError(err)) notifyQuotaStatus(true);
  }
};
