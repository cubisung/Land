import React from 'react';
import { QRType, QROptions, WifiData, EmailData, SmsData, VCardData, VietQRData, SavedQR, UserProfile, AttachedDocument } from './types';
import { formatQRString } from './utils/qrGenerator';
import { downloadStandaloneOfflineHtml } from './utils/exportOfflineHtml';
import { Header } from './components/Header';
import { QRTypeTabs } from './components/QRTypeTabs';
import { QRInputForm } from './components/QRInputForm';
import { QROptionsPanel } from './components/QROptionsPanel';
import { QRPreviewCard } from './components/QRPreviewCard';
import { HistoryModal } from './components/HistoryModal';
import { SaveQRModal } from './components/SaveQRModal';
import { AuthModal } from './components/AuthModal';
import { AdminUsersModal } from './components/AdminUsersModal';
import { UserProfileModal } from './components/UserProfileModal';
import { UserGuideModal } from './components/UserGuideModal';
import { PrintReportModal } from './components/PrintReportModal';
import { ValuationDashboardModal } from './components/ValuationDashboardModal';
import { PendingApprovalBanner } from './components/PendingApprovalBanner';
import { extractGoogleMapsCoordinates } from './utils/geoUtils';
import { Printer, FileText, Share2, BarChart3, ExternalLink } from 'lucide-react';

import {
  subscribeToSavedQRs,
  saveQRToCloud,
  deleteQRFromCloud,
  updateQRTitleInCloud,
  clearAllQRsInCloud,
  importQRsToCloud,
  toggleQRPublicInCloud,
  fetchAllQRsFromCloud,
  onFirestoreQuotaStatusChange,
} from './services/qrCloudService';

import {
  subscribeToAuthUser,
  subscribeToAllUsers,
  logoutUser,
  ensurePresetAccountsExist,
} from './services/authService';

const LOCAL_STORAGE_KEY = 'qr_generator_saved_list_v2';

