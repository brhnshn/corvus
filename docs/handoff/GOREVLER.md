# Corvus — Uygulama Görevleri (B + A)

> Bu dosya bir uygulayıcı model (Gemini Flash / Antigravity) için yazıldı.
> **Bir oturumda yalnızca BİR görev yap.** Görev bitince "Kontrol" adımlarını çalıştır, sonucu raporla ve dur.

## 0. Genel kurallar (her görev için geçerli)

- Çalışma klasörü: `src/Corvus.Web` (React 19 + Vite + vitest, TypeScript). Aşağıdaki yollar aksi yazılmadıkça `src/Corvus.Web/src/` köküne göredir.
- **Davranış değiştirme.** Bu bir refactor'dür; yalnızca açıkça "HATA DÜZELTMESİ" yazan yerlerde davranış değişir.
- JSX'i, `className` dizelerini, yorumları ve i18n anahtarlarını **birebir** taşı. Yeni UI metni ekleme (eklenecekse hem `i18n/en.ts` hem `i18n/tr.ts`).
- Hook çağrı sırasını koru. Hook'lar her zaman erken `return`'lerden **önce** çağrılmalı.
- Taşınan şeyler için kullanılmayan import bırakma (oxlint sıfır uyarı hedefi). Sadece tip olanlar için `import type`.
- Mevcut konvansiyon:
  - Bileşen dosyasının **yolu ve export adı değişmez**; sadece içi bölünür.
  - Alt bileşenler üst bileşenin yanında bir konu alt klasörüne (`row/`, `incidents/`, `overview/`…), PascalCase ad.
  - Hook'lar `useXxx.ts`, saf yardımcılar `<konu>.utils.ts`.
  - **Barrel `index.ts` oluşturma**, doğrudan göreli import kullan.
  - Bileşenler `export const X: React.FC<Props>` biçiminde named export.
- Satır numaraları yazıldığı andaki koda göredir ve önceki görevlerden sonra kayabilir. **İsimlere (fonksiyon/değişken adı) güven, satır numarasına değil.**
- Hedef: bölünen her dosya **< 250 satır**.
- **Git:** Her görev bitip Kontrol üçlüsü temiz geçince o görev için **tek bir yerel commit** at (bkz. "Commit kuralı").
  Kontrol kırmızıysa commit atma, dur ve raporla.
- **YASAK:**
  - **`git push` ASLA yapma** (push otomatik release tetikler). `--amend`, `rebase`, `reset --hard` ve force işlemleri yapma.
  - `git add -A` / `git add .` kullanma; sadece o görevde değiştirdiğin dosyaları adlarıyla ekle. `docs/handoff/` klasörünü commit'e **ekleme**.
  - `../Corvus.Api/wwwroot` altındaki değişiklikleri bırakma (bkz. Kontrol).
  - `i18n/tr.ts`, `i18n/en.ts` ve backend'deki `CorvusJsonSerializerContext.cs` dosyalarını bölme.
  - Testleri silme veya `skip` etme.

### Kontrol (her görevin sonunda, `src/Corvus.Web` içinde)

```bash
npx tsc -b --noEmit
npm run lint
npm test
```

Üçü de temiz olmalı (lint: 0 uyarı, test: hepsi geçer). `npm run build` çalıştırırsan çıktı `../Corvus.Api/wwwroot`'a yazılır. Ardından şunları çalıştır:

```bash
git checkout -- ../Corvus.Api/wwwroot
git clean -fd ../Corvus.Api/wwwroot
```

Rapor formatı: değişen/eklenen dosyalar ve satır sayıları, üç komutun sonucu, commit hash'i, varsa yapamadığın veya emin olmadığın noktalar.

### Commit kuralı

- Görev başına bir commit. Mesaj formatı (repodaki stil, İngilizce, küçük harf):
  - B görevleri: `fix(web): <kısa açıklama> [B2]` veya `refactor(web): ... [B1]`
  - A görevleri: `refactor(web): split <DosyaAdı> into smaller modules [A4]`
