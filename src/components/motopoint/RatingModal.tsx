import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RatingModalProps {
    open: boolean;
    onClose: () => void;
    rideId: string;
    driverId: string;
    driverName?: string;
    clientId: string; // The person rating (user)
}

const RatingModal: React.FC<RatingModalProps> = ({ open, onClose, rideId, driverId, driverName, clientId }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Por favor, selecione uma nota de 1 a 5 estrelas');
            return;
        }

        setLoading(true);
        try {
            // @ts-ignore
            const { error } = await supabase
                .from('ratings')
                .insert({
                    ride_id: rideId,
                    rater_id: clientId,
                    rated_id: driverId,
                    rating,
                    comment: comment.trim() || null
                });

            if (error) throw error;

            toast.success('Avaliação enviada com sucesso! ⭐');
            onClose();
        } catch (error) {
            console.error('Error submitting rating:', error);
            toast.error('Erro ao enviar avaliação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl">Como foi sua corrida?</DialogTitle>
                    <DialogDescription className="text-center">
                        Avalie o motorista <span className="font-bold text-foreground">{driverName || 'Parceiro'}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-6">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="transition-transform hover:scale-110 focus:outline-none"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            >
                                <Star
                                    size={40}
                                    className={`${(hoverRating || rating) >= star
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'fill-slate-100 text-slate-300'
                                        } transition-colors duration-200`}
                                />
                            </button>
                        ))}
                    </div>

                    <div className="w-full space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Comentário (opcional)</label>
                        <Textarea
                            placeholder="O motorista foi rápido e educado..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="w-full" onClick={onClose} disabled={loading}>
                        Pular
                    </Button>
                    <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Enviar Avaliação'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default RatingModal;
