import { supabase } from '@/integrations/supabase/client';

type SiteConfigMap = Record<string, string>;

export const getSiteConfigs = async (keys?: string[]): Promise<SiteConfigMap> => {
  try {
    let query = supabase.from('site_config').select('key,value');
    if (keys && keys.length > 0) {
      query = query.in('key', keys as any);
    }
    const { data, error } = await query;
    if (error) throw error;
    const map: SiteConfigMap = {};
    (data || []).forEach((r: any) => {
      map[r.key] = r.value;
    });
    return map;
  } catch (e) {
    console.warn('getSiteConfigs error', e);
    return {};
  }
};

export const upsertSiteConfig = async (key: string, value: string) => {
  try {
    const { error } = await supabase.from('site_config').upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('upsertSiteConfig error', e);
    return false;
  }
};

export const upsertManySiteConfigs = async (pairs: Record<string, string>) => {
  try {
    const rows = Object.entries(pairs).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('site_config').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('upsertManySiteConfigs error', e);
    return false;
  }
};

export default {
  getSiteConfigs,
  upsertSiteConfig,
  upsertManySiteConfigs,
};
