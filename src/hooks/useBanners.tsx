import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_destination?: string;
  is_active: boolean;
  transition_speed: number;
  is_auto: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all active banners
export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('useBanners fetch error:', error);
        throw error;
      }
      console.log('useBanners fetched:', data?.length || 0, 'banners');
      return (data || []) as Banner[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch all banners (including inactive) for admin
export function useAllBanners() {
  return useQuery({
    queryKey: ['all-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as Banner[];
    },
    staleTime: 1000 * 30, // 30 seconds for admin
  });
}

// Create banner
export function useCreateBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBanner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('banners')
        .insert([newBanner])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner criado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar banner: ${error.message}`);
    },
  });
}

// Update banner
export function useUpdateBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (banner: Banner) => {
      const { data, error } = await supabase
        .from('banners')
        .update(banner)
        .eq('id', banner.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar banner: ${error.message}`);
    },
  });
}

// Delete banner
export function useDeleteBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bannerId: string) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover banner: ${error.message}`);
    },
  });
}

// Toggle banner active status
export function useToggleBannerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bannerId, isActive }: { bannerId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('banners')
        .update({ is_active: isActive })
        .eq('id', bannerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });
}
