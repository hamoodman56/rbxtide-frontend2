import { createContext, useContext, createResource } from "solid-js";
import io from "socket.io-client";
import { getJWT, createNotification } from "../util/api";
import { useUser } from "./usercontextprovider"

const WebsocketContext = createContext();

const playCreditSound = () => {
  const backgroundMusic = document.getElementById("backgroundMusic");
  backgroundMusic.play().catch((error) => {
    const clickHandler = () => {
      backgroundMusic.play();
      document.removeEventListener("click", clickHandler);
    };

    document.addEventListener("click", clickHandler, { once: true });
  });
};

export function WebsocketProvider(props) {
  const [ws, { mutate }] = createResource(connectSocket);
  const socket = [ws];

  const [user] = useUser();

  async function connectSocket() {
    let socketIo = io('', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socketIo.on('connect', () => {
      console.log('Connected to WS');
      socketIo.emit('auth', getJWT());
      mutate(socketIo);
    });

    socketIo.on('disconnect', (reason) => {
      if (reason !== 'io server disconnect') return;
      mutate(null);

      let retrying = setInterval(() => {
        socketIo.removeAllListeners();
        socketIo = io(import.meta.env.VITE_SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10
        });
        mutate(socketIo);
        clearInterval(retrying);
      }, 1000);
    });

    socketIo.on('notify', (type, message, options) => {
    
      const [id, ...messageParts] = message.split(' ');
      const actualMessage = messageParts.join(' ');

    
      if (user() && user().id && id == user().id) {
        playCreditSound()
        createNotification('success', actualMessage);
      }
    }); 
  }

  return (
    <WebsocketContext.Provider value={socket}>
      {props.children}
      <audio id="backgroundMusic">
        <source src="/assets/sounds/credit.add.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </WebsocketContext.Provider>
  );
}

export function useWebsocket() {
  return useContext(WebsocketContext);
}
