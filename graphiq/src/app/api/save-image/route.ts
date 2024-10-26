import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    // Remove the data URL prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "")

    // Create a buffer from the base64 string
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate a unique filename
    const fileName = `drawing.png`

    // Define the path where the image will be saved
    const filePath = path.join(process.cwd(), 'public', fileName)

    // Write the file
    fs.writeFileSync(filePath, buffer)

    // Return success response
    return NextResponse.json({ success: true, fileName }, { status: 200 })
  } catch (error) {
    console.error('Error saving image:', error)
    return NextResponse.json({ success: false, error: 'Failed to save image' }, { status: 500 })
  }
}