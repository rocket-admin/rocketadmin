import { generateURI } from 'otplib';
import QRCode from 'qrcode';

export async function generateQRCode(userEmail: string, secretKey: string) {
	const service = 'Rocketadmin';
	const otpauth = generateURI({ issuer: service, label: userEmail, secret: secretKey });
	const qrCode = await QRCode.toDataURL(otpauth);
	return { qrCode, otpauth };
}
