import { WholesaleEnquiry } from '@/lib/types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase Database connection is unavailable. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are properly configured.'
    );
  }
  return client;
}

export function mapRowToWholesaleEnquiry(row: any): WholesaleEnquiry {
  return {
    id: row.id,
    customerName: row.customer_name || row.customerName || 'Valued Partner',
    businessName: row.business_name || row.businessName || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || row.phone || '',
    email: row.email || '',
    city: row.city || '',
    state: row.state || '',
    productsRequired: row.products || row.products_required || row.productsRequired || '',
    approxQuantity: row.requested_quantity || row.approx_quantity || row.approxQuantity || '',
    enquiryType: row.enquiry_type || row.enquiryType || 'wholesale',
    notes: row.notes || '',
    status: row.status || 'NEW',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapWholesaleEnquiryToRow(e: WholesaleEnquiry) {
  return {
    id: e.id,
    customer_name: e.customerName,
    business_name: e.businessName || null,
    phone: e.phone,
    whatsapp: e.whatsapp || e.phone,
    email: e.email || null,
    city: e.city || null,
    state: e.state || null,
    products: e.productsRequired,
    quantity: e.approxQuantity,
    requested_quantity: e.approxQuantity,
    enquiry_type: e.enquiryType || 'wholesale',
    notes: e.notes || null,
    status: e.status,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

export interface GetWholesaleEnquiriesPaginatedParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaginatedWholesaleResult {
  enquiries: WholesaleEnquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getWholesaleEnquiriesPaginated(
  params: GetWholesaleEnquiriesPaginatedParams = {}
): Promise<PaginatedWholesaleResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status && params.status !== 'ALL' ? params.status.trim() : undefined;
  const search = params.search ? params.search.trim() : undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    let all = await getWholesaleEnquiries();
    if (status) {
      all = all.filter((e) => e.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (e) =>
          e.customerName.toLowerCase().includes(q) ||
          (e.businessName && e.businessName.toLowerCase().includes(q)) ||
          e.phone.includes(q) ||
          e.productsRequired.toLowerCase().includes(q)
      );
    }
    const total = all.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = all.slice(offset, offset + limit);
    return { enquiries: paginated, total, page, limit, totalPages };
  }

  try {
    let query = supabase
      .from('wholesale_enquiries')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,business_name.ilike.%${search}%,phone.ilike.%${search}%,products.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.warn(`Supabase query warning [getWholesaleEnquiriesPaginated]: ${error.message}`);
      return { enquiries: [], total: 0, page, limit, totalPages: 1 };
    }

    const total = count ?? (data ? data.length : 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const enquiries = (data || []).map(mapRowToWholesaleEnquiry);

    return { enquiries, total, page, limit, totalPages };
  } catch (err: any) {
    console.error('getWholesaleEnquiriesPaginated error:', err?.message);
    return { enquiries: [], total: 0, page, limit, totalPages: 1 };
  }
}

export async function getWholesaleEnquiries(): Promise<WholesaleEnquiry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('wholesale_enquiries').select('*').order('created_at', { ascending: false });
  if (error) {
    console.warn(`Supabase query warning [wholesale_enquiries]: ${error.message}`);
    return [];
  }
  if (!data) return [];
  return data.map(mapRowToWholesaleEnquiry);
}

export async function saveWholesaleEnquiry(data: Partial<WholesaleEnquiry>): Promise<WholesaleEnquiry> {
  const supabase = requireSupabaseAdmin();
  const now = new Date().toISOString();

  if (!data.customerName || !data.customerName.trim()) {
    throw new Error('Full Name is required.');
  }
  if (!data.phone || !data.phone.trim()) {
    throw new Error('Phone Number is required.');
  }
  if (!data.productsRequired || !data.productsRequired.trim()) {
    throw new Error('Products required field is required.');
  }
  const enquiryType = data.enquiryType ? data.enquiryType.trim() : 'wholesale';
  const isBulkOrWholesale = ['wholesale', 'bulk_order', 'bulk_inquiry'].includes(enquiryType);

  if (isBulkOrWholesale && (!data.approxQuantity || !data.approxQuantity.trim())) {
    throw new Error('Approximate quantity field is required.');
  }

  const enquiry: WholesaleEnquiry = {
    id: data.id || `ws-${Date.now()}`,
    customerName: data.customerName.trim(),
    businessName: data.businessName ? data.businessName.trim() : '',
    phone: data.phone.trim(),
    whatsapp: data.whatsapp ? data.whatsapp.trim() : data.phone.trim(),
    email: data.email ? data.email.trim() : '',
    city: data.city ? data.city.trim() : '',
    state: data.state ? data.state.trim() : '',
    productsRequired: data.productsRequired.trim(),
    approxQuantity: data.approxQuantity ? data.approxQuantity.trim() : '',
    enquiryType: enquiryType,
    notes: data.notes ? data.notes.trim() : '',
    status: data.status || 'NEW',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const row = mapWholesaleEnquiryToRow(enquiry);
  const { error } = await supabase.from('wholesale_enquiries').upsert([row]);
  if (error) {
    throw new Error(`Database error saving wholesale enquiry: ${error.message}`);
  }

  return enquiry;
}

export async function updateWholesaleEnquiryStatus(
  id: string,
  status: WholesaleEnquiry['status']
): Promise<WholesaleEnquiry | null> {
  const supabase = requireSupabaseAdmin();
  
  const { data: existingRow, error: fetchErr } = await supabase
    .from('wholesale_enquiries')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existingRow) {
    throw new Error(`Wholesale enquiry "${id}" not found.`);
  }

  const existing = mapRowToWholesaleEnquiry(existingRow);
  const updated: WholesaleEnquiry = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };

  const row = mapWholesaleEnquiryToRow(updated);
  const { error } = await supabase.from('wholesale_enquiries').update(row).eq('id', id);
  if (error) {
    throw new Error(`Database error updating wholesale enquiry: ${error.message}`);
  }

  return updated;
}

export async function deleteWholesaleEnquiry(id: string): Promise<boolean> {
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from('wholesale_enquiries').delete().eq('id', id);
  if (error) {
    throw new Error(`Database error deleting wholesale enquiry: ${error.message}`);
  }
  return true;
}
