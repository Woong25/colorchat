const express = require('express');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Room = require('../schemas/room');
const Chat = require('../schemas/chat');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const io = req.app.get('io');
        const { rooms: allRooms } = io.of('/chat').adapter;
        const rooms = await Room.find({});
        //console.log(rooms);
        res.render('index', { 
            moment,
            rooms,
            allRooms,
            me: req.session.color,
            error: req.flash('roomError')
        });
    } catch (error) {
        console.error(error);
        next(error);        
    }
});

router.get('/room', (req, res) => {
    res.render('room', { title: 'GIF 채팅방 생성', me: req.session.color, moment});
});

router.post('/room', async (req, res, next) => {
    try {
        const room = new Room({
            title: req.body.title,
            max: req.body.max,
            owner: req.session.color,
            password: req.body.password,
        })
        const newRoom = await room.save();
        const rooms = await Room.find({});
        const io = req.app.get('io');
        io.of('/room').emit('newRoom', {newRoom, rooms: rooms ? rooms.length : 0});
        res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
    } catch (error) {
        console.error(error);
        next(error);   
    }
})

router.get('/room/:id', async(req, res, next) => {
    try {
        const room = await Room.findOne({ _id: req.params.id });
        const io = req.app.get('io');
        if(!room){
            req.flash('roomError', '존재하지 않는 방입니다.');
            return res.redirect('/')
        }
        if(room.password && room.password !== req.query.password){
            req.flash('roomError', '비밀번호가 틀렸습니다.');
            return res.redirect('/')
        }
        const { rooms } = io.of('/chat').adapter;
        if(rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length){
            req.flash('roomError', '허용 인원 초과');
            return res.redirect('/')
        }

        //let roomUser = io.of('/chat').adapter
        //console.log('유저')
        //console.log(io.of('/chat').sockets])
        
        const chats = await Chat.find({ room: room._id }).sort('createdAt');
        let users = await Chat.find({ room: room._id, user: 'system' }).sort('createdAt');
        users = users.filter(item => item.chat.indexOf('입장') > -1)

        setTimeout(() => {
            io.of('/room').emit('changeRoom', {roomId: room._id, userCount: rooms[req.params.id] ? rooms[req.params.id].length : 1, max: room.max});
        }, 500);
        return res.render('chat', {
            moment,
            room,
            title: room.title,
            chats,
            user: req.session.color,
            me: req.session.color,
            users
        });
    } catch (error) {
        console.error(error);
        next(error);   
    }
})

router.post('/room/:id/sys', async(req, res, next) => {
    try {
        const io = req.app.get('io');
        const chat = req.body.type === 'join' 
            ? `${req.session.color}님이 입장하셨습니다.`
            : `${req.session.color}님이 퇴장하셨습니다.`
        const sys = new Chat({
            room: req.params.id,
            user: 'system',
            chat
        });
        await sys.save();

        let member = req.body.users.filter(item => item.roomId === req.params.id);

        console.log(member);
        io.of('/chat').to(req.params.id).emit(req.body.type, {...sys, member})
        res.send('ok')
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.get('/room/:id/typing', async(req, res, next) => {
    const room = await Room.findOne({ _id: req.params.id });
    const io = req.app.get('io');
    if(!room){
        return res.redirect('/')
    }
    io.of('/chat').to(req.params.id).emit('typing', {user: req.session.color, type: 'in'})
    res.send(req.session.color + ' typing')
});

router.get('/room/:id/typing/remove', async(req, res, next) => {
    const room = await Room.findOne({ _id: req.params.id });
    const io = req.app.get('io');
    if(!room){
        return res.redirect('/')
    }
    io.of('/chat').to(req.params.id).emit('typing', {user: req.session.color, type: 'out'})
    res.send(req.session.color + ' typing')
});

router.delete('/room/:id', async(req, res, next) => {
    try {
        await Room.remove({ _id: req.params.id })
        await Chat.remove({ room: req.params.id })
        const rooms = await Room.find({});
        await fs.rmdirSync(`uploads/${req.params.id}`, { recursive: true });
        res.send('ok');

        setTimeout(() => {
            req.app.get('io').of('/room').emit('removeRoom', {id: req.params.id, rooms: rooms ? rooms.length : 0});
        }, 2000);

    } catch (error) {
        console.error(error);
        next(error);   
    }
});

router.post('/room/:id/chat', async (req, res, next) => {
    try {
        const chat = new Chat({
            room: req.params.id,
            user: req.session.color,
            chat: req.body.chat,
            gif: req.body.file
        });
        await chat.save();
        res.send('ok');
        req.app.get('io').of('/chat').to(req.params.id).emit('chat', {
            ...chat,
            socket: req.body.sid
        });
    } catch (error) {
        console.error(error);
        next(error);   
    }
})

fs.readdir('uploads', (error) => {
    if(error){
        console.error('uploads 폴더가 없어 생성합니다.');
        fs.mkdirSync('uploads');
    }
})
const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb){
            const roomId = req.params.id
            fs.readdir('uploads/'+roomId, (error) => {
                if(error){
                    //console.error('uploads 폴더가 없어 생성합니다.');
                    fs.mkdirSync('uploads/'+roomId);
                }
                cb(null, 'uploads/'+roomId+'/');
            })
        },
        filename(req, file, cb){
            const ext = path.extname(file.originalname)
            cb(null, path.basename(file.originalname, ext) + new Date().valueOf() + ext)
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
})

router.post('/room/:id/file', upload.single('file'), async (req, res, next) => {
    try {
        const chat = new Chat({
            room: req.params.id,
            user: req.session.color,
            gif: req.file.filename,
        });
        //await chat.save();
        res.send(req.file.filename);
        //req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    } catch (error) {
        console.error(error);
        next(error);        
    }
});

module.exports = router;