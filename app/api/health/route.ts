import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../lib/db';

export async function GET() {
  try {
    await connectToDatabase();

    return NextResponse.json({
      success: true,
      message: 'MongoDB connected successfully!',
      database: mongoose.connection.name,
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed. Check server logs.',
      },
      { status: 500 },
    );
  }
}
