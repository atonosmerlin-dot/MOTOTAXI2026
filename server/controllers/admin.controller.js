import { supabase } from '../services/supabase.js';

export const createDriver = async (req, res) => {
    const { email, password, name, moto_brand, moto_model, moto_plate, pix_key, pix_key_type, photo_url } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password e nome são obrigatórios' });
    }

    try {
        // 1. Create Auth User
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, avatar_url: photo_url }
        });

        if (userError) throw userError;
        const userId = userData.user.id;

        // 2. Update Profile (Trigger might create it, but we update name/role)
        // Wait a bit or upsert. Best to upsert.

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                name,
                role: 'driver', // Ensure role is driver
                photo_url: photo_url
            });

        if (profileError) {
            console.error('Error updating profile:', profileError);
            // Don't fail entire request if profile update fails, but warn.
        }

        // 3. Create Driver Record
        // Check if driver record exists (unlikely for new user)
        const { error: driverError } = await supabase
            .from('drivers')
            .upsert({
                user_id: userId,
                status: 'approved', // Auto-approve if created by admin
                is_online: false,
                moto_brand,
                moto_model,
                moto_plate,
                pix_key,
                pix_key_type
            });

        if (driverError) throw driverError;

        return res.status(200).json({ success: true, userId });

    } catch (error) {
        console.error('Error creating driver:', error);
        return res.status(500).json({ error: error.message || 'Erro interno ao criar motorista' });
    }
};
