import QRCode from 'qrcode';

export async function generateQRCode(secretKey: string) {
  const label = 'Rocketadmin';
  const issuer = 'Rocketadmin';
  const otpAuthUrl = `otpauth://totp/${label}?secret=${secretKey}&issuer=${issuer}`;
  const qrCode = await QRCode.toDataURL(otpAuthUrl);
  return qrCode;
}
