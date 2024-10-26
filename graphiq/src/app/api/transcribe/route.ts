import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

export async function POST(request: Request) {
  try {
    const formData = new FormData();
    const { audioFile } = await request.json();

    // Add audio file to the form data (assuming audioFile is in base64 format)
    const buffer = Buffer.from(audioFile, 'base64');
    formData.append('file', buffer, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // specify Whisper model

    // Save the audio file for debugging
    const audioFilePath = path.join(process.cwd(), 'public', 'uploads', 'audio.wav'); // adjust path as needed
    fs.mkdirSync(path.dirname(audioFilePath), { recursive: true }); // Ensure the directory exists
    fs.writeFileSync(audioFilePath, buffer); // Save the audio file

    // Call Whisper API
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    });

    const transcription = response.data.text;
    
    // Return the transcription and audio file URL
    return NextResponse.json({ transcription, audioUrl: `/uploads/audio.wav` });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
