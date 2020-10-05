const SocketIO = require('socket.io');

module.exports = (server) => {
    const io = SocketIO(server, { path: '/socket.io' });

    // 양방향 연결이 되었을 때 (접속)
    io.on('connection', (socket) => {
        const req = socket.request;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('새로운 클라이언트 접속!', ip, socket.id);

        socket.on('disconnect', () => {
            console.log('클라이언트 접속 해제', ip, socket.id);
            clearInterval(socket.interval);
        });

        socket.on('error', (error) => {
            console.error(error);
        });
        socket.on('reply', (data) => {
            console.log(data);
        });
        socket.interval = setInterval(() => {
            // send 대신 emit
            // 키, 값
            socket.emit('news', 'Hello Socket.IO');
        }, 3000);
    });
};

// 양방향 연결이 되었을 때 (접속)
// wss.on('connection', (ws, req) => {
//     const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
//     console.log('클라이언트 접속 접속.', ip);

//     // 이벤트 명, 콜백 작성
//     ws.on('message', (message) => {
//         console.log(message);
//     });
//     ws.on('error', (error) => {
//         console.error(error);
//     });
//     ws.on('close', () => {
//         console.log('클라이언트 접속 해제.', ip);
//         clearInterval(ws.interval);
//     });

//     // 서버에서 클라이언트 전송
//     const interval = setInterval(() => {
//         // 양방향 연결이 수립 되었을 때만 실행 (에러 방지)
//         // ws.CONNECTION, ws.CLOSING, ws.CLOSED
//         if(ws.readyState === ws.OPEN){
//             ws.send('서버에서 클라이언트로 메세지 전송');
//         }
//     }, 3000);
//     ws.interval = interval;
// });