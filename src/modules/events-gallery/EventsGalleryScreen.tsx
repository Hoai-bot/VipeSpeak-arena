// E:\DuAnAI\VipeSpeak-arena\src\modules\events-gallery\EventsGalleryScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { TournamentItem } from '../tournament-core/ArenaHubScreen';

export interface ArenaPhotoItem {
  id: string;
  tourTitle: string;
  uploaderName: string;
  studentCode: string;
  caption: string;
  imageUrl: string;
  createdAt: string;
}

interface Props {
  onBack: () => void;
  onEnterTournamentStage: (tournament: TournamentItem) => void;
}

const DEFAULT_POSTERS: Record<string, string> = {
  SOLO: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
  RELAY: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  ROLEPLAY: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
  DEBATE: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=900&q=80',
};

const INITIAL_DEMO_PHOTOS: ArenaPhotoItem[] = [
  {
    id: 'photo-demo-1',
    tourTitle: 'VipeSpeak CEFR Open Championship 2026',
    uploaderName: 'Nguyễn Minh Khang',
    studentCode: '2685014',
    caption: 'Check-in vòng bảng Đấu trường Tranh biện Debate B2',
    imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=80',
    createdAt: '2026-11-23T08:30:00Z',
  },
  {
    id: 'photo-demo-2',
    tourTitle: 'Đấu Trường Nhập Vai Roleplay K4',
    uploaderName: 'Trần Thảo Vy',
    studentCode: '2685029',
    caption: 'Cặp đôi hoàn thành xuất sắc trạm Roleplay tình huống công sở',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
    createdAt: '2026-11-22T14:20:00Z',
  },
  {
    id: 'photo-demo-3',
    tourTitle: 'Ngày Hội Khảo Thí Tiếng Anh AI • SPEAK-ID',
    uploaderName: 'BTC VipeSpeak Arena',
    studentCode: 'ADMIN',
    caption: 'Trao chứng nhận năng lực nói chuẩn CEFR có mã QR xác thực',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80',
    createdAt: '2026-11-21T16:45:00Z',
  },
];

