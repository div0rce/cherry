import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { prisma } from '@/lib/prisma';
import { generateCherryPass } from '@/lib/wallet/cherryPass';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      const userName = user?.name ?? 'Cherry Member';
      const cherryPoints = 0; // placeholder until points tracked in DB

      const pkpassBuffer = await generateCherryPass({
        userId,
        userName,
        cherryPoints,
      });

      return new NextResponse(pkpassBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': 'attachment; filename="cherry.pkpass"',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      logError('Error generating Cherry Pass', error);
      return NextResponse.json(
        {
          error:
            'Cherry Wallet pass generation is not available in this environment. Apple Developer configuration is incomplete.',
        },
        { status: 501 }
      );
    }
  });
}