- Commit öncesi `git status` ile wwwroot'ta değişiklik olmadığını doğrula.
- **B1 zaten tamamlandı ve doğrulandı ama henüz commit edilmedi.** B2'ye başlamadan önce B1 dosyalarını commit et:
  - Değişen dosyalar: `AppLayout.tsx`, `hooks/index.ts`, `ActivityTimeline/index.tsx`, `Containers/index.tsx`, `Dashboard/index.tsx`, `Services/useServicesData.ts`, `SystemMetrics/index.tsx`, `Systems/index.tsx`, `Uptime/index.tsx`
  - Yeni dosyalar: `hooks/activeSystemStore.ts`, `hooks/useActiveSystem.ts`, `__tests__/useActiveSystem.test.tsx`
  - Mesaj: `refactor(web): consolidate active system state into useActiveSystem hook [B1]`

---

## SIRA

**B1 → B2 → B3 → A1 … A10.** B önce yapılmalı, çünkü A7 (`Containers/index.tsx`) B1'in sonucuna dayanır.

---

## B — Aktif sistem (seçili düğüm) state'ini tek hook'ta topla

Arka plan: Frontend'de "düğüm" = **system** (`activeSystemId` / `activeSystemName`). Gerçek kaynak şunlardır:
- `localStorage['corvus_active_system_id']` (varsayılan `'local-host'`)
- `localStorage['corvus_active_system_name']` (varsayılan `'Host'`)
- senkronizasyon için `window` CustomEvent `'corvus_active_system_changed'` (`detail: { systemId, systemName }`)

Bu kaynak **aynen kalacak**. React Context, zustand vb. **ekleme**. Sadece 8 yerde kopyalanmış `useState` + listener kodu tek hook'a toplanacak.

### B1 — `activeSystemStore.ts` + `useActiveSystem` hook'u ve sayfaların geçişi

**1) Yeni dosya `hooks/activeSystemStore.ts`** (React içermez):

```ts
import { invalidateCache } from '../api/http';

export const ACTIVE_SYSTEM_ID_KEY = 'corvus_active_system_id';
export const ACTIVE_SYSTEM_NAME_KEY = 'corvus_active_system_name';
export const ACTIVE_SYSTEM_CHANGED_EVENT = 'corvus_active_system_changed';
export const DEFAULT_SYSTEM_ID = 'local-host';
export const DEFAULT_SYSTEM_NAME = 'Host';

export interface ActiveSystem { id: string; name: string }

export function readActiveSystem(): ActiveSystem
// typeof window kontrolü + try/catch; boşsa DEFAULT_* döner.

export function setActiveSystem(id: string, name?: string): void
// name yoksa: id === 'local-host' ? 'Host' : id
// 1) iki anahtarı localStorage'a yaz  2) invalidateCache()
// 3) window.dispatchEvent(new CustomEvent(ACTIVE_SYSTEM_CHANGED_EVENT, { detail: { systemId: id, systemName: name } }))
```

`invalidateCache` `api/http.ts`'den export edilmiş olmalı. `Systems/index.tsx` zaten oradan import ediyor; aynı yolu kullan. Döngüsel import oluşmadığını doğrula.

**2) Yeni dosya `hooks/useActiveSystem.ts`**, ve `hooks/index.ts` barrel'ına export ekle:

```ts
export function useActiveSystem(): {
  systemId: string;
  systemName: string;
  setActiveSystem: (id: string, name?: string) => void;
}
```

- `useState(readActiveSystem)` ile başlat.
- `useEffect` içinde `ACTIVE_SYSTEM_CHANGED_EVENT`'e abone ol. `detail` varsa ondan, yoksa `readActiveSystem()`'dan state'i güncelle. Cleanup'ta listener'ı kaldır.
- `setActiveSystem` store'daki fonksiyonun kendisi.

**3) Sayfaların geçişi.** Her dosyada sadece **state** kısmı gider. Sayfanın veri yenileme listener'ı **kalır**, yalnızca içindeki `setActiveSystemId/Name` çağrıları silinir.