// Hàm nén ảnh thông minh trên trình duyệt trước khi upload
function compressImageFileToBlob(file: File, maxWidth = 1080, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, dataUrl });
            else reject(new Error('Không thể nén ảnh'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = ev.target?.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EventsGalleryScreen({ onBack, onEnterTournamentStage }: Props) {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [photos, setPhotos] = useState<ArenaPhotoItem[]>(INITIAL_DEMO_PHOTOS);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc sự kiện
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'ENDED'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'SOLO' | 'RELAY' | 'ROLEPLAY' | 'DEBATE'>('ALL');

  // Khung Upload / Chụp ảnh check-in cho người chơi & BTC
  const [showUploadBox, setShowUploadBox] = useState<boolean>(false);
  const [uploaderName, setUploaderName] = useState<string>('');
  const [uploaderCode, setUploaderCode] = useState<string>('');
  const [selectedTourTitle, setSelectedTourTitle] = useState<string>('VipeSpeak CEFR Open Championship 2026');
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string>('');

  // Lightbox xem ảnh phóng to
  const [lightboxPhoto, setLightboxPhoto] = useState<ArenaPhotoItem | null>(null);

  const cameraInputRef = useRef<any>(null);
  const galleryInputRef = useRef<any>(null);

  useEffect(() => {
    loadEventsAndPhotos();
  }, []);

  const loadEventsAndPhotos = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      // 1. Tải danh sách giải đấu & sự kiện
      const { data: tourData } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (tourData && tourData.length > 0) {
        setTournaments(tourData as TournamentItem[]);
        const firstTitle = (tourData[0] as any)?.title?.vi || 'VipeSpeak Arena Event';
        setSelectedTourTitle(firstTitle);
      }

      // 2. Tải danh sách ảnh check-in đã lưu trong Supabase Storage (thư mục gallery/)
      const { data: storageFiles } = await supabase.storage.from('submissions').list('gallery', {
        limit: 40,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (storageFiles && storageFiles.length > 0) {
        const cloudPhotos: ArenaPhotoItem[] = storageFiles
          .filter((f) => f.name && !f.name.startsWith('.'))
          .map((f) => {
            const { data: urlObj } = supabase.storage.from('submissions').getPublicUrl(`gallery/${f.name}`);
            // Giải mã tên file: timestamp__MSSV__HoTen__ChuThich.jpg
            const parts = f.name.replace(/\.[^/.]+$/, '').split('__');
            const code = parts[1] || 'SPEAK-ID';
            const name = decodeURIComponent(parts[2] || 'Thí sinh Arena');
            const cap = decodeURIComponent(parts[3] || 'Khoảnh khắc thi đấu VipeSpeak Arena');
            return {
              id: f.id || f.name,
              tourTitle: 'VipeSpeak Arena Live Gallery',
              uploaderName: name,
              studentCode: code,
              caption: cap,
              imageUrl: urlObj?.publicUrl || '',
              createdAt: f.created_at || new Date().toISOString(),
            };
          });

        if (cloudPhotos.length > 0) {
          setPhotos([...cloudPhotos, ...INITIAL_DEMO_PHOTOS]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (Platform.OS !== 'web') return;

    const cleanName = uploaderName.trim() || 'Thí sinh Arena';
    const cleanCode = (uploaderCode.trim() || 'GUEST').toUpperCase();
    const cleanCaption = photoCaption.trim() || `Check-in tại ${selectedTourTitle}`;

    setIsUploading(true);
    setUploadNotice(`⏳ Đang nén và tải ${fileList.length} ảnh lên thư viện sự kiện...`);

    try {
      const newlyAdded: ArenaPhotoItem[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const { blob, dataUrl } = await compressImageFileToBlob(file, 1080, 0.82);

        let finalImageUrl = dataUrl;

        if (supabase) {
          const safeName = encodeURIComponent(cleanName).slice(0, 40);
          const safeCap = encodeURIComponent(cleanCaption).slice(0, 60);
          const storagePath = `gallery/${Date.now()}_${i}__${cleanCode}__${safeName}__${safeCap}.jpg`;

          const { data: upRes } = await supabase.storage.from('submissions').upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

          if (upRes) {
            const { data: pubObj } = supabase.storage.from('submissions').getPublicUrl(storagePath);
            if (pubObj?.publicUrl) finalImageUrl = pubObj.publicUrl;
          }
        }

        newlyAdded.push({
          id: `local-${Date.now()}-${i}`,
          tourTitle: selectedTourTitle,
          uploaderName: cleanName,
          studentCode: cleanCode,
          caption: cleanCaption,
          imageUrl: finalImageUrl,
          createdAt: new Date().toISOString(),
        });
      }

      setPhotos((prev) => [...newlyAdded, ...prev]);
      setUploadNotice(`✅ Đã đăng thành công ${newlyAdded.length} ảnh lên Thư viện Sự kiện!`);
      setPhotoCaption('');
    } catch (err: any) {
      setUploadNotice(`❌ Lỗi tải ảnh: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredTournaments = tournaments.filter((t) => {
    const st = String(t.status || 'LIVE').toUpperCase();
    if (statusFilter !== 'ALL' && st !== statusFilter) return false;
    if (modeFilter !== 'ALL' && t.mode !== modeFilter) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.innerMax}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>← TRANG CHỦ</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📅 SỰ KIỆN GIẢI ĐẤU & THƯ VIỆN ẢNH THỰC ĐỊA</Text>
          <TouchableOpacity
            style={styles.uploadToggleBtn}
            onPress={() => setShowUploadBox((v) => !v)}
          >
            <Text style={styles.uploadToggleText}>
              {showUploadBox ? '✕ Đóng' : '📸 Chụp / Đăng Ảnh'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          {/* =================================================================
              KHUNG CHỤP ẢNH QUA ĐIỆN THOẠI & TẢI ẢNH CHECK-IN (NGƯỜI CHƠI & BTC)
             ================================================================= */}
          {showUploadBox && (
            <View style={styles.uploadPanel}>
              <Text style={styles.uploadPanelTitle}>
                📸 CHỤP ẢNH CHECK-IN SÂN KHẤU HOẶC TẢI ẢNH TỪ ĐIỆN THOẠI
              </Text>
              <Text style={styles.uploadPanelSub}>
                Hỗ trợ chụp trực tiếp bằng Camera điện thoại hoặc chọn nhiều ảnh từ thư viện. Ảnh được tự động nén chuẩn HD và gắn thẻ SPEAK-ID.
              </Text>

              <View style={styles.twoColRow}>
                <TextInput
                  style={[styles.input, { flex: 1, minWidth: 200 }]}
                  placeholder="Họ tên thí sinh / BTC..."
                  placeholderTextColor="#64748B"
                  value={uploaderName}
                  onChangeText={setUploaderName}
                />
                <TextInput
                  style={[styles.input, { flex: 1, minWidth: 160 }]}
                  placeholder="Mã số sinh viên (SPEAK-ID)..."
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  value={uploaderCode}
                  onChangeText={setUploaderCode}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Chú thích khoảnh khắc (VD: Check-in vòng chung kết Debate B2)..."
                placeholderTextColor="#64748B"
                value={photoCaption}
                onChangeText={setPhotoCaption}
              />

              {/* Input ẩn cho Web / Mobile Browser */}
              {Platform.OS === 'web' && (
                <>
                  {/* @ts-ignore - Mở thẳng camera trên điện thoại */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(e: any) => handleFilesSelected(e.target.files)}
                  />
                  {/* @ts-ignore - Chọn nhiều ảnh từ thư viện */}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e: any) => handleFilesSelected(e.target.files)}
                  />
                </>
              )}

              <View style={styles.cameraActionsRow}>
                <TouchableOpacity
                  style={styles.cameraBtn}
                  disabled={isUploading}
                  onPress={() => cameraInputRef.current?.click()}
                >
                  <Text style={styles.cameraBtnText}>📷 CHỤP ẢNH TRỰC TIẾP (CAMERA)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.galleryPickBtn}
                  disabled={isUploading}
                  onPress={() => galleryInputRef.current?.click()}
                >
                  <Text style={styles.galleryPickText}>🖼️ CHỌN NHIỀU ẢNH TỪ MÁY</Text>
                </TouchableOpacity>
              </View>

              {isUploading && <ActivityIndicator color="#10B981" style={{ marginTop: 8 }} />}
              {!!uploadNotice && <Text style={styles.noticeText}>{uploadNotice}</Text>}
            </View>
          )}

          {/* =================================================================
              THANH LỌC SỰ KIỆN & GIẢI ĐẤU
             ================================================================= */}
          <View style={styles.filterCard}>
            <View style={styles.filterRow}>
              {(
                [
                  { key: 'ALL', label: 'Tất cả sự kiện' },
                  { key: 'LIVE', label: '🔴 Đang diễn ra' },
                  { key: 'UPCOMING', label: '📅 Sắp tới' },
                  { key: 'ENDED', label: '✅ Đã kết thúc' },
                ] as const
              ).map((st) => (
                <TouchableOpacity
                  key={st.key}
                  style={[styles.chip, statusFilter === st.key && styles.chipActive]}
                  onPress={() => setStatusFilter(st.key)}
                >
                  <Text style={[styles.chipText, statusFilter === st.key && styles.chipTextActive]}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterRow}>
              {(['ALL', 'SOLO', 'RELAY', 'ROLEPLAY', 'DEBATE'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chipSmall, modeFilter === m && styles.chipActiveSky]}
                  onPress={() => setModeFilter(m)}
                >
                  <Text style={[styles.chipText, modeFilter === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* =================================================================
              LƯỚI THẺ SỰ KIỆN GIẢI ĐẤU (POSTER + THỂ THỨC + ĐĂNG KÝ THI)
             ================================================================= */}
          <Text style={styles.sectionHeading}>🏆 CÁC SỰ KIỆN & GIẢI ĐẤU ĐANG MỞ ({filteredTournaments.length})</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.tourGrid}>
              {filteredTournaments.map((tourney) => {
                const st = String(tourney.status || 'LIVE').toUpperCase();
                const posterUri = DEFAULT_POSTERS[tourney.mode] || DEFAULT_POSTERS.SOLO;
                const titleText =
                  typeof tourney.title === 'object' ? tourney.title.vi || tourney.title.en : String(tourney.title);

                return (
                  <View key={tourney.id} style={styles.tourCard}>
                    <View style={styles.posterWrap}>
                      {Platform.OS === 'web' && (
                        // @ts-ignore
                        <img
                          src={posterUri}
                          alt={titleText}
                          style={{ width: '100%', height: 150, objectFit: 'cover' }}
                        />
                      )}
                      <View
                        style={[
                          styles.statusBadge,
                          st === 'LIVE'
                            ? { backgroundColor: '#10B981' }
                            : st === 'ENDED'
                            ? { backgroundColor: '#475569' }
                            : { backgroundColor: '#F43F5E' },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {st === 'LIVE' ? '🔴 ĐANG DIỄN RA' : st === 'ENDED' ? 'KẾT THÚC' : '📅 SẮP TỚI'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tourBody}>
                      <Text style={styles.tourTitle}>{titleText}</Text>

                      <View style={styles.divRow}>
                        <Text style={styles.divPill}>{tourney.mode}</Text>
                        <Text style={styles.divPill}>CEFR {tourney.cefr_level}</Text>
                        <Text style={styles.divPill}>
                          {tourney.venue_type === 'ONLINE' ? '🌐 Online' : '🏟️ Offline'}
                        </Text>
                      </View>

                      <Text style={styles.tourMeta}>🏛️ {tourney.organizer_name}</Text>

                      <TouchableOpacity
                        style={styles.joinTourBtn}
                        onPress={() => onEnterTournamentStage(tourney)}
                      >
                        <Text style={styles.joinTourBtnText}>⚔️ VÀO THI ĐẤU NGAY ➔</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* =================================================================
              THƯ VIỆN HÌNH ẢNH CHECK-IN & THI ĐẤU THỰC ĐỊA
             ================================================================= */}
          <View style={styles.galleryContainer}>
            <View style={styles.galleryTopBar}>
              <View>
                <Text style={styles.galleryTitle}>
                  📷 THƯ VIỆN HÌNH ẢNH CHECK-IN & KHOẢNH KHẮC ĐẤU TRƯỜNG ({photos.length})
                </Text>
                <Text style={styles.gallerySub}>
                  Bấm vào bất kỳ hình ảnh nào để phóng to • Thí sinh có thể chụp ảnh trực tiếp bằng điện thoại
                </Text>
              </View>
              <TouchableOpacity
                style={styles.quickCameraChip}
                onPress={() => {
                  setShowUploadBox(true);
                  setTimeout(() => cameraInputRef.current?.click(), 120);
                }}
              >
                <Text style={styles.quickCameraChipText}>📸 Chụp Ảnh Check-in</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.photoCard}
                  onPress={() => setLightboxPhoto(p)}
                >
                  {Platform.OS === 'web' && (
                    // @ts-ignore
                    <img
                      src={p.imageUrl}
                      alt={p.caption}
                      style={{ width: '100%', height: 145, objectFit: 'cover' }}
                    />
                  )}
                  <View style={styles.photoMetaBox}>
                    <Text style={styles.photoUploader} numberOfLines={1}>
                      🪪 {p.uploaderName} ({p.studentCode})
                    </Text>
                    <Text style={styles.photoCaption} numberOfLines={2}>
                      {p.caption}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* MODAL LIGHTBOX PHÓNG TO ẢNH */}
        {lightboxPhoto && Platform.OS === 'web' && (
          <View style={styles.lightboxOverlay}>
            <View style={styles.lightboxBox}>
              <View style={styles.lightboxHeader}>
                <Text style={styles.lightboxTitle}>
                  🪪 {lightboxPhoto.uploaderName} ({lightboxPhoto.studentCode})
                </Text>
                <TouchableOpacity onPress={() => setLightboxPhoto(null)}>
                  <Text style={styles.lightboxClose}>✕ Đóng</Text>
                </TouchableOpacity>
              </View>
              {/* @ts-ignore */}
              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.caption}
                style={{
                  maxWidth: '100%',
                  maxHeight: '68vh',
                  borderRadius: 12,
                  objectFit: 'contain',
                  backgroundColor: '#020617',
                }}
              />
              <Text style={styles.lightboxCaption}>{lightboxPhoto.caption}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', padding: 16 },
  innerMax: { maxWidth: 1180, width: '100%', alignSelf: 'center', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  backText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: 'center', flex: 1 },
  uploadToggleBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadToggleText: { color: '#020617', fontSize: 11.5, fontWeight: '900' },

  uploadPanel: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    gap: 10,
  },
  uploadPanelTitle: { color: '#6EE7B7', fontSize: 14.5, fontWeight: '900' },
  uploadPanelSub: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  twoColRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  cameraActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  cameraBtn: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cameraBtnText: { color: '#020617', fontSize: 12, fontWeight: '900' },
  galleryPickBtn: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  galleryPickText: { color: '#020617', fontSize: 12, fontWeight: '900' },
  noticeText: { color: '#FCD34D', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 },

  filterCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#0B1120',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSmall: {
    backgroundColor: '#0B1120',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipActiveSky: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  chipText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '700' },
  chipTextActive: { color: '#020617', fontWeight: '900' },

  sectionHeading: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  tourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  tourCard: {
    flexGrow: 1,
    flexBasis: 270,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  posterWrap: { position: 'relative', width: '100%', height: 150, backgroundColor: '#020617' },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  tourBody: { padding: 14, gap: 8 },
  tourTitle: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '900', lineHeight: 20 },
  divRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  divPill: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.35)',
    color: '#7DD3FC',
    fontSize: 10.5,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tourMeta: { color: '#94A3B8', fontSize: 11.5 },
  joinTourBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  joinTourBtnText: { color: '#020617', fontSize: 12, fontWeight: '900' },

  galleryContainer: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 18,
  },
  galleryTopBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  galleryTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  gallerySub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  quickCameraChip: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickCameraChipText: { color: '#7DD3FC', fontSize: 12, fontWeight: '800' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoMetaBox: { padding: 10, gap: 3 },
  photoUploader: { color: '#6EE7B7', fontSize: 11, fontWeight: '800' },
  photoCaption: { color: '#E2E8F0', fontSize: 11.5, lineHeight: 16 },

  lightboxOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lightboxBox: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderRadius: 16,
    padding: 16,
    maxWidth: 820,
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  lightboxHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lightboxTitle: { color: '#7DD3FC', fontSize: 13, fontWeight: '900' },
  lightboxClose: {
    backgroundColor: '#F43F5E',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lightboxCaption: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});