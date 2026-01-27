import { supabase } from '../services/supabase.js';

export const createDriver = async (req, res) => {
    const { email, password, name, photo_url, moto_brand, moto_model, moto_color, moto_plate, pix_key, pix_key_type, user_id } = req.body || {};

    // Support an admin-update flow: if `user_id` is provided we treat this as
    // an update of existing profile/driver (no email/password required).
    const isUpdate = !!user_id && (!email && !password);

    if (!isUpdate && (!email || !password || !name)) {
        return res.status(400).json({ error: 'email, password and name are required' });
    }

    try {
        let userId = user_id;

        // If this is an update request, just update the existing records
        if (isUpdate) {
            try {
                // Patch profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ name: name || null, photo_url: photo_url || null })
                    .eq('id', userId);

                if (profileError) throw profileError;

                // Patch driver (if exists)
                const { error: driverError } = await supabase
                    .from('drivers')
                    .update({
                        moto_brand: moto_brand || null,
                        moto_model: moto_model || null,
                        moto_color: moto_color || null,
                        moto_plate: moto_plate || null,
                        pix_key: pix_key || null,
                        pix_key_type: pix_key_type || null
                    })
                    .eq('user_id', userId);

                if (driverError) throw driverError;

                return res.json({ ok: true, userId });
            } catch (updateErr) {
                console.error('update error', updateErr);
                return res.status(500).json({ error: updateErr.message || 'Error updating driver' });
            }
        }

        // CREATE NEW DRIVER FLOW
        // 1) create user via admin API
        try {
            const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name, avatar_url: photo_url }
            });
            if (createUserError) throw createUserError;

            userId = userData?.id || userData?.user?.id || userData?.user?.sub || userData?.sub;
            if (!userId) {
                console.error('createUser response did not include id:', JSON.stringify(userData));
                throw new Error('user id not returned');
            }
        } catch (createErr) {
            if (createErr?.code === 'email_exists' || createErr?.status === 422 || (createErr?.message || '').includes('already been registered')) {
                console.warn('createUser: email already exists, attempting to lookup existing user');
                const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
                if (listErr) throw listErr;

                const candidates = usersList?.users || usersList || [];
                const existing = candidates.find(u => u.email === email || u.user?.email === email || u.email === email);
                userId = existing?.id || existing?.user?.id || existing?.sub || existing?.user?.sub;
                if (!userId) {
                    console.error('Could not find existing user for email:', email);
                    throw createErr;
                }
            } else {
                throw createErr;
            }
        }

        // 2) ensure profile exists
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: userId, name, photo_url: photo_url || null })
            .select();
        if (profileError) throw profileError;

        // 3) ensure driver record exists
        const { data: existingDriver } = await supabase
            .from('drivers')
            .select('*')
            .eq('user_id', userId)
            .limit(1);

        if (!existingDriver || existingDriver.length === 0) {
            const { error: driverError } = await supabase
                .from('drivers')
                .insert({
                    user_id: userId,
                    status: 'idle', // Fixed: 'approved' does not exist in enum
                    is_online: false,
                    moto_brand: moto_brand || null,
                    moto_model: moto_model || null,
                    moto_color: moto_color || null,
                    moto_plate: moto_plate || null,
                    pix_key: pix_key || null,
                    pix_key_type: pix_key_type || null
                })
                .select();
            if (driverError) throw driverError;
        } else {
            // Update existing driver with moto details
            const { error: updateDriverError } = await supabase
                .from('drivers')
                .update({
                    moto_brand: moto_brand || null,
                    moto_model: moto_model || null,
                    moto_color: moto_color || null,
                    moto_plate: moto_plate || null,
                    pix_key: pix_key || null,
                    pix_key_type: pix_key_type || null,
                    status: 'idle'
                })
                .eq('user_id', userId);
            if (updateDriverError) throw updateDriverError;
        }

        // 4) ensure user_roles contains driver role
        const { data: existingRole } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('role', 'driver')
            .limit(1);

        if (!existingRole || existingRole.length === 0) {
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({ user_id: userId, role: 'driver' })
                .select();
            if (roleError) throw roleError;
        }

        return res.json({ ok: true, userId });
    } catch (err) {
        console.error('create-driver error', err);
        return res.status(500).json({ error: err.message || err });
    }
};