| Dosya | Yapılacak |
|---|---|
| `pages/SystemMetrics/index.tsx` | `activeSystemName` / `activeSystemId` `useState`'lerini sil. `const { systemId: activeSystemId, systemName: activeSystemName } = useActiveSystem();`. Listener sadece `loadData()` çağırsın. `useSystemMetricsStream(activeSystemId)` aynen kalsın. |
| `pages/ActivityTimeline/index.tsx` | İki `useState`'i sil, hook'u kullan. `scope` state'i **kalır**. **HATA DÜZELTMESİ:** `corvus_active_system_changed` listener'ını içeren `useEffect`'in **tamamını sil**. Sebep: listener `fetchLogs(true)`'u eski `activeSystemId` closure'ı ile çağırıyor, `useLoadEffect(fetchLogs)` de id değişince yeniden çekiyor. İki istek yarışıyor, eski düğümün verisi ekranda kalabiliyor. Hook id'yi güncelleyince `fetchLogs` yeniden oluşur ve `useLoadEffect` tek ve doğru isteği atar. |
| `pages/Services/useServicesData.ts` | İki `useState`'i sil, hook'u kullan. Dönüş nesnesindeki `activeSystemName`, `activeSystemId` adları **aynı kalsın** (`Services/index.tsx` değişmesin). `handleSystemChange` içindeki `setActiveSystemId/Name` satırlarını sil; `loadServices(true)` kalır (`loadServices` id'ye bağlı değil, header'ı `localStorage`'dan okuyor, doğru). |
| `pages/Services/useSystemdUnits.ts` | **DOKUNMA.** Buradaki `activeSystemId` bilerek sayfaya özel bir override (`'local'` sentinel'i, dropdown global düğümü değiştirmez). |
| `pages/Dashboard/index.tsx` | `activeSystemName` `useState`'ini sil. `const { systemName: activeSystemName } = useActiveSystem();`. Listener'daki `setActiveSystemName` dalını sil; `invalidateCache()` + `loadData()` kalır. |
| `pages/Containers/index.tsx` | `activeSystemName` `useState` + onu güncelleyen `useEffect`'i (ikisi birlikte) sil, hook'u kullan. `useContainersPageState.ts` içindeki yenileme listener'ı **aynen kalır**. |
| `pages/Uptime/index.tsx` | `activeSystemName` `useState`'ini ve listener'daki setter satırlarını sil, hook'u kullan. `fetchServices()` çağrısı (`activeTab === 'uptime'` koşulu) kalır. |
| `components/layout/AppLayout.tsx` | `activeSystemName` `useState` + `useEffect`'i sil. `const { systemName: activeSystemName } = useActiveSystem();`. |
| `pages/Systems/index.tsx` → `handleSelectSystem` | Fonksiyonun içi: `systemName` hesaplaması aynı kalır, ardından `setActiveSystem(systemId, systemName)` ve `onNavigate?.('dashboard')`. Doğrudan `localStorage.setItem` / `invalidateCache` / `dispatchEvent` satırları silinir. |
| `pages/Systems/useSystemsPageState.ts` | **DOKUNMA** (`selectedSystemId` detay paneli seçimi, aktif düğümle ilgisi yok). |
| `api/http.ts`, `api/deployments.ts` | **DOKUNMA** (null davranışı farklı). |

**4) Test**, yeni `__tests__/useActiveSystem.test.tsx`:
- `@testing-library/react` `renderHook` + `act` kullan, `beforeEach(() => localStorage.clear())`, `vi.mock('../api/http', ...)` ile `invalidateCache`'i mock'la.
- Test vakaları:
  1. Boş storage'da `{ 'local-host', 'Host' }` döner.
  2. Storage'daki değeri okur.
  3. `setActiveSystem('n1','Node 1')` iki anahtarı yazar, event'i bir kez yayar, hook state'i güncellenir, `invalidateCache` çağrılır.
  4. Aynı anda render edilmiş iki hook, tek `setActiveSystem`'den sonra ikisi de güncellenir.
  5. Dışarıdan `window.dispatchEvent(new CustomEvent(..., { detail }))` state'i günceller.
  6. `detail`'sız event storage'a düşer.
  7. İsimsiz çağrıda `local-host` için `'Host'`, diğer id'ler için id'nin kendisi kullanılır.
  8. Unmount'ta listener kaldırılır (`vi.spyOn(window, 'removeEventListener')`).

**Kabul kriterleri:**
- `grep -rn "useState" src | grep -i "activeSystem"` sadece `useSystemdUnits.ts` ve yeni hook'u göstermeli.
- `corvus_active_system_id` dizesi `localStorage.setItem` ile sadece `activeSystemStore.ts`'de yazılmalı.
- Kontrol üçlüsü temiz olmalı.

### B2 — HATA DÜZELTMESİ: Komut paleti `> switch` düğüm değiştirmiyor

Dosya: `components/common/CommandPalette/commandItems.ts`, `cmd-switch-${s.id}` öğesinin `onSelect`'i.

Şu an:
- Sadece `localStorage.setItem('corvus_active_system_id', s.id)` yapıyor.
- Hiç kimsenin dinlemediği `'corvus_system_switch'` event'ini yayıyor.
- İsmi yazmıyor, cache'i temizlemiyor.

Sonuç olarak açık sayfalar eski düğümde kalıyor.

Değişiklik:
- `localStorage.setItem(...)` ve `window.dispatchEvent(new CustomEvent('corvus_system_switch', ...))` satırlarını sil, yerine `setActiveSystem(s.id, s.name)` koy (import: `../../../hooks/activeSystemStore`; yolu doğrula).
- `onNavigate('systems', s.id)` → `onNavigate('dashboard')` yap (Systems sayfasındaki seçimle aynı davranış).
- `toast` satırı aynen kalır.

Test (`__tests__/commandItems.test.ts`, mevcut test yapısına uygun, mock'lanabiliyorsa): switch öğesinin `onSelect`'i çağrılınca iki storage anahtarı yazılır ve `corvus_active_system_changed` event'i yayılır. Mock'lamak çok zorsa testi atla ve raporda belirt.

### B3 — Silinmiş düğüm için geri dönüş (küçük)

Dosya: `hooks/useActiveSystemStatus.ts`.

Bu hook her 30 sn'de `systemsApi.getSystems()` ile listeyi çekip aktif düğümü arıyor. Değişiklik:
- Liste **başarıyla** yüklendiyse,
- aktif id `'local-host'` değilse,
- ve listede bulunamadıysa,

`setActiveSystem(DEFAULT_SYSTEM_ID, DEFAULT_SYSTEM_NAME)` çağır. Hata durumunda (catch) **hiçbir şey yapma**; ağ hatasında düğümü sıfırlamak yanlış olur. Ayrıca hook'taki `'corvus_active_system_id'` / event adı dizelerini `activeSystemStore.ts` sabitleriyle değiştir.

Test: `systemsApi.getSystems`'i id'yi içermeyen bir liste dönecek şekilde mock'la ve storage'ın `local-host`'a döndüğünü doğrula. Reject eden mock'ta storage değişmemeli.

---

## A — 300+ satırlık frontend dosyalarını böl

Her dosyada **dışa açık yol + export adı + props arayüzü değişmez**. Önerilen sıra kolaydan zora: A1 → A10.

### A1 — `pages/ContainerDetail/tabs/TerminalTab.tsx` (304)

- **Var olanı yeniden kullan:** `pages/Containers/terminal/terminal.utils.ts` zaten şunları export ediyor:
  - `TerminalConnectionState`
  - `ShellOption`, `SHELL_OPTIONS`
  - `createTerminalOptions()`
  - `buildTerminalWsUrl(containerId, shell)`

  Dosyadaki yerel `ShellOption` / `SHELL_OPTIONS` tanımlarını, inline xterm seçenek nesnesini ve WS URL oluşturmayı sil, bunları import et. **Önce** inline seçeneklerin `createTerminalOptions()` ile birebir aynı olduğunu karşılaştır; fark varsa dur ve raporla.
- Yeni `tabs/useTabTerminal.ts`: ref'ler (`terminalElementRef`, `xtermRef`, `fitAddonRef`, `wsRef`), state'ler (`connectionState`, `errorMessage`, `shell`, `isFullscreen`), `sendResize`, `connectTerminal`, `useLoadEffect(connectTerminal)`, window resize effect'i. İmza: `useTabTerminal(containerId: string)`.
  - Döner: `{ terminalElementRef, xtermRef, connectionState, errorMessage, shell, setShell, isFullscreen, setIsFullscreen, connectTerminal }`.
  - `connectTerminal` bağımlılıkları `[containerId, shell, sendResize, t]` aynen kalır; hook içinde `useI18n` çağır.
  - Resize effect deps `[sendResize, isFullscreen]`.
  - `useContainerTerminal`'i **kullanma** (ESC/onClose davranışı farklı).
- Yeni `tabs/TerminalToolbar.tsx`: başlık + bağlantı rozeti + shell `<select>` + yeniden bağlan/temizle/tam ekran butonları + hata kutusu.
  - Props: `containerName, connectionState, errorMessage, shell, onShellChange, isFullscreen, onToggleFullscreen, onReconnect, onClear`.
  - Seçenek etiketi: `opt.labelKey ? t(opt.labelKey) : opt.defaultLabel` (önce `ShellOption` alan adlarını kontrol et).
- `TerminalTab.tsx`'de kalanlar: props, `import '@xterm/xterm/css/xterm.css'`, kök div (fullscreen sınıfları), toolbar, terminal elementi `div`'i. `onClear = () => xtermRef.current?.clear()`.

### A2 — `pages/Containers/detail/ContainerDetailModal.tsx` (311)

- Yeni `detail/useContainerInspect.ts`:
  - Taşınacaklar: `activeTab`, `inspectData`, `loading`, `error`, `actionLoading` state'leri, `loadInspectData`, `prevOpenState` ile render sırasında yapılan state ayarı (aynen), `loadDataWhenOpen` + `useLoadEffect`, `handleAction`.
  - İmza: `useContainerInspect({ containerId, isOpen, initialTab, onContainerActionSuccess })`.
  - `export type DetailTabType = 'overview'|'env'|'networking'|'storage'|'resources'|'deployments'` burada tanımlansın, modal import etsin.
- Yeni `detail/ContainerDetailTabNav.tsx`: sekme butonları. Props: `activeTab, onChange, envCount, portsCount, mountsCount`. Deployments sekme ikonundaki `text-indigo-400` korunmalı.
- Yeni `detail/ContainerDetailTabContent.tsx`: loading/error/sekme içerikleri. Modal'ın geçirdiği tüm değerler props olur.
- Modal'da kalanlar: props arayüzü, `showResourceLimitsModal`, `containerName`, sayımlar, `modalTitle`, `Modal` kabuğu, `ContainerResourceLimitsModal`.
- **KRİTİK:** `useContainerInspect(...)` çağrısı `if (!isOpen || !containerId) return null;` satırından **önce** olmalı.

### A3 — `pages/Containers/detail/ContainerOverviewTab.tsx` (317)

Yeni klasör `detail/overview/`:
- `overview.utils.ts`: `formatInspectDate`.
- `OverviewActionsToolbar.tsx`: start/stop/restart/pause/unpause/terminal/logs butonları. `showActionsToolbar` koşulu üst bileşende kalır.
- `OverviewStatusCards.tsx`: tam ID kartı (`copiedId` state + `handleCopyId` dahil), imaj kartı, durum/sağlık kartı.
- `OverviewLimitCards.tsx`: yeniden başlatma politikası + yapılandırılmış limitler.
- `OverviewRuntimeInfo.tsx`: çalışma zamanı yapılandırması + zaman damgaları (`commandStr`/`entrypointStr` hesabı dahil).

`ContainerOverviewTab.tsx`'de interface (kullanılmayan `containerSummary` prop'u dahil, dokunma) ve kompozisyon kalır.

**KRİTİK:** `OverviewStatusCards` ve `OverviewLimitCards` `grid grid-cols-1 md:grid-cols-2 gap-3.5` wrapper'ının **doğrudan çocukları** olarak render olmalı, kök olarak `<>...</>` fragment kullan, ekstra `div` sarma. Tipler için `../inspectHelpers` export'larını kontrol et (yoksa `ReturnType<typeof getInspectConfig>`).

### A4 — `pages/Containers/ContainerRow.tsx` (357)

Tek kullanan: `Containers/ContainerList.tsx`. Yeni klasör `pages/Containers/row/`:
- `ContainerRowNameCell.tsx`: 1. hücre (durum noktası, ad, compose rozeti, imaj güncelleme butonu, shortId, `ContainerQuickActions`, etiket çipleri, mobil Pill).
- `ContainerRowResources.tsx`: 2. hücre. `cpuPercent`/`ramBytes`/`ramPercent` hesabı buraya taşınır. Props: `isRunning, stats?`.
- `ContainerRowImagePorts.tsx`: 3. hücre (imaj + portlar).
- `ContainerRowActions.tsx`: 5. hücre. Kökü `onClick={e => e.stopPropagation()}` olan `div`.

`ContainerRow.tsx`'de kalanlar: `ContainerRowProps` export'u, türetilmiş değerler, `handleRowClick`'li kök grid `div`'i, 4. hücre (Pill + Status).

**KRİTİK:** Grid'in 5 çocuğu aynı sırada ve aynı kök elementlerle kalmalı. Tüm `stopPropagation` çağrıları korunmalı.

### A5 — `pages/Uptime/IncidentsTab.tsx` (335)

Yeni klasör `pages/Uptime/incidents/`:
- `incidents.utils.tsx`: `getSeverityStyle`, `getSeverityText`, `getStatusText`, `formatDate`. JSX ikon döndüğü için uzantı `.tsx`. `t` kullananlara `t` parametresi ekle; tipi `useI18n` dönüşünden al (`ReturnType<typeof useI18n>['t']`).
- `useIncidents.ts`: `incidents, loading, error, subFilter, setSubFilter, fetchIncidents, handleResolve, handleDelete, activeIncidents, resolvedIncidents, filteredIncidents`. `fetchIncidents` `useCallback` deps `[t]` aynen.
- `IncidentsToolbar.tsx`: filtre butonları + yenile + oluştur.
- `IncidentCard.tsx`: tek olay kartı. Props: `incident, onResolve, onEdit, onDelete`.

`IncidentsTab.tsx`'de modal state'i (`isModalOpen`, `selectedIncident`, aç/düzenle), boş/hata/yükleniyor durumları, liste ve `AddIncidentModal` kalır. `window.confirm`/`alert` çağrıları olduğu gibi kalır.

### A6 — `components/Sidebar.tsx` (327)

**KRİTİK:** `export type PageId` 11 dosyada import ediliyor. `PageId` ve `Sidebar` export'ları `components/Sidebar.tsx`'de **kalır**. Yeni dosyalar `import type { PageId } from '../Sidebar'` kullanır.

Yeni klasör `components/sidebar/`:
- `useSidebarResize.ts`: `sidebarWidth`, `isResizing`, `handleMouseDown`, `handleDoubleClickResizer`, mousemove/mouseup effect'i. Sabitler aynen: varsayılan 232, min 184, max 320, anahtar `corvus_sidebar_w`, CSS değişkeni `--sidebar-w`.
- `useNavPills.ts`: `useNavPills(currentPage, sidebarWidth)`. Döner: `{ navRef, hoverPill, activePill, handleMouseEnterButton, handleMouseLeaveNav }`. `updateActivePill` effect deps `[updateActivePill, sidebarWidth]`.
- `SidebarNav.tsx`: `navItems` + `<nav>`. `useNavPills`'i kendisi çağırır. `<nav>` tek element kalır, çocuk sırası (önce hover pill, sonra active pill div'leri, sonra butonlar) ve `data-nav` öznitelikleri korunur.
- `SidebarFooter.tsx`: alt kısım + GitHub svg. `versionInfo` state'i ve `api.getVersion()` effect'i burada. `__APP_VERSION__` kullanımı aynen.

