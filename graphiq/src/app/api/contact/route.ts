import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, email, message } = req.body

    // Here, you would typically send an email or save the message to a database
    // For this example, we'll just log the data and return a success response
    console.log('Received contact form submission:', { name, email, message })

    // Simulate an API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Send a success response
    res.status(200).json({ message: 'Message sent successfully' })
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}