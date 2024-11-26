import express from 'express'
import router from './router/router.js'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import { configDotenv } from 'dotenv'
import { consumeFromAdmin } from './utils/rabbitmq.js'
configDotenv()

const app = express()

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('user db connected'))
.catch((err) => console.log(err))


app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())


consumeFromAdmin()

app.use('/', router)

app.listen(process.env.PORT || 4042, () => console.log('user server running on 4042'))