`Sidebar.tsx`'de kalanlar: `PageId`, `SidebarProps`, `useSidebarResize`, `<aside>` kabuğu, resizer, marka + komut paleti tetikleyici, `<SidebarNav/>` + `<SidebarFooter/>`.

### A7 — `pages/Containers/index.tsx` (319) — B1 bitmiş olmalı

B1'den sonra aktif sistem adı zaten `useActiveSystem()`'den geliyor. **Ayrı bir `useActiveSystemName` hook'u yazma.**

- `ContainersToolbar.tsx`: SearchInput + görünüm Segment'i. Props: `search, onSearchChange, viewMode, onViewModeChange`.
- `ContainersFilterChips.tsx`: etiket/durum çipleri. Görünürlük koşulu (`tagsWithCounts.length > 0 || selectedTag || selectedState`) üst bileşende kalır.
- `ContainersEmptyStates.tsx`: yükleniyor / hiç yok / filtre sonucu boş. Props: `loading, total, filteredCount, onRefresh, onClearFilters`.
- `ContainerList` ve `ComposeStackGroup`'a geçen **birebir aynı** inline handler'ları iki yerel fonksiyonda birleştir: `handleOpenImageUpdate(c)` ve `handleRequestDelete(c)`.
- `MotionItem staggerIndex` değerleri ve `PageStage` yapısı aynen kalır.

