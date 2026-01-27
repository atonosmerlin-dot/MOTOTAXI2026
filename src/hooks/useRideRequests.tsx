import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { getServerOrigin } from '@/lib/utils';

export interface RideRequest {
  id: string;
  point_id: string;
  client_id: string | null;
  client_name?: string;
  destination_address?: string;
  client_whatsapp?: string;
  client_latitude?: number | null;
  client_longitude?: number | null;
  client_accuracy?: number | null;
  client_location_address?: string | null;
  driver_id: string | null;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  price?: number;
  created_at: string;
  updated_at: string;
  point?: {
    name: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    is_active?: boolean;
  };
  driver?: {
    id: string;
    profile?: {
      name: string;
      photo_url: string | null;
    };
  };
}

const fetchApi = async (path: string, init: RequestInit) => {
  const origin = getServerOrigin();
  const isDev = import.meta.env.DEV;

  // Build candidates based on environment
  const candidates: string[] = [];

  if (isDev) {
    // Dev: try server endpoints
    candidates.push(`${origin}/${path}`);
    candidates.push(`${origin}/api/${path}`);
    candidates.push(`${origin}/_/functions/api/${path}`);
  } else {
    // Production: try /api/ route FIRST (works better on Cloudflare Pages)
    candidates.push(`/api/${path}`);
    candidates.push(`/_/functions/api/${path}`);
    candidates.push(`/${path}`);
  }

  let lastErr: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, init);
      // Success: 2xx status
      if (res.ok) {
        return res;
      }
      // 405: Method not allowed - try next route
      // 404: Not found - try next route
      if (res.status === 405 || res.status === 404) {
        console.debug(`[FETCH-API] ${url} returned ${res.status}, trying next candidate...`);
        lastErr = new Error(`${url}: ${res.status}`);
        continue;
      }
      // Other errors: don't continue, this is a real error
      lastErr = new Error(`${url}: ${res.status}`);
      throw lastErr;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Could not fetch ${path}`);
};

// Optimized: Single query for all pending rides
export const usePendingRequests = (driverId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!driverId) return;

    const channel = supabase
      .channel('pending-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_requests',
          filter: 'status=eq.pending'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending_requests', driverId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, driverId]);

  return useQuery({
    queryKey: ['pending_requests', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude, is_active)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as any[]) as RideRequest[];
    },
    enabled: !!driverId,
    refetchInterval: 3000,
    staleTime: 2000,
  });
};

// Optimized: Single query for active client request
export const useClientActiveRequest = (clientId: string, pointId: string) => {
  return useQuery({
    queryKey: ['my_active_request', clientId, pointId],
    queryFn: async () => {
      // Map 'direct' to the actual UUID used for direct calls
      const actualPointId = pointId === 'direct'
        ? '550e8400-e29b-41d4-a716-446655440000'
        : pointId;

      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude)
        `)
        .eq('client_id', clientId)
        .eq('point_id', actualPointId)
        // Only fetch active requests; completed/cancelled are handled via separate check below
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      // Fetch proposals separately if pending
      const proposals = data.status === 'pending'
        ? await supabase.from('ride_proposals').select('*').eq('ride_id', data.id)
        : { data: null };

      // Fetch driver separately if accepted
      let driver = null;
      if (data.status === 'accepted' && data.driver_id) {
        const driverResult = await supabase
          .from('drivers')
          .select(`
            id,
            moto_brand,
            moto_model,
            moto_color,
            moto_plate,
            user_id
          `)
          .eq('id', data.driver_id)
          .maybeSingle();

        if (driverResult.data) {
          // Fetch profile using the driver's user_id
          const profileResult = await supabase
            .from('profiles')
            .select('id, name, photo_url')
            .eq('id', driverResult.data.user_id)
            .maybeSingle();

          driver = {
            ...driverResult.data,
            profile: profileResult.data
          };
        }
      }

      return {
        ...data,
        proposals: proposals.data || [],
        driver
      } as any;
    },
    enabled: !!clientId && !!pointId,
    refetchInterval: 3000,
    staleTime: 2000,
  });
};

// Optimized: Single query for driver active request
export const useMyActiveRequest = (driverId: string) => {
  return useQuery({
    queryKey: ['my_active_request', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          point:fixed_points(name, address, latitude, longitude)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as any) as RideRequest | null;
    },
    enabled: !!driverId,
    refetchInterval: 3000,
    staleTime: 2000,
  });
};

