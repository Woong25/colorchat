const WebSocket = require('ws');

module.exports = (server) => {
    const wss = new WebSocket.Server({ server });

    // 양방향 연결이 되었을 때 (접속)
    wss.on('connection', (ws, req) => {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('클라이언트 접속 접속.', ip);

        // 이벤트 명, 콜백 작성
        ws.on('message', (message) => {
            console.log(message);
        });
        ws.on('error', (error) => {
            console.error(error);
        });
        ws.on('close', () => {
            console.log('클라이언트 접속 해제.', ip);
            clearInterval(ws.interval);
        });

        // 서버에서 클라이언트 전송
        const interval = setInterval(() => {
            // 양방향 연결이 수립 되었을 때만 실행 (에러 방지)
            // ws.CONNECTION, ws.CLOSING, ws.CLOSED
            if(ws.readyState === ws.OPEN){
                ws.send('서버에서 클라이언트로 메세지 전송');
            }
        }, 3000);
        ws.interval = interval;
    });
};