### A8 — `pages/Settings/index.tsx` (343)

`App.tsx` bunu lazy import ediyor (`m.SettingsPage`). Named + default export ve `SettingsPageProps` kalır.

- `useSettingsPage.ts`: tüm state'ler, `fetchAlertRules`, `fetchDbStats`, yükleme effect'i (`[]` deps aynen), `handleToggleRegistration`, `handleTestNotification`, `handleSave`, `handleDownloadBackup`, `handleGenerateToken`, `backupCurlSnippet`, `handleCopyBackupCmd`. JSX'in kullandığı her şeyi döndür.
- `SettingsTabNav.tsx`: sekme dizisi + nav. `export type SettingsTab = 'general'|'users'|'notifications'|'alerts'|'backup'` buraya taşınır.
- `SettingsHeader.tsx`: başlık + kaydet butonu. `onSave={() => handleSave()}` olarak geçir (`handleSave` opsiyonel form event'i alıyor).

`index.tsx`'de `activeTab`, `isViewer`, `<form onSubmit={handleSave}>` ve 5 sekme bloğu kalır. `alert()` çağrılarına dokunma.

### A9 — `pages/Containers/useContainersPageState.ts` (346)

**KRİTİK:** `Containers/ContainersModals.tsx` `ReturnType<typeof useContainersPageState>` kullanıyor. Dönüş nesnesinin **anahtar kümesi birebir aynı** kalmalı. Başlamadan önce mevcut `return {...}` anahtarlarını listele, bitince karşılaştır.

Yeni klasör `pages/Containers/pageState/`:
- `useContainersData.ts`: `containers`, `statsMap`, `loading`, `refreshing`, `isMountedRef`, `fetchStatsBackground`, `loadContainers`, `useLoadEffect(loadContainers)`, polling/listener `useEffect` (yeniden yükleme listener'ı dahil; `useLoadEffect` effect'ten **önce**). Döner: `{ containers, setContainers, statsMap, loading, refreshing, loadContainers }`.
- `useContainerFilters.ts(containers)`: `search`, `selectedTag`, `selectedState`, `viewMode` + setter'lar, `tagsWithCounts`, `filteredContainers` memo'ları.
- `useContainerActions.ts({ setContainers, loadContainers, editingTagsContainer })`: `actionInProgress`, silme state'leri (`deletingContainer`, `deleteForce`, `deleteVolumes`, `isDeleting`), `handleAction`, `handleConfirmDelete`, `handleTagsUpdated`.
- `useContainerDeployment.ts`: `getSavedActiveDeployment` lazy başlangıç state'i, `isDeployModalOpen`, `webhookWizardContainer`, `handleTriggerDeploy`. Import yolu `../deployments/useDeploymentStream` olur (doğrula).

Ana dosyada modal seçim state'leri (`selectedLogsContainer`, `selectedTerminalContainer`, `selectedInspectContainer`, `editingTagsContainer`, `sheetContainer`, `imageUpdateContainer`, `composeConfigProject`), `showPruneModal`, dört hook'un kompozisyonu ve düz `return {...}` kalır. Alt hook'lar ana dosyayı import etmemeli.

### A10 — `App.tsx` (339) — en riskli, en son

- `src/lazyPages.ts`: 13 `lazyWithRetry(...)` sabiti (`AuthPage`, `PublicStatus` dahil), modül seviyesinde. Dinamik import yolları `./pages/...`.
- `components/common/PageLoader.tsx`: `PageLoader`.
- `hooks/useAuthStatus.ts(isStatusPath)`: `authStatus`, `authLoading`, `showRegPrompt`, `checkAuth`/`loadAuth`/`useLoadEffect`, `corvus_unauthorized` listener'ı, `handleAuthSuccess`, `handleLogout`, `handleRegistrationDisabled`.
- `hooks/useEventStream.ts({ isStatusPath, authLoading, authEnabled, isAuthenticated })`: SSE `useEffect` birebir, deps dizisi aynen.
- `hooks/useDocumentTitle.ts({ currentPage, selectedContainerId, isStatusPath, authStatus })`.
- `hooks/index.ts` barrel'ında diğer hook'lar listeleniyorsa yenileri de ekle.

`App.tsx`'de kalanlar: `useAppNavigation`, `useCommandPalette`, komut öğeleri effect'i, erken return'ler (status, loading, AuthPage) ve `AppLayout`/`AppRouter` JSX'i. `AppRouter`'a geçen props aynı kalır.

**KRİTİK:** Tüm hook'lar erken return'lerden önce ve aynı sırada çağrılmalı.

---

## Doğrulama (Claude'a geri dönüşte)

Her görevden sonra (veya toplu olarak) Claude'a dön. Claude:
1. `git diff`'i inceler (davranış değişikliği, kayıp `stopPropagation`, hook sırası, `ReturnType` anahtarları).
2. tsc + lint + test çalıştırır.
3. Görev başına ✅ / ❌ raporlar.

Yerel commit'ler görev başına atılır; **push yalnızca kullanıcının onayıyla** yapılır.
