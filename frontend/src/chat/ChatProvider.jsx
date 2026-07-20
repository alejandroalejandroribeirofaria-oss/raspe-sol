import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useWallet } from '../wallet/WalletProvider';
import { chatWsUrl, uploadChatImage } from './chatApi.js';


const ChatContext = createContext(null);


export const useChat = () => {
  const ctx = useContext(ChatContext);

  if (!ctx) {
    throw new Error(
      'useChat must be used within ChatProvider'
    );
  }

  return ctx;
};


const TYPING_TIMEOUT_MS = 4000;
const RECONNECT_DELAY_MS = 3000;



export function ChatProvider({ children }) {

  const {
    address,
    connected
  } = useWallet();


  const [panelOpen,setPanelOpen] = useState(false);
  const [unreadCount,setUnreadCount] = useState(0);
  const [messages,setMessages] = useState([]);
  const [onlineCount,setOnlineCount] = useState(0);
  const [typingWallets,setTypingWallets] = useState([]);
  const [connectionStatus,setConnectionStatus] = useState('closed');
  const [lastError,setLastError] = useState(null);



  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const cancelledRef = useRef(false);
  const panelOpenRef = useRef(false);
  const typingTimersRef = useRef(new Map());



  useEffect(()=>{
    panelOpenRef.current = panelOpen;
  },[panelOpen]);



  const clearError = useCallback(()=>{
    setLastError(null);
  },[]);



  const togglePanel = useCallback(()=>{

    setPanelOpen(open=>{

      const next = !open;

      if(next){
        setUnreadCount(0);
      }

      return next;

    });

  },[]);



  const closePanel = useCallback(()=>{
    setPanelOpen(false);
  },[]);



  const clearTypingTimer = useCallback((wallet)=>{

    const timer =
      typingTimersRef.current.get(wallet);


    if(timer){

      clearTimeout(timer);

      typingTimersRef.current.delete(wallet);

    }

  },[]);



  const markTyping = useCallback((wallet)=>{


    setTypingWallets(prev=>

      prev.includes(wallet)
      ? prev
      : [...prev,wallet]

    );


    clearTypingTimer(wallet);



    const timer=setTimeout(()=>{


      setTypingWallets(prev=>
        prev.filter(
          item=>item!==wallet
        )
      );


      typingTimersRef.current.delete(wallet);


    },TYPING_TIMEOUT_MS);



    typingTimersRef.current.set(
      wallet,
      timer
    );


  },[clearTypingTimer]);





  const disconnectSocket = useCallback(()=>{


    clearTimeout(
      reconnectRef.current
    );


    if(wsRef.current){

      wsRef.current.close();

      wsRef.current=null;

    }


},[]);







const connect = useCallback(()=>{


  if(!connected || !address){
    return;
  }


  disconnectSocket();



  cancelledRef.current=false;



  const url = chatWsUrl(address);



  console.log(
    '[CHAT CONNECT]',
    url
  );



  setConnectionStatus('connecting');



  const ws = new WebSocket(url);


  wsRef.current = ws;




  ws.onopen = ()=>{


    console.log(
      '[CHAT] WS OPEN'
    );


    if(!cancelledRef.current){

      setConnectionStatus('open');

    }

  };





  ws.onmessage=(event)=>{


    let data;


    try{

      data=JSON.parse(event.data);

    }catch{

      return;

    }



    switch(data.type){


      case 'chat:init':

        setMessages(
          data.messages.map(
            m=>({
              kind:'message',
              ...m
            })
          )
        );


        setOnlineCount(
          data.onlineCount
        );

      break;



      case 'chat:new':

        setMessages(prev=>[
          ...prev,
          {
            kind:'message',
            ...data.message
          }
        ]);



        if(
          !panelOpenRef.current &&
          data.message.wallet!==address
        ){

          setUnreadCount(
            c=>c+1
          );

        }

      break;



      case 'chat:join':
      case 'chat:leave':

        setOnlineCount(
          data.onlineCount
        );


        setMessages(prev=>[

          ...prev,

          {
            kind:'system',

            type:
            data.type==='chat:join'
            ? 'join'
            : 'leave',

            id:
            `${data.type}-${data.wallet}-${Date.now()}`,

            wallet:data.wallet

          }

        ]);

      break;




      case 'chat:presence':

        setOnlineCount(
          data.onlineCount
        );

      break;




      case 'chat:typing':

        if(data.wallet!==address){

          markTyping(
            data.wallet
          );

        }

      break;




      case 'chat:reaction':

        setMessages(prev=>

          prev.map(m=>

            m.id===data.messageId

            ? {
                ...m,
                reactions:data.reactions
              }

            : m

          )

        );

      break;




      case 'chat:hidden':

        setMessages(prev=>

          prev.filter(
            m=>m.id!==data.messageId
          )

        );

      break;



      case 'chat:expired':

        setMessages(prev=>

          prev.filter(
            m=>
            !data.messageIds.includes(m.id)
          )

        );

      break;




      case 'chat:error':

        setLastError({

          code:data.code,

          message:data.message

        });

      break;




      case 'chat:kicked':

        setLastError({

          code:'KICKED',

          message:data.reason

        });


        ws.close();

      break;


      default:

        break;

    }


  };





  ws.onclose=(event)=>{


    console.log(
      '[CHAT CLOSED]',
      event.code,
      event.reason
    );



    setConnectionStatus('closed');



    if(!cancelledRef.current){


      reconnectRef.current =
      setTimeout(()=>{

        connect();

      },RECONNECT_DELAY_MS);


    }


  };





  ws.onerror=(err)=>{


    console.error(
      '[CHAT ERROR]',
      err
    );


  };



},[
  address,
  connected,
  disconnectSocket,
  markTyping
]);








const send = useCallback((payload)=>{


  const ws=wsRef.current;



  console.log(
    '[CHAT SEND]',
    ws?.readyState
  );



  if(!ws || ws.readyState!==WebSocket.OPEN){


    setLastError({

      code:'NOT_CONNECTED',

      message:
      'Chat websocket is not open.'

    });


    return false;

  }



  ws.send(
    JSON.stringify(payload)
  );


  return true;


},[]);







useEffect(()=>{


  cancelledRef.current=false;


  if(connected && address){

    connect();

  }else{


    disconnectSocket();

    setMessages([]);

    setConnectionStatus('closed');


  }



  return ()=>{


    cancelledRef.current=true;


    disconnectSocket();


    typingTimersRef.current.forEach(
      timer=>clearTimeout(timer)
    );


    typingTimersRef.current.clear();


  };


},[
  connected,
  address,
  connect,
  disconnectSocket
]);






const sendMessage = useCallback(
(text,opts={})=>{

 send({

 type:'chat:send',

 message:text,

 imagePath:opts.imagePath,

 replyTo:opts.replyTo

 });


},
[send]
);




const sendTyping = useCallback(()=>{

 send({
  type:'chat:typing'
 });

},[send]);




const react = useCallback(
(messageId,emoji)=>{

 send({

 type:'chat:react',

 messageId,

 emoji

 });

},
[send]
);




const report = useCallback(
(messageId)=>{

 send({

 type:'chat:report',

 messageId

 });

},
[send]
);




const uploadImage = useCallback(
async(file)=>{

 if(!address){

  throw new Error(
   'Connect wallet first.'
  );

 }

 return uploadChatImage(
  file,
  address
 );

},
[address]
);






const value={

 panelOpen,

 unreadCount,

 togglePanel,

 closePanel,

 messages,

 onlineCount,

 typingWallets,

 connectionStatus,

 lastError,

 clearError,

 sendMessage,

 sendTyping,

 react,

 report,

 uploadImage,

 walletAddress:address,

 connected,

 send

};




return (

<ChatContext.Provider value={value}>

 {children}

</ChatContext.Provider>

);


}



export default ChatProvider;
