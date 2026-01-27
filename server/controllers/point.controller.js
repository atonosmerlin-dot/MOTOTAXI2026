import { supabase } from '../services/supabase.js';

export const getPoint = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
        const { data: point, error: pointErr } = await supabase
            .from('fixed_points')
            .select('*, name, address, latitude, longitude, is_active')
            .eq('id', id)
            .maybeSingle();
        if (pointErr) throw pointErr;
        if (!point) return res.status(404).json({ error: 'not found' });
        return res.json(point);
    } catch (err) {
        console.error('api/point error', err);
        return res.status(500).json({ error: err.message || err });
    }
};
