import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FixedPoint {
  id: string;
  name: string;
  address: string;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
  zone_prices?: Array<{
    id: string;
    valor: number;
    ponto_id: string;
    zona_id: string;
    zones_destino?: { id: string; nome: string; descricao?: string; ativo?: boolean };
  }>;
}

export const useFixedPoints = () => {
  return useQuery({
    queryKey: ['fixed_points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_points')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as FixedPoint[];
    }
  });
};

export const useFixedPoint = (pointId: string | undefined) => {
  return useQuery({
    queryKey: ['fixed_point', pointId],
    queryFn: async () => {
      if (!pointId) return null;
      const { getServerOrigin } = await import('@/lib/utils');
      const serverOrigin = getServerOrigin();
      try {
        const resp = await fetch(serverOrigin + '/api/point/' + pointId);
        if (resp.ok) {
          return (await resp.json()) as FixedPoint | null;
        }
      } catch (e) {
        // fallback to supabase query if server not available
      }

      const { data, error } = await supabase
        .from('fixed_points')
        .select('*')
        .eq('id', pointId)
        .maybeSingle();
      
      if (error) throw error;
      return data as FixedPoint | null;
    },
    enabled: !!pointId
  });
};

export const useCreatePoint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, address, latitude, longitude }: { name: string; address: string; latitude?: number; longitude?: number }) => {
      const insertBody: any = { name, address };
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        insertBody.latitude = latitude;
        insertBody.longitude = longitude;
      }
      // default active
      insertBody.is_active = true;

      const { data, error } = await supabase
        .from('fixed_points')
        .insert(insertBody)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_points'] });
    }
  });
};

export const useDeletePoint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pointId: string) => {
      const { error } = await supabase
        .from('fixed_points')
        .delete()
        .eq('id', pointId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed_points'] });
    }
  });
};
