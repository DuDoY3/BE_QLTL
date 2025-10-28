import app from "./app";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Get the port from environment variables, with a fallback to 8001
const port = parseInt(process.env.PORT || '8001', 10);

// Start the server and listen on the specified port
app.listen(port, '0.0.0.0', () => {
    console.log(
        `[server]: Server is running at http://0.0.0.0:${port} on a today?.`,
    );
});
