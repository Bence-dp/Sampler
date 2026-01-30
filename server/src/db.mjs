import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bence:bence@clusterweb.pqmykue.mongodb.net/samplerDB?appName=ClusterWEB';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas - samplerDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export function disconnectDB() {
  return mongoose.disconnect();
}
