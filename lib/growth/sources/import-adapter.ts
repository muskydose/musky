import { GrowthMarket, GrowthKeyword, GrowthLead, GrowthCompetitor } from '../types';
import { saveMarketRecord, saveKeywordRecord, saveLeadRecord, saveCompetitorRecord, saveImportJob } from '../growth-db';
import { normalizeIndianState } from '../geography';

export interface ImportResult {
  jobId: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorCount: number;
  errors: string[];
}

/**
 * RFC 4180 Compliant CSV Parser
 * Correctly parses CSV files with quoted strings, embedded commas, and escaped quotes ("")
 */
export function parseCsvRfc4180(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote inside quoted string
          currentVal += '"';
          i++; // Skip next quote
        } else {
          // End of quoted string
          insideQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r') {
        // Skip carriage return
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some((field) => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export async function parseAndImportCsvData(
  importType: 'MARKETS' | 'KEYWORDS' | 'LEADS' | 'COMPETITORS',
  filename: string,
  csvText: string
): Promise<ImportResult> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = new Date().toISOString();

  const parsedMatrix = parseCsvRfc4180(csvText);

  if (parsedMatrix.length <= 1) {
    const result: ImportResult = {
      jobId,
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errorCount: 1,
      errors: ['CSV file is empty or missing header row'],
    };

    await saveImportJob({
      id: jobId,
      importType,
      filename,
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      errorCount: 1,
      status: 'FAILED',
      createdAt: startTime,
      completedAt: new Date().toISOString(),
    });

    return result;
  }

  const header = parsedMatrix[0].map((h) => h.toLowerCase().replace(/^["']|["']$/g, '').trim());
  const dataRows = parsedMatrix.slice(1);

  let importedRows = 0;
  let skippedRows = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowValues = dataRows[i];
    const rowData: Record<string, string> = {};
    header.forEach((h, idx) => {
      rowData[h] = rowValues[idx] || '';
    });

    try {
      if (importType === 'LEADS') {
        const businessName = rowData['business_name'] || rowData['businessname'] || rowData['name'];
        const contactName = rowData['contact_name'] || rowData['contactname'] || rowData['contact'] || 'Unknown Contact';
        const phone = rowData['phone'] || rowData['mobile'] || rowData['whatsapp'] || '';
        
        // ABSOLUTE RULE: Never default state to Rajasthan! Normalize or leave Unknown/NULL.
        const rawState = rowData['state'] || rowData['region'];
        const normalizedSt = normalizeIndianState(rawState);
        const state = normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : 'Unknown State');

        if (!businessName || !phone) {
          skippedRows += 1;
          errors.push(`Row ${i + 2}: Missing business_name or phone number`);
          continue;
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const leadId = `lead_imp_${Date.now()}_${i}`;

        await saveLeadRecord({
          id: leadId,
          businessName,
          contactName,
          phone: cleanPhone,
          whatsapp: rowData['whatsapp'] ? rowData['whatsapp'].replace(/\D/g, '') : cleanPhone,
          email: rowData['email'] || undefined,
          leadType: (rowData['lead_type'] as any) || 'Retailer',
          state,
          district: rowData['district'] || undefined,
          city: rowData['city'] || undefined,
          pincode: rowData['pincode'] || undefined,
          address: rowData['address'] || undefined,
          source: 'CSV Import',
          status: 'New',
          priority: (rowData['priority']?.toUpperCase() as any) || 'MEDIUM',
          notes: rowData['notes'] || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedRows += 1;
      } else if (importType === 'KEYWORDS') {
        const keyword = rowData['keyword'] || rowData['query'] || rowData['search_term'];
        if (!keyword) {
          skippedRows += 1;
          errors.push(`Row ${i + 2}: Missing keyword`);
          continue;
        }

        const rawState = rowData['state'];
        const normalizedSt = normalizeIndianState(rawState);

        const kwId = `kw_imp_${keyword.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const rawVol = rowData['search_volume'] || rowData['volume'];
        const vol = rawVol && rawVol.trim() ? parseInt(rawVol.trim(), 10) : null;
        const rawCpc = rowData['cpc'];
        const parsedCpc = rawCpc && rawCpc.trim() && !isNaN(parseFloat(rawCpc.trim())) ? parseFloat(rawCpc.trim()) : null;
        const rawTrend = rowData['trend']?.toUpperCase()?.trim();
        const trend: 'RISING' | 'STABLE' | 'DECLINING' = (rawTrend === 'RISING' || rawTrend === 'DECLINING') ? rawTrend : (rawTrend === 'FALLING' ? 'DECLINING' : 'STABLE');
        const rawComp = rowData['competition']?.toUpperCase()?.trim();
        const competition: 'LOW' | 'MEDIUM' | 'HIGH' = (rawComp === 'LOW' || rawComp === 'HIGH') ? rawComp : 'MEDIUM';

        await saveKeywordRecord({
          id: kwId,
          keyword: keyword.trim(),
          language: rowData['language'] || 'en',
          country: 'India',
          state: normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : undefined),
          district: rowData['district'] || undefined,
          city: rowData['city'] || undefined,
          category: rowData['category'] || undefined,
          searchVolume: vol !== null && !isNaN(vol) ? vol : null,
          competition,
          cpc: parsedCpc,
          trend,
          sourceTier: 'IMPORTED',
          sourceName: 'CSV Import',
          collectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedRows += 1;
      } else if (importType === 'MARKETS') {
        const rawState = rowData['state'];
        const city = rowData['city'];
        if (!rawState) {
          skippedRows += 1;
          errors.push(`Row ${i + 2}: Missing state`);
          continue;
        }

        const normalizedSt = normalizeIndianState(rawState);
        const stateName = normalizedSt ? normalizedSt.name : rawState.trim();
        const mktId = `mkt_imp_${stateName.toLowerCase().replace(/\s+/g, '_')}_${(city || 'general').toLowerCase().replace(/\s+/g, '_')}`;

        await saveMarketRecord({
          id: mktId,
          country: 'India',
          state: stateName,
          stateCode: normalizedSt?.code,
          city: city || undefined,
          district: rowData['district'] || undefined,
          pincode: rowData['pincode'] || undefined,
          status: 'active',
        });
        importedRows += 1;
      } else if (importType === 'COMPETITORS') {
        const name = rowData['name'] || rowData['competitor'];
        if (!name) {
          skippedRows += 1;
          errors.push(`Row ${i + 2}: Missing competitor name`);
          continue;
        }

        const rawState = rowData['state'];
        const normalizedSt = normalizeIndianState(rawState);

        const compId = `comp_imp_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await saveCompetitorRecord({
          id: compId,
          name: name.trim(),
          website: rowData['website'] || undefined,
          instagram: rowData['instagram'] || undefined,
          facebook: rowData['facebook'] || undefined,
          state: normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : undefined),
          district: rowData['district'] || undefined,
          city: rowData['city'] || undefined,
          productCategories: rowData['categories'] ? rowData['categories'].split(';').map((c) => c.trim()) : [],
          positioning: rowData['positioning'] || undefined,
          notes: rowData['notes'] || undefined,
          sourceTier: 'IMPORTED',
          sourceName: 'CSV Import',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedRows += 1;
      }
    } catch (err: any) {
      errorCount += 1;
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  const finalStatus = errorCount > 0 && importedRows > 0 ? 'PARTIAL' : errorCount > 0 && importedRows === 0 ? 'FAILED' : 'COMPLETED';

  await saveImportJob({
    id: jobId,
    importType,
    filename,
    totalRows: dataRows.length,
    importedRows,
    skippedRows,
    errorCount,
    status: finalStatus,
    createdAt: startTime,
    completedAt: new Date().toISOString(),
  });

  return {
    jobId,
    totalRows: dataRows.length,
    importedRows,
    skippedRows,
    errorCount,
    errors: errors.slice(0, 15),
  };
}
