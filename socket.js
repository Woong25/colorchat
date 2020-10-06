const axios = require('axios');
const SocketIO = require('socket.io');

module.exports = (server, app, sessionMiddleware) => {
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io); // express 변수 저장 [라우터(외부) 에서 io를 사용 하기 위함]

    // 네임스페이스
    // io.of('/')
    const room = io.of('/room');
    const chat = io.of('/chat');

    // 익스프레스 미들웨어를 소켓IO에서 쓰는 방법
    io.use((socket, next) => { 
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    room.on('connection', (socket) => {
        console.log('room 네임스페이스에 접속');
        socket.on('disconnect', () => {
            console.log('room 네임 스페이스 접속 해제')
        })
    })

    chat.on('connection', (socket) => {
        console.log('chat 네임스페이스 접속');
        const req = socket.request;
        const { headers: { referer } } = req;
        const roomId = referer.split('/')[referer.split('/').length -1].replace(/\?.+/, '');

        socket.join(roomId); // 방에 접속

        socket.to(roomId).emit('join', {
            user: 'system',
            chat: `${req.session.color}님이 입장하셨습니다.`,
        });

        socket.on('disconnect', () => {
            console.log('chat 네임스페이스 접속 해제');

            socket.leave(roomId); // 방 나가기
            const currentRoom = socket.adapter.rooms[roomId];
            const userCount = currentRoom ? currentRoom.length : 0

            if(userCount === 0){
                // 라우터를 통해 DB 조작하기
                axios.delete(`http://localhost:8080/room/${roomId}`)
                    .then(() => {
                        console.log('방 제거 요청 성공')
                    }).catch((err) => {
                        console.error(err);
                    });
            }else{
                setTimeout(() => {
                    room.emit('changeRoom', {roomId, userCount});
                }, 300);
                socket.to(roomId).emit('exit', {
                    user: 'system',
                    chat: `${req.session.color}님이 퇴장하셨습니다.`
                })
            }
        })
    })
};