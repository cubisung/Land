/**
 * Utility functions for Valuation Statistics & Location Text Extraction
 */
import { SavedQR } from '../types';

export interface ValuationSummary {
  totalCount: number;
  totalValueVnd: number;
  avgValueVnd: number;
  maxValueVnd: number;
  formattedTotalVnd: string;
  formattedAvgVnd: string;
  formattedMaxVnd: string;
  highestValuationItem?: { title: string; marketValue: string; numericValue: number; creatorName?: string };
}

export interface UserValuationStat {
  username: string;
  count: number;
  valuationCount: number;
  totalValueVnd: number;
  totalValueBillion: number;
  avgValueVnd: number;
  formattedTotal: string;
  formattedAvg: string;
}

export interface PriceSegmentStat {
  name: string;
  range: string;
  count: number;
  totalValue: number;
  color: string;
  percentage: number;
}

export interface TimeSeriesStat {
  date: string;
  displayDate: string;
  count: number;
  valueBillion: number;
  valueVnd: number;
}

export function parseMarketValueToNumber(valStr?: string | number): number {
  if (valStr === undefined || valStr === null) return 0;
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr;
  const cleanDigits = String(valStr).replace(/\D/g, '');
  if (!cleanDigits) return 0;
  const val = parseInt(cleanDigits, 10);
  return isNaN(val) ? 0 : val;
}

