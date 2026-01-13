# WorldPulse

An interactive real-time visualization of global news sentiment.

## Setup Instructions

1.  **API Key**: This application requires a Google Gemini API key. 
    Ensure the `API_KEY` environment variable is set in your build environment or `.env` file.
    
2.  **Running Locally**:
    If you are running this with a bundler like Parcel or Vite, simply run the start command.
    ```bash
    npm start
    ```

3.  **Deployment**:
    Ensure your deployment provider (Netlify, Vercel, etc.) exposes the `API_KEY` environment variable to the build process.
    
    *   **Vite**: Prefix variable with `VITE_` (e.g., `VITE_API_KEY`) and update `services/geminiService.ts` to use `import.meta.env.VITE_API_KEY`.
    *   **Parcel/Webpack**: Ensure `process.env.API_KEY` is replaced during build.

## Troubleshooting

*   **Blank Screen**: Open the browser developer console (F12). 
    *   If you see "process is not defined", your build tool is not replacing `process.env.API_KEY`.
    *   If you see "Could not find root element", ensure `index.html` has `<div id="root">`.
