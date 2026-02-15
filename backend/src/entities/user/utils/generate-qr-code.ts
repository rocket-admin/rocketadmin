import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function generateQRCode(userEmail: string, secretKey: string) {
	const service = 'Rocketadmin';
	const otpauth = authenticator.keyuri(userEmail, service, secretKey);
	const qrCode = await QRCode.toDataURL(otpauth);
	return { qrCode, otpauth };
}