const getLocalSavedList = (): SavedQR[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalSavedList = (items: SavedQR[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    try {
      // Quota exceeded (common on Samsung/Android): save items with attachedImages stripped locally (Cloud retains full data)
      const lightweight = items.map((item) => ({
        ...item,
        attachedImages: (item.attachedImages || []).slice(0, 1),
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      // ignore
    }
  }
};

export default function App() {
  const [activeType, setActiveType] = React.useState<QRType>('url');

  // Authentication & Access Control states
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = React.useState<UserProfile[]>([]);
  const [isAuthOpen, setIsAuthOpen] = React.useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState<boolean>(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = React.useState<boolean>(false);

  // Auto initialize seed preset accounts (admin: 1111, dinhgiaqr: 2222)
  React.useEffect(() => {
    ensurePresetAccountsExist().catch(console.error);
  }, []);

  // Auth state listener
  React.useEffect(() => {
    const unsubscribe = subscribeToAuthUser((profile) => {
      setCurrentUser(profile);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Admin users list listener
  React.useEffect(() => {
    if (currentUser?.role === 'admin') {
      const unsubscribe = subscribeToAllUsers((users) => {
        setAllUsers(users);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      setAllUsers([]);
    }
  }, [currentUser?.role]);

  const pendingUsersCount = React.useMemo(() => {
    return allUsers.filter((u) => u.status === 'pending').length;
  }, [allUsers]);

  // Input states
  const [qrTitle, setQrTitle] = React.useState<string>('Tài sản tại 24c Trần Hưng Đạo, Phường Phú Lợi, TP. Sóc Trăng');
  const [marketValue, setMarketValue] = React.useState<string>('2.500.000.000');
  const [coords, setCoords] = React.useState<string | null>('@9.596250,105.970524');
  const [attachedImages, setAttachedImages] = React.useState<string[]>([]);
  const [attachedDocuments, setAttachedDocuments] = React.useState<AttachedDocument[]>([]);

  const [vietqr, setVietqr] = React.useState<VietQRData>({
    bankBin: '970415', // VietinBank
    accountNo: '101000123456',
    accountName: 'VIETINBANK CHI NHANH SOC TRANG',
    amount: '',
    addInfo: 'Chuyen tien thanh toan',
  });
  const [url, setUrl] = React.useState<string>('https://maps.app.goo.gl/ZJoDMB4Cz3BP1zTw8');
  const [text, setText] = React.useState<string>('Chào mừng bạn đến với Trình Tạo Mã QR Code Offline!');
  const [wifi, setWifi] = React.useState<WifiData>({
    ssid: 'VietinBank_SocTrang_Guest',
    password: 'password123',
    encryption: 'WPA',
    hidden: false,
  });
  const [phone, setPhone] = React.useState<string>('02993821123');
  const [email, setEmail] = React.useState<EmailData>({
    address: 'contact@vietinbank.vn',
    subject: 'Gửi yêu cầu hỗ trợ',
    body: 'Xin chào, tôi muốn hỏi thêm thông tin dịch vụ...',
  });
  const [sms, setSms] = React.useState<SmsData>({
    phone: '02993821123',
    message: 'Xin chào, tôi cần tư vấn dịch vụ!',
  });
  const [vcard, setVcard] = React.useState<VCardData>({
    firstName: 'Sóc Trăng',
    lastName: 'VietinBank Chi Nhánh',
    org: 'Ngân hàng TMCP Công Thương Việt Nam',
    title: 'Phòng Bán Hàng / Hỗ Trợ KH',
    phone: '02993821123',
    email: 'contact@vietinbank.vn',
    url: 'https://vietinbank.vn',
    address: 'TP. Sóc Trăng, Tỉnh Sóc Trăng',
  });

  // Customization Options state
  const [options, setOptions] = React.useState<QROptions>({
    darkColor: '#000000',
    lightColor: '#ffffff',
    transparentBg: false,
    errorCorrectionLevel: 'M',
    margin: 2,
    size: 512,
    logoScale: 0.2,
    logoShape: 'circle',
  });

  // Saved QR Codes (Synced with Firestore Cloud Database & Local Fallback)
  const [savedList, setSavedList] = React.useState<SavedQR[]>(() => getLocalSavedList());
  const [isCloudConnected, setIsCloudConnected] = React.useState<boolean>(true);
  const [isSyncingCloud, setIsSyncingCloud] = React.useState<boolean>(false);
  const [firestoreQuotaExceeded, setFirestoreQuotaExceeded] = React.useState<boolean>(false);

  const [isHistoryOpen, setIsHistoryOpen] = React.useState<boolean>(false);
  const [isDashboardOpen, setIsDashboardOpen] = React.useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = React.useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState<boolean>(false);

  // Initial direct fetch and real-time Cloud Subscription (Firestore + Server Cloud)
  React.useEffect(() => {
    // Listen to Firestore quota limit status
    const unsubQuota = onFirestoreQuotaStatusChange((exceeded) => {
      setFirestoreQuotaExceeded(exceeded);
    });

    // 1. Initial direct fetch from Cloud (Firestore / Server Cloud)
    fetchAllQRsFromCloud()
      .then((cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setSavedList(cloudItems);
          saveLocalSavedList(cloudItems);
        } else {
          // If server/cloud has no items yet, upload any local items in one batch
          const localList = getLocalSavedList();
          if (localList.length > 0) {
            importQRsToCloud(localList).catch(() => {});
          }
        }
        setIsCloudConnected(true);
      })
      .catch((err) => {
        console.warn('Initial cloud fetch error:', err);
      });

    // 2. Real-time Cloud listener (Firestore snapshot + Server polling fallback)
    const unsubscribe = subscribeToSavedQRs(
      (cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          setSavedList(cloudItems);
          saveLocalSavedList(cloudItems);
        }
        setIsCloudConnected(true);
      },
      (err) => {
        console.warn('Cloud Sync Error (using local persistence):', err);
      }
    );

    return () => {
      unsubQuota();
      unsubscribe();
    };
  }, []);

  // Explicit refresh cloud data function
  const handleRefreshCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const cloudItems = await fetchAllQRsFromCloud();
      setSavedList(cloudItems);
      saveLocalSavedList(cloudItems);
      setIsCloudConnected(true);
      setGenerationFeedback({
        type: 'success',
        message: `✓ Đã đồng bộ thành công ${cloudItems.length} mã QR từ Cloud Firestore!`,
      });
      setTimeout(() => setGenerationFeedback(null), 3000);
    } catch (err: any) {
      console.error('Manual refresh cloud error:', err);
      setGenerationFeedback({
        type: 'error',
        message: `Lỗi đồng bộ: ${err?.message || 'Không thể kết nối máy chủ Cloud'}`,
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Visible saved QRs based on user permissions:
  // 1. Unauthenticated Guest (!currentUser): Prompts login to sync history
  // 2. Admin (role === 'admin' or username === 'admin'): Can view & use ALL QRs created by all members and guests
  // 3. Member (role === 'member'): Can view QRs created by themselves across all devices or shared QRs
  const visibleSavedList = React.useMemo(() => {
    if (!currentUser) {
      return [];
    }
    if (currentUser.role === 'admin' || currentUser.username === 'admin') {
      return savedList;
    }
    return savedList.filter((item) => {
      // Direct match by user UID
      if (item.createdByUid && item.createdByUid === currentUser.uid) return true;
      // Match by username
      if (currentUser.username && item.creatorName && item.creatorName.toLowerCase() === currentUser.username.toLowerCase()) return true;
      // Match by email
      if (currentUser.email && item.creatorName && item.creatorName.toLowerCase() === currentUser.email.toLowerCase()) return true;
      // Match preset users
      if (currentUser.username === 'dinhgiaqr' && (item.createdByUid === 'preset_dinhgiaqr_uid' || item.creatorName === 'dinhgiaqr')) return true;
      if (currentUser.username === 'admin' && (item.createdByUid === 'preset_admin_uid' || item.creatorName === 'admin')) return true;
      // Public / shared items or legacy items
      if (item.isPublic) return true;
      if (!item.createdByUid && !item.creatorName) return true;
      return false;
    });
  }, [savedList, currentUser]);

  const handleOpenHistory = () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      setGenerationFeedback({
        type: 'error',
        message: 'Vui lòng đăng nhập tài khoản để xem lịch sử mã QR đã tạo!',
      });
      return;
    }
    setIsHistoryOpen(true);
  };

  const handleOpenDashboard = () => {
    setIsDashboardOpen(true);
  };

  // Compute active QR string
  const rawQRContent = React.useMemo(() => {
    return formatQRString(activeType, { url, text, wifi, phone, email, sms, vcard, vietqr });
  }, [activeType, url, text, wifi, phone, email, sms, vcard, vietqr]);

  // Check if current QR is already saved in history
  const isCurrentSaved = React.useMemo(() => {
    return visibleSavedList.some((item) => item.rawString === rawQRContent && item.type === activeType);
  }, [visibleSavedList, rawQRContent, activeType]);

  // Calculate smart default title for Save Modal
  const defaultSuggestedTitle = React.useMemo(() => {
    if (qrTitle.trim()) return qrTitle.trim();
    if (activeType === 'vietqr') return `VietQR: ${vietqr.accountName || 'VietinBank'} (${vietqr.accountNo})`;
    if (activeType === 'url') return url ? `Link: ${url.replace('https://', '').replace('http://', '').slice(0, 30)}` : 'Đường dẫn Website';
    if (activeType === 'text') return text ? text.slice(0, 25) : 'Đoạn văn bản';
    if (activeType === 'wifi') return `Wi-Fi: ${wifi.ssid}`;
    if (activeType === 'phone') return `ĐT: ${phone}`;
    if (activeType === 'email') return `Email: ${email.address}`;
    if (activeType === 'sms') return `SMS: ${sms.phone}`;
    if (activeType === 'vcard') return `Danh thiếp: ${vcard.lastName} ${vcard.firstName}`.trim();
    return 'Mã QR đã tạo';
  }, [qrTitle, activeType, vietqr, url, text, wifi, phone, email, sms, vcard]);

  const handleSaveFromPreview = (customTitle?: string) => {
    if (!rawQRContent || rawQRContent.trim() === '') {
      setGenerationFeedback({
        type: 'error',
        message: 'Vui lòng dán link hoặc nhập thông tin trước khi lưu mã QR!',
      });
      return;
    }
    const titleToSave = customTitle?.trim() || defaultSuggestedTitle;
    handleConfirmSaveWithTitle(titleToSave);
  };

  const handleConfirmSaveWithTitle = async (chosenTitle: string) => {
    if (!rawQRContent) return;

    // Find if an existing item matches current QR
    const existingItem = savedList.find(
      (item) => item.rawString === rawQRContent && item.type === activeType
    );

    const targetId = existingItem ? existingItem.id : Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
    const isUpdate = !!existingItem;

    const newItem: SavedQR = {
      id: targetId,
      title: chosenTitle,
      rawString: rawQRContent,
      type: activeType,
      options: { ...options },
      createdAt: existingItem ? existingItem.createdAt : Date.now(),
      createdByUid: existingItem?.createdByUid || currentUser?.uid,
      creatorName: existingItem?.creatorName || (currentUser ? currentUser.username : 'Khách'),
      isPublic: existingItem ? existingItem.isPublic : (!currentUser || currentUser.role === 'admin' ? true : false),
      marketValue: marketValue || undefined,
      attachedImages: attachedImages.length > 0 ? attachedImages : undefined,
      attachedDocuments: attachedDocuments.length > 0 ? attachedDocuments : undefined,
      coordinates: coords || extractGoogleMapsCoordinates(rawQRContent) || undefined,
    };

    setSavedList((prev) => {
      const updated = [newItem, ...prev.filter((i) => i.id !== targetId)];
      saveLocalSavedList(updated);
      return updated;
    });

    setGenerationFeedback({
      type: 'success',
      message: isUpdate
        ? `✓ Đã cập nhật thành công mã QR "${chosenTitle}"!`
        : `✓ Đã lưu mã QR "${chosenTitle}" vào danh sách!`,
    });
    setTimeout(() => setGenerationFeedback(null), 3500);

    try {
      await saveQRToCloud(newItem);
      setIsCloudConnected(true);
    } catch (err) {
      console.warn('Cloud sync error (saved locally):', err);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    setSavedList((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveLocalSavedList(updated);
      return updated;
    });
    try {
      await deleteQRFromCloud(id);
    } catch (err) {
      console.error('Failed to delete from cloud:', err);
    }
  };

  const handleUpdateTitle = async (id: string, newTitle: string) => {
    setSavedList((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item));
      saveLocalSavedList(updated);
      return updated;
    });
    try {
      await updateQRTitleInCloud(id, newTitle);
    } catch (err) {
      console.error('Failed to update title on cloud:', err);
    }
  };

  const handleImportList = async (newList: SavedQR[]) => {
    setSavedList((prev) => {
      const merged = [...newList, ...prev];
      saveLocalSavedList(merged);
      return merged;
    });
    try {
      await importQRsToCloud(newList);
      alert('Đã đồng bộ thành công danh sách!');
    } catch (err) {
      console.error('Failed to import to cloud:', err);
      alert('Đã lưu dữ liệu vào bộ nhớ thiết bị!');
    }
  };

  const handleClearAllHistory = async () => {
    setSavedList([]);
    saveLocalSavedList([]);
    try {
      if (currentUser?.role === 'admin') {
        await clearAllQRsInCloud();
      } else if (currentUser) {
        const userQRs = savedList.filter((item) => item.createdByUid === currentUser.uid);
        for (const qr of userQRs) {
          await deleteQRFromCloud(qr.id);
        }
      }
    } catch (err) {
      console.error('Failed to clear cloud history:', err);
    }
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    try {
      await toggleQRPublicInCloud(id, isPublic);
    } catch (err) {
      console.error('Failed to toggle public permission:', err);
    }
  };

  const handleSelectSavedItem = (item: SavedQR) => {
    setActiveType(item.type);
    setOptions(item.options);
    setQrTitle(item.title || '');
    setMarketValue(item.marketValue || '');
    setAttachedImages(item.attachedImages || []);
    setAttachedDocuments(item.attachedDocuments || []);
    if (item.coordinates) {
      setCoords(item.coordinates);
    } else {
      setCoords(extractGoogleMapsCoordinates(item.rawString) || null);
    }

    if (item.type === 'url') setUrl(item.rawString);
    if (item.type === 'text') setText(item.rawString);
    if (item.type === 'phone') setPhone(item.rawString.replace('tel:', ''));
  };

  const [generationFeedback, setGenerationFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleGenerateQR = () => {
    if (!rawQRContent || rawQRContent.trim() === '') {
      setGenerationFeedback({
        type: 'error',
        message: 'Vui lòng nhập đường dẫn link hoặc nội dung trước khi bấm tạo mã QR!',
      });
      return;
    }

    setGenerationFeedback({
      type: 'success',
      message: '✓ Đã tạo mã QR Code thành công!',
    });

    // Auto dismiss feedback toast
    setTimeout(() => {
      setGenerationFeedback(null);
    }, 4000);

    // Scroll smoothly to preview section
    const element = document.getElementById('qr-preview-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-[#00529C] selection:text-white">
      {/* Top App Header */}
      <Header
        onOpenHistory={handleOpenHistory}
        onOpenDashboard={handleOpenDashboard}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
        onDownloadOfflineHtml={downloadStandaloneOfflineHtml}
        savedCount={visibleSavedList.length}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={logoutUser}
        pendingUsersCount={pendingUsersCount}
        isCloudConnected={isCloudConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* If user logged in but pending approval */}
        {currentUser && currentUser.status === 'pending' ? (
          <PendingApprovalBanner currentUser={currentUser} />
        ) : (
          <>
            {/* Firestore Quota Notice & Server Cloud Active Indicator */}
            {firestoreQuotaExceeded && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">☁️</span>
                  <div>
                    <p className="font-bold text-amber-950">
                      Đang bật Máy Chủ Cloud Đồng Bộ (Server Cloud Active)
                    </p>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      Hạn mức đọc miễn phí trong ngày của Firestore Cloud tạm thời đầy. Toàn bộ mã QR và báo cáo định giá đang được tự động lưu trữ và đồng bộ xuyên suốt qua Server Cloud trên mọi máy tính và điện thoại.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://console.firebase.google.com/project/quadratic-helper-ptn3v/firestore/databases/ai-studio-trnhtomqrcode-fd981412-e183-4ab4-9886-21b0100f7afc/data?openUpgradeDialog=true"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <span>Xem Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Generation Feedback Toast */}
            {generationFeedback && (
              <div
                className={`p-4 rounded-xl font-medium text-sm border flex items-center justify-between shadow-sm animate-fade-in ${
                  generationFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              >
                <span>{generationFeedback.message}</span>
                <button
                  onClick={() => setGenerationFeedback(null)}
                  className="text-xs opacity-70 hover:opacity-100 font-bold ml-4 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* QR Content Type Selector Tabs */}
            <QRTypeTabs activeType={activeType} onChangeType={(t) => setActiveType(t)} />

            {/* Main Grid: Form & Customization on left, Live Canvas Preview on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Input Form + Visual Customization Options */}
              <div className="lg:col-span-7 space-y-6">
                <QRInputForm
                  type={activeType}
                  vietqr={vietqr}
                  setVietqr={setVietqr}
                  url={url}
                  setUrl={setUrl}
                  text={text}
                  setText={setText}
                  wifi={wifi}
                  setWifi={setWifi}
                  phone={phone}
                  setPhone={setPhone}
                  email={email}
                  setEmail={setEmail}
                  sms={sms}
                  setSms={setSms}
                  vcard={vcard}
                  setVcard={setVcard}
                  onGenerate={handleGenerateQR}
                  qrTitle={qrTitle}
                  setQrTitle={setQrTitle}
                  coords={coords}
                  setCoords={setCoords}
                />

                <QROptionsPanel options={options} onChangeOptions={setOptions} />
              </div>

              {/* Right Column: Sticky Live Canvas Preview & Download Panel */}
              <div className="lg:col-span-5">
                <QRPreviewCard
                  rawContent={rawQRContent}
                  type={activeType}
                  options={options}
                  onChangeOptions={setOptions}
                  onSaveToHistory={handleSaveFromPreview}
                  isSaved={isCurrentSaved}
                  currentUser={currentUser}
                  qrTitle={qrTitle}
                  setQrTitle={setQrTitle}
                  marketValue={marketValue}
                  setMarketValue={setMarketValue}
                  coords={coords}
                  setCoords={setCoords}
                  attachedImages={attachedImages}
                  setAttachedImages={setAttachedImages}
                  attachedDocuments={attachedDocuments}
                  setAttachedDocuments={setAttachedDocuments}
                  onOpenPrintModal={() => setIsPrintModalOpen(true)}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            Phát triển bởi quoinv
          </p>
          <p className="text-slate-600 font-bold">
            Hệ thống sử dụng nội bộ
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(profile) => setCurrentUser(profile)}
      />

      {/* User Profile Management Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onOpenAdminUsers={() => setIsAdminModalOpen(true)}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
        />
      )}

      {/* Admin Users Modal */}
      {currentUser?.role === 'admin' && (
        <AdminUsersModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* Save QR Modal */}
      <SaveQRModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleConfirmSaveWithTitle}
        defaultTitle={defaultSuggestedTitle}
        rawContent={rawQRContent}
        type={activeType}
        options={options}
      />

      {/* History & Saved Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedList={visibleSavedList}
        currentUser={currentUser}
        onDelete={handleDeleteSaved}
        onClearAll={handleClearAllHistory}
        onSelectSaved={handleSelectSavedItem}
        onUpdateTitle={handleUpdateTitle}
        onTogglePublic={handleTogglePublic}
        onImportList={handleImportList}
        onRefreshCloud={handleRefreshCloud}
        isSyncingCloud={isSyncingCloud}
        onOpenPrintModal={(item) => {
          handleSelectSavedItem(item);
          setIsPrintModalOpen(true);
          setIsHistoryOpen(false);
        }}
      />

      {/* Valuation & Statistics Dashboard Modal */}
      <ValuationDashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        savedList={savedList}
        currentUser={currentUser}
        onRefreshCloud={handleRefreshCloud}
        isSyncingCloud={isSyncingCloud}
        onOpenItem={(item) => {
          handleSelectSavedItem(item);
          setIsDashboardOpen(false);
        }}
      />

      {/* Visual User Guide Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        onDownloadOfflineHtml={downloadStandaloneOfflineHtml}
      />

      {/* Print / Export PDF Valuation Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        qrTitle={qrTitle}
        marketValue={marketValue}
        attachedImages={attachedImages}
        setAttachedImages={setAttachedImages}
        attachedDocuments={attachedDocuments}
        setAttachedDocuments={setAttachedDocuments}
        rawContent={rawQRContent}
        coords={coords || extractGoogleMapsCoordinates(rawQRContent)}
        options={options}
        type={activeType}
        currentUser={currentUser}
        onRecordExportSuccess={handleRefreshCloud}
      />
    </div>
  );
}

