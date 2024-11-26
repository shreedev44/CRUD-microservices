import express from 'express'
import router from './router/router.js'
import mongoose from 'mongoose'
import { configDotenv } from 'dotenv'
import { consumeFromUser } from './utils/rabbitmq.js'
configDotenv()

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))


mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('admin db connected'))
.catch((err) => console.log(err))


consumeFromUser()

app.use('/', router)

app.listen(process.env.PORT || 4041, () => console.log('user server running on 4041'))