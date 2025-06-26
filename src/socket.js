import { io } from "socket.io-client";

// Remove extra space from URL!
const SOCKET_URL = "https://backend-connectify.up.railway.app/api"; // Change to your backend URL in production

const socket = io(SOCKET_URL, { transports: ["websocket"] });
export default socket;
