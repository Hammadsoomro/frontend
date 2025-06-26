import { io } from "socket.io-client";

// Remove extra space from URL!
const SOCKET_URL = "http://localhost:8080"; // Change to your backend URL in production

const socket = io(SOCKET_URL, { transports: ["websocket"] });
export default socket;