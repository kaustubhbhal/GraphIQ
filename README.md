# GraphIQ

---

## Project Overview

GraphIQ is an innovative and interactive AI-powered learning platform that guides students through data structure and algorithm concepts with practice problems, interactive diagrams, and detailed explanations

## Table of Contents

- [Getting Started](#getting-started)
- [Installation](#installation)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [License](#license)

## Getting Started

To get a local copy of the project up and running, follow these simple steps.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   ```

2. Navigate to the project directory:

   ```bash
   cd your-repo-name
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

   ```bash
   cd flask-api
   ```

   ```bash
   pip install -r requirements.txt
   ```

4. Environment Variables

Set the necessary environment variables

    ```bash
    ANTHROPIC_API_KEY=
    GEMINI_API_KEY=
    OPENAI_API_KEY=
    ```

## Development

To run the application in development mode:

```bash
npm run dev
```

Run the flask server (in flask-api directory)
```bash
python app.py
```

The development server will start at [http://localhost:3000](http://localhost:3000). Any changes you make will automatically reload the page.

## Build & Deployment

To build the application for production:

```bash
npm run build
```

This will create an optimized build in the `.next` directory.

To run the production build:

```bash
npm run start
```

The application will run on [http://localhost:3000](http://localhost:3000).

## License

This project is licensed under the APACHE 2.0 License. See the `LICENSE` file for more details.

---
