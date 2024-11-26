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


//! ----------- publishing messages ----------- //

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


async function sendInsertToAdmin(message) {
    await sendMessageToExchange('user.insert', message)
}

async function sendUpdateToAdmin(message) {
    await sendMessageToExchange('user.update', message)
}



//! ----------- consuming messages ---------- //


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

async function handleDelete(message) {
    await User.findByIdAndDelete(message.userId);
}


async function consumeForInsertion() {
    await consumeMessages('admin_insert_queue', 'admin.insert', handleInsert)
}

async function consumeForUpdation() {
    await consumeMessages('admin_update_queue', 'admin.update', handleUpdate)
}

async function consumeForDeletion() {
    await consumeMessages('admin_delete_queue', 'admin.delete', handleDelete)
}


async function consumeFromAdmin() {
    try{
        await consumeForInsertion();
        await consumeForUpdation();
        await consumeForDeletion();
    } catch (err) {
        console.log(err)
    }
}

export {
    sendInsertToAdmin,
    sendUpdateToAdmin,
    consumeFromAdmin
}