export function formatVndCompact(num: number): string {
  if (!num || isNaN(num) || num === 0) return '0 đ';
  if (num >= 1_000_000_000) {
    const ty = (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace('.', ',');
    return `${ty} Tỷ đ`;
  }
  if (num >= 1_000_000) {
    const tr = (num / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${tr} Triệu đ`;
  }
  return `${num.toLocaleString('vi-VN')} đ`;
}

/**
 * Calculates total valuation, average, and highest valuation metrics from saved valuation records
 */
export function calculateValuationSummary(items: SavedQR[]): ValuationSummary {
  let totalCount = 0;
  let totalValueVnd = 0;
  let maxValueVnd = 0;
  let highestValuationItem: { title: string; marketValue: string; numericValue: number; creatorName?: string } | undefined = undefined;

  items.forEach((item) => {
    const val = parseMarketValueToNumber(item.marketValue);
    if (val > 0) {
      totalCount += 1;
      totalValueVnd += val;
      if (val > maxValueVnd) {
        maxValueVnd = val;
        highestValuationItem = {
          title: item.title,
          marketValue: item.marketValue || '',
          numericValue: val,
          creatorName: item.creatorName,
        };
      }
    }
  });

  const avgValueVnd = totalCount > 0 ? Math.round(totalValueVnd / totalCount) : 0;

  const formatCompactVndFull = (num: number): string => {
    if (num === 0) return '0 VNĐ';
    if (num >= 1000000000) {
      const ty = (num / 1000000000).toFixed(2).replace(/\.00$/, '').replace('.', ',');
      return `${num.toLocaleString('vi-VN')} VNĐ (${ty} Tỷ)`;
    }
    if (num >= 1000000) {
      const treu = (num / 1000000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
      return `${num.toLocaleString('vi-VN')} VNĐ (${treu} Triệu)`;
    }
    return `${num.toLocaleString('vi-VN')} VNĐ`;
  };

  return {
    totalCount,
    totalValueVnd,
    avgValueVnd,
    maxValueVnd,
    formattedTotalVnd: formatCompactVndFull(totalValueVnd),
    formattedAvgVnd: formatCompactVndFull(avgValueVnd),
    formattedMaxVnd: formatCompactVndFull(maxValueVnd),
    highestValuationItem,
  };
}

/**
 * Aggregates stats grouped by user / creator
 */
export function aggregateUserValuationStats(items: SavedQR[]): UserValuationStat[] {
  const userMap: { [username: string]: { count: number; valCount: number; totalVal: number } } = {};

  items.forEach((item) => {
    const user = item.creatorName?.trim() || 'Chưa định danh';
    if (!userMap[user]) {
      userMap[user] = { count: 0, valCount: 0, totalVal: 0 };
    }
    userMap[user].count += 1;
    const num = parseMarketValueToNumber(item.marketValue);
    if (num > 0) {
      userMap[user].valCount += 1;
      userMap[user].totalVal += num;
    }
  });

  return Object.entries(userMap).map(([username, data]) => {
    const avg = data.valCount > 0 ? Math.round(data.totalVal / data.valCount) : 0;
    return {
      username,
      count: data.count,
      valuationCount: data.valCount,
      totalValueVnd: data.totalVal,
      totalValueBillion: Number((data.totalVal / 1_000_000_000).toFixed(2)),
      avgValueVnd: avg,
      formattedTotal: formatVndCompact(data.totalVal),
      formattedAvg: formatVndCompact(avg),
    };
  }).sort((a, b) => b.totalValueVnd - a.totalValueVnd || b.count - a.count);
}

/**
 * Aggregates items by price bracket
 */
export function aggregatePriceSegments(items: SavedQR[]): PriceSegmentStat[] {
  const segments = [
    { name: '< 1 Tỷ', range: 'Dưới 1 Tỷ VNĐ', min: 0, max: 1_000_000_000, count: 0, totalValue: 0, color: '#3B82F6' },
    { name: '1 - 3 Tỷ', range: '1.000.000.000 - 3.000.000.000 VNĐ', min: 1_000_000_000, max: 3_000_000_000, count: 0, totalValue: 0, color: '#10B981' },
    { name: '3 - 5 Tỷ', range: '3.000.000.000 - 5.000.000.000 VNĐ', min: 3_000_000_000, max: 5_000_000_000, count: 0, totalValue: 0, color: '#F59E0B' },
    { name: '5 - 10 Tỷ', range: '5.000.000.000 - 10.000.000.000 VNĐ', min: 5_000_000_000, max: 10_000_000_000, count: 0, totalValue: 0, color: '#8B5CF6' },
    { name: '> 10 Tỷ', range: 'Trên 10 Tỷ VNĐ', min: 10_000_000_000, max: Infinity, count: 0, totalValue: 0, color: '#EC4899' },
  ];

  let totalItemsWithVal = 0;
  items.forEach((item) => {
    const val = parseMarketValueToNumber(item.marketValue);
    if (val > 0) {
      totalItemsWithVal += 1;
      for (const seg of segments) {
        if (val >= seg.min && (val < seg.max || seg.max === Infinity)) {
          seg.count += 1;
          seg.totalValue += val;
          break;
        }
      }
    }
  });

  return segments.map((seg) => ({
    ...seg,
    percentage: totalItemsWithVal > 0 ? Math.round((seg.count / totalItemsWithVal) * 100) : 0,
  }));
}

/**
 * Aggregates time series stats (by date)
 */
export function aggregateTimeSeriesStats(items: SavedQR[]): TimeSeriesStat[] {
  const map: { [dateStr: string]: { count: number; valueVnd: number; timestamp: number } } = {};

  items.forEach((item) => {
    let timestamp = Date.now();
    if (typeof item.createdAt === 'number' && !isNaN(item.createdAt)) {
      timestamp = item.createdAt;
    } else if (typeof item.createdAt === 'string') {
      const p = Date.parse(item.createdAt);
      if (!isNaN(p)) timestamp = p;
    } else if (typeof item.createdAt === 'object' && item.createdAt !== null) {
      const anyObj = item.createdAt as any;
      if (typeof anyObj.toMillis === 'function') timestamp = anyObj.toMillis();
      else if (typeof anyObj.seconds === 'number') timestamp = anyObj.seconds * 1000;
    }

    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return;
    
    // Format YYYY-MM-DD safely
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (!map[dateStr]) {
      map[dateStr] = { count: 0, valueVnd: 0, timestamp: d.getTime() };
    }
    map[dateStr].count += 1;
    const val = parseMarketValueToNumber(item.marketValue);
    map[dateStr].valueVnd += val;
  });

  const sortedDates = Object.keys(map).sort();
  return sortedDates.map((dateStr) => {
    const entry = map[dateStr];
    const parts = dateStr.split('-');
    const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
    return {
      date: dateStr,
      displayDate,
      count: entry.count,
      valueVnd: entry.valueVnd,
      valueBillion: Number((entry.valueVnd / 1_000_000_000).toFixed(2)),
    };
  });
}

