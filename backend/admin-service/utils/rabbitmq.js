import amqp from 'amqplib'
import User from '../model/model.js'


let channel;
async function connectRabbitMQ() {
    try{
        const connection = await amqp.connect("amqp://admin:admin123@rabbitmq:5672");
        channel = await connection.createChannel()
        await channel.assertExchange('user_topic_exchange', 'topic', {durable: false})
    } catch(err) {
        console.log(err)
        throw err
    }
}


//! --------- consuming messages --------- //

async function consumeMessages(queueName, bindingKey, handlerFunction) {
    try{
        if(!channel) await connectRabbitMQ()

        await channel.assertQueue(queueName, {durable: false})
        await channel.bindQueue(queueName, 'user_topic_exchange', bindingKey)
        channel.consume(queueName, async (msg) => {
            if(msg) {
                const message = JSON.parse(msg.content.toString());
                try{
                    await handlerFunction(message)
                } catch(err) {
                    console.log(err)
                }
                channel.ack(msg)
            }
        })
    } catch(err) {
        console.log(err)
    }
}


async function handleInsert(message) {
    const user = new User(message)
    await user.save()
}

async function handleUpdate(message) {
    await User.findByIdAndUpdate(message.userId, message.body);
}


async function consumeForInsertion() {
    await consumeMessages('user_insert_queue', 'user.insert', handleInsert)
}

async function consumeForUpdation() {
    await consumeMessages('user_update_queue', 'user.update', handleUpdate)
}



async function consumeFromUser() {
    try{
        await consumeForInsertion();
        await consumeForUpdation();
    } catch (err) {
        console.log(err)
    }
}



//! -------- publishing messages -------- //

async function sendMessageToExchange(routingKey, message) {
    try{
        if(!channel) await connectRabbitMQ()

        channel.publish(
            'user_topic_exchange',
            routingKey,
            Buffer.from(JSON.stringify(message))
        )
    } catch(err) {
        console.log(err)
    }
}

async function sendInsertToUser(message) {
    await sendMessageToExchange('admin.insert', message)
}

async function sendUpdateToUser(message) {
    await sendMessageToExchange('admin.update', message)
}

async function sendDeleteToUser(message) {
    await sendMessageToExchange('admin.delete', message)
}


export {
    consumeFromUser,
    sendInsertToUser,
    sendUpdateToUser,
    sendDeleteToUser
}