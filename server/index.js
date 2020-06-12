const express = require('express')
const socketio = require('socket.io')
const http = require('http')

const {addUser, removeUser, getUser, getUsersInRoom } = require('./users')

//process.env will be added later
const PORT = process.env.PORT || 5000

const router = require('./router')

//creates an instance of socket.io, different from setting up a common express server
const app = express()
const server = http.createServer(app)
const io = socketio(server)


//functionality for an individual socket after connection goes INSIDE the on connection function for that socket
io.on('connection', (socket) => {
    //2nd parameter allows for immediate response to client upon event
    socket.on('join', ({name, room}, callback) => {
        //1:01:45
        const {error, user} = addUser({id: socket.id, name, room})
        
        if (error) return callback(error)

        //this emit message will be sent by the 'admin' user to the user that joined the room saying welcome. this is a message from the SERVER to the front end
        socket.emit('message', {user: 'admin', text: `${user.name}, welcome to the room ${user.room}`})
        //broadcast sends a message to everyone BUT the user that sent it. here it lets everyone in the room but the user know that the user has joined the room
        socket.broadcast.to(user.room).emit('message', {user: 'admin', text: `${user.name} has joined`})

        //built in function to join a room!
        socket.join(user.room)

        io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)})

        //the callback from the on join event.  not sure why we should call it every time, but the logic in it (if you look in the users.js file) shows that nothing will happen anyway; nothing triggers the function to do anything
        callback()
    })

    //here we're waiting on an event from the front end, unlike the admin message above
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('message', {user: user.name, text: message})
        io.to(user.room).emit('roomData', { room: user.room, text: message})

        //I guess always do the callback from the front end?  He says we'll always want to do it so that something will happen on the front end.  Who knows
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)})
            io.to(user.room).emit('message', {user: 'admin', text: `${user.name} has left`})
        }
    })
})

app.use(router)

server.listen(PORT, () => console.log(`server listening on port ${PORT}`))