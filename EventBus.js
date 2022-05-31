const amqplib = require('amqplib');

const EventBus = (() => {
    let instance;

    const createInstance = async () => {
        const object = {};

        object.conn = await amqplib.connect(`amqp://${process.env.AMQP_SERVER || "localhost"}`);

        object.channel = await object.conn.createChannel()

        object.createExchange = async(exchangeName, type = 'fanout') =>{
            return await object.channel.assertExchange(exchangeName, type, {
                durable: false
            })
        }

        object.createQueue = async(exchangeName, queueName = '', callback = undefined) => {
            const q = await object.channel.assertQueue(queueName, {
                exclusive: true
            })

            object.channel.bindQueue(q.queue, exchangeName, '')

            if (callback != undefined) {
                object.channel.consume(q.queue, callback, {
                    noAck: true
                })
            }

            return q
        }

        return object;
    }

    return {
        getInstance: async () => {
            if (!instance) {
                instance = await createInstance();
            }
            return instance;
        },
        sendEvent: async(exchangeName, data, routingKey = '') => {
            try{
                let conn

                if (instance) {
                    conn = instance.conn
                } else {
                    conn = await amqplib.connect(`amqp://${process.env.AMQP_SERVER || "localhost"}`);
                }
    
                const ch = await conn.createChannel();
    
                const exchange = await ch.assertExchange(exchangeName, 'fanout', {
                    durable: false
                });
    
                await ch.publish(exchangeName, routingKey, data);
    
                await ch.close()
    
                if(!instance)
                    await conn.close()
            } catch(e){
                console.log(e)
            }
        },
        createEvent: (type, data) =>{
            return Buffer.from(JSON.stringify({type, data}))
        }
    };
})();

module.exports = EventBus