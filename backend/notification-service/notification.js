import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

dotenv.config()


const packageDefinition = protoLoader.loadSync('proto/notification.proto');
const proto = grpc.loadPackageDefinition(packageDefinition)


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASS
    }
})


function sendEmail(call, callback) {
    const {email} = call.request;

    const mailOptions = {
        from: process.env.USER_EMAIL,
        to: email,
        subject: "Account Deletion Notification",
        text: "Your account has been deleted by the admin"
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if(err) {
            console.log("error", err)
            callback(null, {success: false, error: err.message})
        } else {
            console.log('success', info)
            callback(null, {success: true})
        }
    })
}


function startServer() {
    const server = new grpc.Server()

    server.addService(proto.NotificationService.service, {NotifyUser: sendEmail})

    server.bindAsync(
        '0.0.0.0:50051',
        grpc.ServerCredentials.createInsecure(),
        () => {
            console.log("Notification service running on 50051")
            server.start()
        }
    )
}

startServer()