export const useCreateRideRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      pointId: string;
      pointName?: string;
      clientId: string;
      clientName?: string;
      destinationAddress?: string;
      clientWhatsapp?: string;
      clientLatitude?: number;
      clientLongitude?: number;
      clientAccuracy?: number;
      clientLocationAddress?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('ride_requests')
        .insert({
          point_id: vars.pointId,
          client_id: vars.clientId,
          client_name: vars.clientName || null,
          destination_address: vars.destinationAddress || null,
          client_whatsapp: vars.clientWhatsapp || null,
          client_latitude: vars.clientLatitude || null,
          client_longitude: vars.clientLongitude || null,
          client_accuracy: vars.clientAccuracy || null,
          client_location_address: vars.clientLocationAddress || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Notify available drivers about the new ride request
      try {
        // ✅ SIMPLER: Just send ride_request_id to API
        // API will handle all database queries (drivers, subscriptions, etc)
        console.log(`[CREATE-RIDE] 📤 Notificando motoristas sobre corrida ${data.id}...`);

        const response = await fetchApi('notify-available-drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ride_request_id: data.id,
            point_id: vars.pointId,
            point_name: vars.pointName || 'um ponto',
            destination: vars.destinationAddress || 'Destino não informado',
            client_name: vars.clientName || 'Cliente'
          })
        });

        const result = await response.json();

        // ✅ BETTER ERROR HANDLING with observability
        console.log('[CREATE-RIDE] 📊 API Response:', {
          ok: response.ok,
          status: response.status,
          sent: result.sent,
          failed: result.failed,
          total: result.total,
          message: result.message,
          timestamp: new Date().toISOString()
        });

        if (!response.ok) {
          console.error('[CREATE-RIDE] ❌ API error:', result.error || 'Unknown error');
        } else if (result.total === 0) {
          console.warn('[CREATE-RIDE] ⚠️ AVISO: Nenhum motorista online disponível!');
          console.log('[CREATE-RIDE] Detalhes:', {
            drivers_online: result.drivers_online || 0,
            subscriptions_found: result.subscriptions_found || 0
          });
        } else if (result.sent === 0) {
          console.error('[CREATE-RIDE] ❌ ERRO: Motoristas online mas nenhuma notificação enviada!');
          console.log('[CREATE-RIDE] Possíveis causas:', {
            subscriptions_count: result.subscriptions_found,
            failed_count: result.failed,
            failed_reasons: result.failed_reasons || [],
            drivers_online: result.drivers_online
          });
        } else {
          console.log(`[CREATE-RIDE] ✅ Sucesso! Notificações enviadas: ${result.sent}/${result.total}`);
        }
      } catch (e) {
        console.error('[CREATE-RIDE] 🔥 Exception ao notificar motoristas:', {
          message: e instanceof Error ? e.message : String(e),
          type: typeof e,
          timestamp: new Date().toISOString()
        });
        // Don't throw - ride was created successfully, just logging notification failure
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests'] });
    }
  });
};

export const useProposePrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string; price: number }) => {
      const resp = await fetchApi('propose-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });

      if (!resp.ok) throw new Error('Failed to propose price');
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
    }
  });
};

export const useRespondProposal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { proposalId: string; response: 'accepted' | 'rejected' }) => {
      const resp = await fetchApi('respond-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });

      if (!resp.ok) throw new Error('Failed to respond to proposal');
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
    }
  });
};

export const useAcceptRideRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string }) => {
      const resp = await fetchApi('accept-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });

      if (!resp.ok) throw new Error('Failed to accept ride');
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver_active_request'] });
    }
  });
};

export const useRejectRideRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string }) => {
      const resp = await fetchApi('reject-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });

      if (!resp.ok) throw new Error('Failed to reject ride');
      return resp.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
    }
  });
};

export const useCompleteRideRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string }) => {
      const { data, error } = await supabase
        .from('ride_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', vars.requestId)
        .select()
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
    onSuccess: (_data, variables) => {
      // Invalidate both driver-scoped and global keys to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['my_active_request', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['my_active_request'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['pending_requests', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['pending_requests'], exact: false });
    }
  });
};

export const useUpdateRidePrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: { requestId: string; driverId: string; price: number }) => {
      const resp = await fetchApi('update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars)
      });

      if (!resp.ok) throw new Error('Failed to update price');
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_active_request'] });
      queryClient.invalidateQueries({ queryKey: ['driver_stats'] });
    }
  });
};
