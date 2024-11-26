import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const packageDefinition = protoLoader.loadSync('proto/notification.proto')
const proto = grpc.loadPackageDefinition(packageDefinition)


const client = new proto.NotificationService(
    'notification-service:50051',
    grpc.credentials.createInsecure()
)

export function notifyUser(email) {
    client.NotifyUser({email}, (err, response) => {
        if(err) {
            console.log(err)
        } else if(response.success) {
            console.log("Email sent successfully")
        } else {
            console.log("Failed to sent email")
        }
    })
}