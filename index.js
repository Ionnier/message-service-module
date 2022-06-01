require('dotenv').config()
const express = require('express')
const Message = require('./database/Message')
const jwt = require("jsonwebtoken")
const app = express()
const EventBus = require('./EventBus')
const cors = require('cors')

app.use(cors())

app.get('/message', async (req, res)=>{
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
            try{
                token = req.headers.authorization.split(' ')[1];
                user = jwt.verify(token, process.env.JWT_SECRET) 
            } catch (e){
                // pass
            }
        }

        let idUser
        let username
        if (user){
            user = user.user
            idUser = user.id || undefined
            username = user.userName|| undefined
        }
        
        const messageClass = await Message()

        let elements = await messageClass.findAll({
            where: {
                content: req.body.content
            }
        })

        let hasVoiceOver

        try{
            hasVoiceOver = elements.filter((elem) => elem.hasVoiceOver).length>0
        }
        catch {
            // pass
        }
    
        console.log(hasVoiceOver)
        const data = await messageClass.create({content: req.body.content, idUser, username, hasVoiceOver})
        
        try{
            console.log(user)
            if (user && user.isImportant == true){
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

async function eventProcess(message) {
    try{
        const content = message.content.toString()
        const obj = JSON.parse(content)
        if (!obj || !obj.type){
            return
        }
        if (obj.type == "CREATED"){
            const messageClass = await Message()
            console.log(obj)

            const data = await messageClass.update(
                {
                    hasVoiceOver: true
                },
                {
                where: {
                    content: obj.data.slice(1, -1)
                }
            })

        }

    } catch(e){
        console.log(e)
    }
}
async function main(){
    const instance = await EventBus.getInstance()
    await instance.createExchange(process.env.EXCHANGE_NAME || 'asdf');
    await instance.createQueue(process.env.EXCHANGE_NAME || 'asdf', '', eventProcess);
  }
  main()
