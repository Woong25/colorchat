const axios = require('axios');
const SocketIO = require('socket.io');
const cookie = require('cookie-signature');
const cookieParser = require('cookie-parser');

let users = []
global.users = users;

module.exports = (server, app, sessionMiddleware) => {
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io); // express 변수 저장 [라우터(외부) 에서 io를 사용 하기 위함]

    // 네임스페이스
    // io.of('/')
    const room = io.of('/room');
    const chat = io.of('/chat');

    // 익스프레스 미들웨어를 소켓IO에서 쓰는 방법
    io.use((socket, next) => { 
        cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res, next);
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    io.on('connection', (socket) => {
        const req = socket.request;

        socket.on('disconnect', () => {
            console.log('소켓 아웃')
        })
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

        let roomUser = socket.to(roomId).adapter.users || []
        let newUser = [...roomUser, req.session.color]
        newUser = [...new Set(newUser)].filter(item => item)
        socket.to(roomId).adapter.users = newUser;
        console.log(newUser)

        // socket.to(roomId).emit('join', {
        //     user: 'system',
        //     chat: `${req.session.color}님이 입장하셨습니다.`,
        //     users: newUser,
        // });
        const signedCookie = cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET);
        const connectSID = `${signedCookie}`;

        if(req.session?.color){
            const color = req.session.color
            let member = [...new Set(users), {color, roomId}];

            users = [...new Map(member.map(item => [item['color'], item])).values()];
            console.log(users);
        }

        axios.post(`http://localhost:8080/room/${roomId}/sys`, {
            type: 'join',
            users
        }, {
            headers: {
                Cookie: `connect.sid=s%3A${connectSID}`
            }
        })

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
                // socket.to(roomId).emit('exit', {
                //     user: 'system',
                //     chat: `${req.session.color}님이 퇴장하셨습니다.`
                // })
                let member = users.filter(item => item.color != req.session.color)
                users = member
                axios.post(`http://localhost:8080/room/${roomId}/sys`, {
                    type: 'exit',
                    users
                }, {
                    headers: {
                        Cookie: `connect.sid=s%3A${connectSID}`
                    }
                })
            }
        })

        socket.on('dm', (data) => {
            socket.to(data.target).emit('dm', data);
        })
    })
};