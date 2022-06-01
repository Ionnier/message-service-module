require('dotenv').config()
const express = require('express')
const Message = require('./database/Message')
const jwt = require("jsonwebtoken")
const app = express()
const EventBus = require('./EventBus')

app.get('/messages', async (req, res)=>{
    const messageClass = await Message()
    const data = await messageClass.findAll()
    res.status(200).json({data})
})

app.post('/message', express.json(), async (req, res, next)=> {
    if(!req.body.content){
        return next(new Error('No message content'))
    }
    try{

        let token;
        let user
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            user = jwt.verify(token, process.env.JWT_SECRET) 
        }

        let idUser
        let username
        if (user){
            user = user.user
            idUser = user.id || undefined
            username = user.userName|| undefined
        }
        
        const messageClass = await Message()
        
        const data = await messageClass.create({content: req.body.content, idUser, username})
        
        try{
            if (user && user.isImportant){
                await EventBus.sendEvent(process.env.EXCHANGE_NAME || 'asdf', EventBus.createEvent("IMPORTANT_MESSAGE", JSON.stringify(data.content)))
            }
        } catch (e) {
            console.log(e)
        }

        return res.status(200).json({data})
        
    } catch (e) {
        console.log(e)
        return next(e)
    }
    
})

app.use('*', async (err, req, res, next)=>{
    res.status(418).json({err})
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on ${port}.`))
