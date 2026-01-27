import { supabase } from '../services/supabase.js';

const RIDE_TTL_SECONDS = parseInt(process.env.RIDE_TTL_SECONDS || '60', 10);

export const startRideCleanupJob = () => {
    console.log('[CRON] Starting Ride Cleanup Job...');

    // 1. Expire pending rides (fast loop)
    setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - RIDE_TTL_SECONDS * 1000).toISOString();
            const { data: expired, error } = await supabase
                .from('ride_requests')
                .update({ status: 'cancelled' })
                .lt('created_at', cutoff)
                .eq('status', 'pending')
                .select();
            if (error) throw error;
            if (expired && expired.length) console.log('Expired rides:', expired.map(r => r.id));
        } catch (e) {
            console.error('Error expiring rides', e);
        }
    }, Math.max(10000, Math.floor(RIDE_TTL_SECONDS / 3) * 1000));

    // 2. Hard Delete old rides (every 1 hour)
    const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    const RETENTION_HOURS = 24;

    const cleanOldData = async () => {
        try {
            const retentionCutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();

            // Delete old processed rides
            const { count, error } = await supabase
                .from('ride_requests')
                .delete({ count: 'exact' })
                .lt('created_at', retentionCutoff)
                .neq('status', 'pending'); // Don't delete pending if for some reason they exist (though they should be expired)

            if (error) throw error;
            if (count > 0) console.log(`[CRON] Cleaned ${count} old rides from database.`);
        } catch (e) {
            console.error('[CRON] Error cleaning old data:', e);
        }
    };

    // Run once on start, then interval
    cleanOldData();
    setInterval(cleanOldData, CLEANUP_INTERVAL);
};
