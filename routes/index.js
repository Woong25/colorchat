const express = require('express');
const moment = require('moment');

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
        
        const chats = await Chat.find({ room: room._id }).sort('createdAt');
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
        });
    } catch (error) {
        console.error(error);
        next(error);   
    }
})

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
        });
        await chat.save();
        req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
        res.send('ok');
    } catch (error) {
        console.error(error);
        next(error);   
    }
})

module.exports = router;