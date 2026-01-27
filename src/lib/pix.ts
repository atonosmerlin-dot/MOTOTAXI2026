export class Pix {
    public static payload(key: string, name: string, city: string, amount: number, txId: string = 'MOTOPOINT'): string {
        const keyStr = this.formatField('01', key);
        const accountInfo = this.formatField('26', `0014BR.GOV.BCB.PIX${keyStr}`);
        const category = this.formatField('52', '0000');
        const currency = this.formatField('53', '986');
        const amountStr = this.formatField('54', amount.toFixed(2));
        const country = this.formatField('58', 'BR');
        const nameStr = this.formatField('59', this.normalize(name).substring(0, 25));
        const cityStr = this.formatField('60', this.normalize(city).substring(0, 15));
        const tx = this.formatField('62', this.formatField('05', txId));

        const payload = `000201${accountInfo}${category}${currency}${amountStr}${country}${nameStr}${cityStr}${tx}6304`;

        const crc = this.crc16(payload);
        return `${payload}${crc}`;
    }

    private static formatField(id: string, value: string): string {
        const len = value.length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    }

    private static normalize(str: string): string {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }

    private static crc16(payload: string): string {
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0)
                    crc = (crc << 1) ^ 0x1021;
                else
                    crc = crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }
}
