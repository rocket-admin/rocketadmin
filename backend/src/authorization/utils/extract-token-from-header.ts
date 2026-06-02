import { Request } from 'express';
export const extractTokenFromHeader = (request: Pick<Request, 'headers'>): string | null => {
	const [type, token] = request.headers.authorization?.split(' ') ?? [];
	return type === 'Bearer' ? token : null;
};
