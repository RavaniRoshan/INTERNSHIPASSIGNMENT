import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - could be extended to check dependencies
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Creator Portfolio Hub Frontend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}