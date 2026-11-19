export function parseCoordinates(coords: string): { lat: string; lng: string; zoom: number } | null {
  if (!coords) return null;
  const clean = coords.replace('@', '').trim();
  const parts = clean.split(',');
  const lat = parts[0]?.trim();
  const lng = parts[1]?.trim();
  let zoom = 16;

  if (parts[2]) {
    const parsedZoom = parseInt(parts[2].replace(/[za]/gi, ''), 10);
    if (!isNaN(parsedZoom) && parsedZoom > 0 && parsedZoom <= 21) {
      zoom = parsedZoom;
    }
  }

  if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    return { lat, lng, zoom };
  }
  return null;
}

export function extractGoogleMapsCoordinates(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const rawClean = input.trim();
  const candidates = [rawClean];

  // Also check if there's an embedded URL in user-pasted text (e.g. "Vị trí: https://...")
  const embeddedUrlMatch = rawClean.match(/https?:\/\/[^\s"'<>]+/i);
  if (embeddedUrlMatch && embeddedUrlMatch[0] !== rawClean) {
    candidates.push(embeddedUrlMatch[0]);
  }

  try {
    const decoded = decodeURIComponent(rawClean);
    if (decoded !== rawClean) candidates.push(decoded);
    if (embeddedUrlMatch) {
      const decodedEmbedded = decodeURIComponent(embeddedUrlMatch[0]);
      if (decodedEmbedded !== embeddedUrlMatch[0]) candidates.push(decodedEmbedded);
    }
  } catch {
    // ignore
  }

  for (const str of candidates) {
    // 1. HIGHEST PRIORITY: Exact Place / POI / Pin coordinates in Google Maps Protobuf data tokens
    // E.g., !3d9.5962501!4d105.9705243 or !8m2!3d9.5962501!4d105.9705243
    const d3d4Match = str.match(/!3d(-?\d{1,2}\.\d{3,})!4d(-?\d{1,3}\.\d{3,})/i);
    if (d3d4Match) {
      const lat = parseFloat(d3d4Match[1]);
      const lng = parseFloat(d3d4Match[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    const d1d2Match = str.match(/!2d(-?\d{1,3}\.\d{3,})!3d(-?\d{1,2}\.\d{3,})/i);
    if (d1d2Match) {
      const lat = parseFloat(d1d2Match[2]);
      const lng = parseFloat(d1d2Match[1]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    const d1d2AltMatch = str.match(/!1d(-?\d{1,2}\.\d{3,})!2d(-?\d{1,3}\.\d{3,})/i);
    if (d1d2AltMatch) {
      const lat = parseFloat(d1d2AltMatch[1]);
      const lng = parseFloat(d1d2AltMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    // 2. HIGH PRIORITY: Explicit Query / Destination / Dropped Pin parameters (q=, query=, destination=, daddr=)
    const qMatch = str.match(/(?:[?&]q|[?&]query|[?&]destination|[?&]daddr|[?&]origin|[?&]saddr)=(-?\d{1,2}\.\d{3,})(?:%2C|,|\+|%20)(-?\d{1,3}\.\d{3,})/i);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lng = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    const locMatch = str.match(/loc:(-?\d{1,2}\.\d{3,})(?:\+|,|%20)(-?\d{1,3}\.\d{3,})/i);
    if (locMatch) {
      const lat = parseFloat(locMatch[1]);
      const lng = parseFloat(locMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    // 3. HIGH PRIORITY: Explicit search or dir path with coordinates: /maps/search/9.59625,105.9705 or /maps/dir//9.59625,105.9705
    const searchPathMatch = str.match(/\/maps\/(?:search|dir\/\/|place\/)(-?\d{1,2}\.\d{3,})(?:%2C|,|\+|\s)(-?\d{1,3}\.\d{3,})/i);
    if (searchPathMatch) {
      const lat = parseFloat(searchPathMatch[1]);
      const lng = parseFloat(searchPathMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    // 4. Center / ll / sll explicit parameters
    const llMatch = str.match(/(?:[?&]ll|[?&]sll|[?&]center)=(-?\d{1,2}\.\d{3,})(?:%2C|,|\+|%20)(-?\d{1,3}\.\d{3,})/i);
    if (llMatch) {
      const lat = parseFloat(llMatch[1]);
      const lng = parseFloat(llMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    // 5. DMS coordinates format: 9°31'35.9"N 106°11'33.1"E or 9°31'35.9" N, 106°11'33.1" E
    const dmsMatch = str.match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([NS])\s*[,|\s]\s*(\d+)[°\s]+(\d+)['\s]+([\d.]+)"?\s*([EW])/i);
    if (dmsMatch) {
      const latDeg = parseFloat(dmsMatch[1]);
      const latMin = parseFloat(dmsMatch[2]);
      const latSec = parseFloat(dmsMatch[3]);
      const latDir = dmsMatch[4].toUpperCase();
      let lat = latDeg + latMin / 60 + latSec / 3600;
      if (latDir === 'S') lat = -lat;

      const lngDeg = parseFloat(dmsMatch[5]);
      const lngMin = parseFloat(dmsMatch[6]);
      const lngSec = parseFloat(dmsMatch[7]);
      const lngDir = dmsMatch[8].toUpperCase();
      let lng = lngDeg + lngMin / 60 + lngSec / 3600;
      if (lngDir === 'W') lng = -lng;

      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }

    // 6. Standalone coordinates in any text (e.g. 9.526659, 106.1925257 or 9,526659; 106,1925257 or lat: 9.526659, lng: 106.1925257)
    // Support dot (.) and Vietnamese comma (,) decimal notation
    const coordsMatch = str.match(/(?:^|[^\d.-])(-?\d{1,2}[.,]\d{2,8})\s*(?:,|%2C|;|%3B|\s|\/)\s*(-?\d{1,3}[.,]\d{2,8})(?:[^\d.-]|$)/);
    if (coordsMatch) {
      const latVal = parseFloat(coordsMatch[1].replace(',', '.'));
      const lngVal = parseFloat(coordsMatch[2].replace(',', '.'));
      if (!isNaN(latVal) && !isNaN(lngVal) && Math.abs(latVal) <= 90 && Math.abs(lngVal) <= 180) {
        return `@${latVal.toFixed(6)},${lngVal.toFixed(6)}`;
      }
    }

    // 7. LOWEST PRIORITY FALLBACK: Camera viewport @lat,lng in Google Maps URLs (e.g. @10.776889,106.700806,16z)
    // ONLY used when no specific place pin (!3d/!4d) or query (q=) was found
    const atMatch = str.match(/@(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})(?:,([0-9.]+[za]))?/i);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return `@${lat.toFixed(6)},${lng.toFixed(6)}`;
      }
    }
  }

  return null;
}

export function formatCoordinatesDisplay(coords: string | null): string | null {
  if (!coords) return null;
  const parsed = parseCoordinates(coords);
  if (parsed) {
    return `Vĩ độ (Lat): ${parsed.lat} | Kinh độ (Lng): ${parsed.lng}`;
  }
  return coords.replace('@', '');
}

export function buildGoogleMapsUrlFromCoords(coords: string): string {
  const parsed = parseCoordinates(coords);
  if (parsed) {
    return `https://www.google.com/maps/search/?api=1&query=${parsed.lat},${parsed.lng}`;
  }
  const clean = coords.replace('@', '').trim();
  return `https://www.google.com/maps?q=${encodeURIComponent(clean)}`;
}

export function getGoogleMapsEmbedUrl(
  coords: string,
  mapType: 'hybrid' | 'satellite' | 'roadmap' = 'hybrid'
): string {
  const parsed = parseCoordinates(coords);
  const typeCode = mapType === 'satellite' ? 'k' : mapType === 'hybrid' ? 'h' : 'm';
  if (parsed) {
    return `https://maps.google.com/maps?q=${parsed.lat},${parsed.lng}&t=${typeCode}&z=${parsed.zoom}&ie=UTF8&iwloc=&output=embed`;
  }
  const clean = coords.replace('@', '').trim();
  return `https://maps.google.com/maps?q=${encodeURIComponent(clean)}&t=${typeCode}&z=16&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Generate a high-resolution base64 satellite image snapshot from GPS coordinates
 * Uses CORS-enabled Google Hybrid tiles (lyrs=y) with road names, place labels, and UI card frame
 */
export async function generateSatelliteSnapshotUrl(
  coords: string,
  width = 900,
  height = 500
): Promise<string> {
  const parsed = parseCoordinates(coords);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Dark Slate Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  if (!parsed) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Không tìm thấy tọa độ vệ tinh hợp lệ', width / 2, height / 2);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  const latNum = parseFloat(parsed.lat);
  const lngNum = parseFloat(parsed.lng);
  const zoom = Math.min(Math.max(parsed.zoom || 16, 14), 18);

  const headerHeight = 72; // Space for header bar + sub-tabs
  const footerHeight = 32; // Space for bottom attribution bar
  const mapAreaHeight = height - headerHeight - footerHeight;

  const n = Math.pow(2, zoom);
  const worldX = ((lngNum + 180) / 360) * n;
  const latRad = (latNum * Math.PI) / 180;
  const worldY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const centerPixelX = worldX * 256;
  const centerPixelY = worldY * 256;

  const startPixelX = centerPixelX - width / 2;
  const startPixelY = centerPixelY - mapAreaHeight / 2;

  const startTileX = Math.floor(startPixelX / 256);
  const endTileX = Math.floor((startPixelX + width) / 256);
  const startTileY = Math.floor(startPixelY / 256);
  const endTileY = Math.floor((startPixelY + mapAreaHeight) / 256);

  // 2. Load all overlapping Google Hybrid Tiles (lyrs=y contains satellite + roads + place labels)
  const tilePromises: Promise<void>[] = [];

  for (let tx = startTileX; tx <= endTileX; tx++) {
    for (let ty = startTileY; ty <= endTileY; ty++) {
      const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        // Google Hybrid Satellite tiles (lyrs=y: satellite + roads + place names like Siêu thị Điện Máy XANH)
        const primaryUrl = `https://mt1.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${zoom}`;
        const fallbackUrl1 = `https://mt2.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${zoom}`;
        const fallbackUrl2 = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;

        img.onload = () => {
          try {
            const destX = tx * 256 - startPixelX;
            const destY = headerHeight + (ty * 256 - startPixelY);
            ctx.drawImage(img, destX, destY, 256, 256);
          } catch {
            // ignore
          }
          resolve();
        };

        img.onerror = () => {
          const fbImg = new Image();
          fbImg.crossOrigin = 'anonymous';
          fbImg.onload = () => {
            try {
              const destX = tx * 256 - startPixelX;
              const destY = headerHeight + (ty * 256 - startPixelY);
              ctx.drawImage(fbImg, destX, destY, 256, 256);
            } catch {
              // ignore
            }
            resolve();
          };
          fbImg.onerror = () => {
            const fbImg2 = new Image();
            fbImg2.crossOrigin = 'anonymous';
            fbImg2.onload = () => {
              try {
                const destX = tx * 256 - startPixelX;
                const destY = headerHeight + (ty * 256 - startPixelY);
                ctx.drawImage(fbImg2, destX, destY, 256, 256);
              } catch {
                // ignore
              }
              resolve();
            };
            fbImg2.onerror = () => resolve();
            fbImg2.src = fallbackUrl2;
          };
          fbImg.src = fallbackUrl1;
        };

        img.src = primaryUrl;
      });

      tilePromises.push(p);
    }
  }

  // Wait max 3.0s for all map tiles
  await Promise.race([
    Promise.all(tilePromises),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  // 3. Draw Center Google Red Location Pin
  const centerX = width / 2;
  const centerY = headerHeight + mapAreaHeight / 2;

  // Drop Shadow on map
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 2, 12, 5, 0, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // Pin head
  const pinRadius = 14;
  const pinHeadY = centerY - 30;

  ctx.beginPath();
  ctx.arc(centerX, pinHeadY, pinRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#ea4335'; // Google Red
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Pin Point
  ctx.beginPath();
  ctx.moveTo(centerX - pinRadius + 2, pinHeadY + 5);
  ctx.lineTo(centerX, centerY);
  ctx.lineTo(centerX + pinRadius - 2, pinHeadY + 5);
  ctx.fillStyle = '#ea4335';
  ctx.fill();

  // Inner White Dot
  ctx.beginPath();
  ctx.arc(centerX, pinHeadY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // 4. Draw Header Bar (Matching user's screenshot UI card)
  // Top Header Row (0 to 40px)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 40);

  // Globe Icon Symbol
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(22, 20, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(22, 20, 4, 0, Math.PI * 2);
  ctx.fill();

  // Title Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Ảnh Vệ Tinh Google Maps', 38, 25);

  // Green Coordinate Badge
  const coordText = `@${latNum.toFixed(6)},${lngNum.toFixed(6)}`;
  ctx.fillStyle = '#022c22';
  ctx.beginPath();
  ctx.roundRect(240, 8, 180, 24, 6);
  ctx.fill();
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(coordText, 250, 24);

  // Header Right Controls
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('❐  ⎘  ⤢', width - 16, 25);

  // Divider Line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.lineTo(width, 40);
  ctx.stroke();

  // Sub-header Tabs Row (40px to 72px)
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 40, width, 32);

  // Tab 1: Vệ Tinh (Nhãn) - Active
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.roundRect(12, 45, 110, 22, 4);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Vệ Tinh (Nhãn)', 67, 60);

  // Tab 2: Vệ Tinh Thuần
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillText('Vệ Tinh Thuần', 175, 60);

  // Tab 3: Bản Đồ Phố
  ctx.fillText('Bản Đồ Phố', 265, 60);

  // Right Tab: Xem HD Mở Rộng ↗
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Xem HD Mở Rộng ↗', width - 16, 60);

  // Bottom Border of Tabs
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 72);
  ctx.lineTo(width, 72);
  ctx.stroke();

  // 5. Draw Footer Attribution Bar (Bottom 32px)
  const footerY = height - footerHeight;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(0, footerY, width, footerHeight);

  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  // Google Watermark Text on Bottom Left
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold italic 16px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Google', 16, footerY + 22);

  // Map Data Attribution
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    'Dữ liệu bản đồ ©2026 Airbus, CNES / Maxar Technologies | Điều khoản | Báo cáo lỗi',
    width - 16,
    footerY + 21
  );

  // Outer Border around entire snapshot
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  return canvas.toDataURL('image/jpeg', 0.93);
}

export interface ResolvedLocationData {
  success: boolean;
  coordinates: string | null;
  lat: string | null;
  lng: string | null;
  fullAddress: string | null;
  suggestedTitle: string;
  placeName?: string | null;
  road?: string | null;
  area?: string | null;
  resolvedUrl?: string;
  error?: string;
}

/**
 * Automatically resolve and calculate location from any Google Maps link, short-link (maps.app.goo.gl), or coordinates.
 * Queries /api/resolve-maps-url with automatic client-side fallback.
 */
export async function resolveGoogleMapsLocation(input: string): Promise<ResolvedLocationData | null> {
  if (!input || !input.trim()) return null;
  const raw = input.trim();

  // 1. Server-side resolution (handles redirects for maps.app.goo.gl, goo.gl/maps, HTML metadata, & Nominatim)
  try {
    const res = await fetch('/api/resolve-maps-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: raw }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data as ResolvedLocationData;
      }
    }
  } catch (err) {
    console.warn('Server resolve-maps-url warning, using client fallback:', err);
  }

  // 2. Client-side fallback: check coordinates & nominatim
  let coords = extractGoogleMapsCoordinates(raw);

  if (!coords && !raw.startsWith('http://') && !raw.startsWith('https://') && raw.length >= 3) {
    try {
      const searchRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(raw)}&format=json&limit=1&accept-language=vi`,
        { headers: { 'User-Agent': 'ValuationQRAppClient/1.0' } }
      );
      if (searchRes.ok) {
        const sData = await searchRes.json();
        if (sData && sData.length > 0 && sData[0].lat && sData[0].lon) {
          coords = `@${parseFloat(sData[0].lat).toFixed(6)},${parseFloat(sData[0].lon).toFixed(6)}`;
        }
      }
    } catch {
      // ignore
    }
  }

  if (coords) {
    const parsed = parseCoordinates(coords);
    if (parsed) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsed.lat}&lon=${parsed.lng}&zoom=18&addressdetails=1&accept-language=vi`,
          { headers: { 'User-Agent': 'ValuationQRAppClient/1.0' } }
        );
        if (geoRes.ok) {
          const data = await geoRes.json();
          const addr = data.address || {};
          const latNum = parseFloat(parsed.lat);
          const lngNum = parseFloat(parsed.lng);

          const houseNumber = addr.house_number || (raw.match(/^\s*(\d+[a-zA-Z]?)\b/)?.[1] || '');
          const street = addr.road || addr.pedestrian || addr.street || '';
          const road = [houseNumber, street].filter(Boolean).join(' ') || street;

          let ward = addr.suburb || addr.quarter || addr.village || addr.neighbourhood || '';
          const wardMatch = data.display_name?.match(/(Phường\s+[^,]+|Xã\s+[^,]+|Thị trấn\s+[^,]+)/i);
          if (wardMatch && (!ward || !/^(Phường|Xã|Thị trấn)/i.test(ward))) {
            ward = wardMatch[1].trim();
          }

          let district = addr.city_district || addr.district || addr.county || '';
          let city = addr.city || addr.town || addr.county || addr.state || '';

          const isSocTrang =
            (latNum >= 9.20 && latNum <= 9.95 && lngNum >= 105.50 && lngNum <= 106.40) ||
            /Sóc Trăng|Phú Lợi|Đồng Tiến/i.test(data.display_name || '');

          if (isSocTrang) {
            if (/Phú Lợi|Đồng Tiến/i.test(data.display_name || '') || (latNum >= 9.55 && latNum <= 9.65 && lngNum >= 105.93 && lngNum <= 106.02)) {
              ward = 'Phường Phú Lợi';
              district = 'TP. Sóc Trăng';
            } else if (!district) {
              district = 'TP. Sóc Trăng';
            }
            city = 'Tỉnh Sóc Trăng';
          }

          const parts = [road, ward, district, city].filter(Boolean);
          const fullAddress = parts.join(', ');
          const mainLoc = road || ward || 'Vị trí GPS';
          const suggestedTitle = `Tài sản tại ${parts.join(', ')}`;

          return {
            success: true,
            coordinates: coords,
            lat: parsed.lat,
            lng: parsed.lng,
            fullAddress,
            suggestedTitle,
            road: mainLoc,
            area: [ward, district, city].filter(Boolean).join(', '),
            resolvedUrl: raw,
          };
        }
      } catch (e) {
        console.warn('Client nominatim fallback error:', e);
      }

      return {
        success: true,
        coordinates: coords,
        lat: parsed.lat,
        lng: parsed.lng,
        fullAddress: `Tọa độ GPS: ${parsed.lat}, ${parsed.lng}`,
        suggestedTitle: `Tài sản tại tọa độ ${parsed.lat}, ${parsed.lng}`,
        resolvedUrl: raw,
      };
    }
  }

  return null;
}

/**
 * Extract road name, locality, address title and coordinates from a Google Maps link, address, or coordinates.
 */
export async function extractLocationTitleFromInput(
  input: string
): Promise<{ fullAddress: string; suggestedTitle: string; road?: string; area?: string; coordinates?: string | null } | null> {
  if (!input || !input.trim()) return null;

  const resolved = await resolveGoogleMapsLocation(input);
  if (resolved && (resolved.fullAddress || resolved.suggestedTitle || resolved.coordinates)) {
    return {
      fullAddress: resolved.fullAddress || '',
      suggestedTitle: resolved.suggestedTitle || '',
      road: resolved.road || undefined,
      area: resolved.area || undefined,
      coordinates: resolved.coordinates || null,
    };
  }

  return null;
}



