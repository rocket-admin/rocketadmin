import QRCode from 'qrcode';
import { authenticator } from 'otplib';

export async function generateQRCode(userEmail: string, secretKey: string) {
  const service = 'Rocketadmin';
  const otpauth = authenticator.keyuri(userEmail, service, secretKey);
  const qrCode = await QRCode.toDataURL(otpauth);
  return { qrCode, otpauth };
}
